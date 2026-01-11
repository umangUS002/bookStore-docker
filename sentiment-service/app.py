from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path
import requests
import os
import time

# ================== LOAD ENV (BULLETPROOF) ==================
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

MONGO_URI = os.getenv("MONGO_URI")
HF_TOKEN = os.getenv("HF_TOKEN")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set")
if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN not set")

print("✅ HF_TOKEN loaded:", bool(HF_TOKEN))

# ================== APP ==================
app = FastAPI(title="Sentiment Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== DATABASE ==================
client = MongoClient(MONGO_URI)
db = client["test"]
comments_col = db["comments"]

print("✅ Connected to MongoDB")

# ================== HUGGING FACE CONFIG ==================
HF_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "distilbert-base-uncased-finetuned-sst-2-english"
)

HEADERS = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json",
}

# ================== HF CALL (RETRY + COLD START) ==================
def hf_sentiment(text: str):
    for attempt in range(2):  # retry once
        try:
            resp = requests.post(
                HF_URL,
                headers=HEADERS,
                json={
                    "inputs": text,
                    "options": {"wait_for_model": True}
                },
                timeout=60,  # allow cold start
            )

            print(f"HF attempt {attempt+1}:",
                  resp.status_code, resp.text)

            if resp.status_code != 200:
                time.sleep(3)
                continue

            data = resp.json()

            # Expected: [[{label, score}, ...]]
            if (
                isinstance(data, list)
                and isinstance(data[0], list)
                and len(data[0]) > 0
            ):
                return data[0][0]

        except Exception as e:
            print("HF exception:", e)

    return None


# ================== FALLBACK (NEVER FAILS) ==================
def fallback_sentiment(text: str):
    positive = {"good", "great", "excellent", "amazing", "love", "nice"}
    negative = {"bad", "worst", "boring", "hate", "poor", "terrible"}

    words = set(text.lower().split())
    score = len(words & positive) - len(words & negative)

    if score > 0:
        return 0.6, "positive"
    elif score < 0:
        return -0.6, "negative"
    return 0.0, "neutral"


def normalize_sentiment(label: str, score: float):
    signed = score if label == "POSITIVE" else -score
    return round(signed, 3), ("positive" if signed > 0 else "negative")


# ================== SCHEMAS ==================
class CommentRequest(BaseModel):
    text: str


# ================== ROUTES ==================
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


@app.post("/analyze/comment")
def analyze_comment(payload: CommentRequest):
    text = payload.text.strip()
    if len(text) < 3:
        return {"error": "Text too short"}

    result = hf_sentiment(text)

    if result:
        score, label = normalize_sentiment(
            result["label"], result["score"]
        )
        source = "huggingface"
    else:
        score, label = fallback_sentiment(text)
        source = "fallback"

    return {
        "sentiment": {
            "score": score,
            "label": label,
            "source": source
        }
    }


@app.post("/analyze/comment/{comment_id}")
def analyze_and_store(comment_id: str):
    try:
        cid = ObjectId(comment_id)
    except Exception:
        return {"error": "Invalid comment ID"}

    comment = comments_col.find_one({"_id": cid})
    if not comment:
        return {"error": "Comment not found"}

    text = comment.get("content", "").strip()
    if len(text) < 3:
        return {"error": "No valid content"}

    result = hf_sentiment(text)

    if result:
        score, label = normalize_sentiment(
            result["label"], result["score"]
        )
        source = "huggingface"
    else:
        score, label = fallback_sentiment(text)
        source = "fallback"

    comments_col.update_one(
        {"_id": cid},
        {"$set": {"sentiment": {"score": score, "label": label}}}
    )

    return {
        "message": "Sentiment stored successfully",
        "sentiment": {
            "score": score,
            "label": label,
            "source": source
        }
    }


# ================== LOCAL RUN ==================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8002)),
    )
