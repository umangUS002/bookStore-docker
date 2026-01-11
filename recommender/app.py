import os
from fastapi import FastAPI, HTTPException
from typing import List, Optional
import pandas as pd
import numpy as np
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import joblib
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# =======================
# CONFIG
# =======================

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set")

DB_NAME = "test"
BOOKS_COLLECTION = "books"
INTERACTIONS_COLLECTION = "interactions"

VEC_FILE = "tfidf_vectorizer.joblib"
MAT_FILE = "tfidf_matrix.joblib"
META_FILE = "books_meta.joblib"

# =======================
# DB CONNECTION
# =======================

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
books_col = db[BOOKS_COLLECTION]
interactions_col = db[INTERACTIONS_COLLECTION]

# =======================
# FASTAPI APP
# =======================

app = FastAPI(title="Book Recommendation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================
# HELPERS
# =======================

def build_text(df: pd.DataFrame) -> pd.Series:
    """
    Build clean text for TF-IDF.
    Do NOT include image URLs.
    """
    return (
        df["title"].fillna("") + " " +
        df["description"].fillna("") + " " +
        df["author"].fillna("") + " " +
        df["genre"].fillna("") + " " +
        df["language"].fillna("") + " " +
        df["rating"].fillna("").astype(str)
    )

def load_books_from_mongo() -> pd.DataFrame:
    docs = list(books_col.find({"isPublished": True}))
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]

    return pd.DataFrame(docs).fillna("").reset_index(drop=True)

def train_tfidf_from_mongo():
    df = load_books_from_mongo()
    df["text"] = build_text(df)

    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words="english"
    )
    mat = vectorizer.fit_transform(df["text"])

    joblib.dump(vectorizer, VEC_FILE)
    joblib.dump(mat, MAT_FILE)
    joblib.dump(df, META_FILE)

    print(f"✅ TF-IDF trained on {len(df)} books")

# =======================
# LOAD OR TRAIN
# =======================

if not (os.path.exists(VEC_FILE) and os.path.exists(MAT_FILE) and os.path.exists(META_FILE)):
    train_tfidf_from_mongo()

vectorizer = joblib.load(VEC_FILE)
mat = joblib.load(MAT_FILE)
books_df: pd.DataFrame = joblib.load(META_FILE)

id_to_idx = {str(row["id"]): i for i, row in books_df.iterrows()}

# =======================
# RESPONSE MODEL
# =======================

class BookResponse(BaseModel):
    id: str
    title: str
    author: str
    genre: str
    rating: Optional[float]   # 👈 FIXED
    description: str
    score: float
    image: str

# =======================
# ROUTES
# =======================

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {
        "status": "ok",
        "n_books": len(books_df)
    }

@app.post("/retrain")
def retrain():
    train_tfidf_from_mongo()

    global vectorizer, mat, books_df, id_to_idx
    vectorizer = joblib.load(VEC_FILE)
    mat = joblib.load(MAT_FILE)
    books_df = joblib.load(META_FILE)
    id_to_idx = {str(row["id"]): i for i, row in books_df.iterrows()}

    return {"status": "retrained", "n_books": len(books_df)}

# -----------------------
# SIMILAR BOOKS
# -----------------------

@app.get("/similar/{book_id}", response_model=List[BookResponse])
def similar_books(book_id: str, k: int = 4):
    if book_id not in id_to_idx:
        raise HTTPException(status_code=404, detail="Book not found")

    idx = id_to_idx[book_id]
    sims = linear_kernel(mat[idx], mat).flatten()
    top_idx = sims.argsort()[::-1]

    results = []

    for i in top_idx:
        if i == idx:
            continue

        row = books_df.iloc[i]

        results.append({
            "id": row["id"],
            "title": row["title"],
            "author": row["author"],
            "genre": row["genre"],
            "rating": float(row["rating"]) if row["rating"] not in ["", None] else None,
            "description": row["description"],
            "score": float(sims[i]),
            "image": row["image"]
        })

        if len(results) >= k:
            break

    return results

# -----------------------
# USER RECOMMENDATIONS
# -----------------------

@app.get("/recommendations/{user_id}", response_model=List[BookResponse])
def recommendations(user_id: str, k: int = 8):
    interactions = list(interactions_col.find({"userId": user_id}))

    if interactions:
        idxs = [
            id_to_idx[str(i["bookId"])]
            for i in interactions
            if str(i["bookId"]) in id_to_idx
        ]

        if idxs:
            user_vec = mat[idxs].mean(axis=0)
            sims = linear_kernel(user_vec, mat).flatten()
            top_idx = sims.argsort()[::-1][:k]

            return [{
                "_id": books_df.iloc[i]["id"],
                "title": books_df.iloc[i]["title"],
                "author": books_df.iloc[i]["author"],
                "genre": books_df.iloc[i]["genre"],
                "rating": float(books_df.iloc[i]["rating"])
                          if books_df.iloc[i]["rating"] not in ["", None] else None,
                "description": books_df.iloc[i]["description"],
                "score": float(sims[i]),
                "image": books_df.iloc[i]["image"]
            } for i in top_idx]

    # -----------------------
    # FALLBACK (POPULAR)
    # -----------------------

    magnitudes = np.array(mat.sum(axis=1)).flatten()
    top_idx = magnitudes.argsort()[::-1][:k]

    return [{
        "_id": books_df.iloc[i]["id"],
        "title": books_df.iloc[i]["title"],
        "author": books_df.iloc[i]["author"],
        "genre": books_df.iloc[i]["genre"],
        "rating": float(books_df.iloc[i]["rating"])
                  if books_df.iloc[i]["rating"] not in ["", None] else None,
        "description": books_df.iloc[i]["description"],
        "score": float(magnitudes[i]),
        "image": books_df.iloc[i]["image"]
    } for i in top_idx]
