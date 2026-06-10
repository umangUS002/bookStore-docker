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
import re
import spacy
from rapidfuzz import fuzz

# =======================
# CONFIG
# =======================

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set")

DB_NAME = os.getenv("DB_NAME", "test")
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

# Load SpaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    print("✅ SpaCy model loaded successfully")
except Exception as e:
    print(f"⚠️ Failed to load SpaCy model: {e}. Attempting to download...")
    import subprocess
    import sys
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

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
    if df.empty:
        print("⚠️ No books found to train TF-IDF")
        return

    # Build raw text list
    raw_texts = []
    for _, row in df.iterrows():
        raw_text = (
            str(row.get("title", "")) + " " +
            str(row.get("description", "")) + " " +
            str(row.get("author", "")) + " " +
            str(row.get("genre", "")) + " " +
            str(row.get("language", ""))
        )
        raw_texts.append(raw_text.lower())

    # Batch lemmatize using nlp.pipe (fast)
    lemmatized_texts = []
    for doc in nlp.pipe(raw_texts, batch_size=50, disable=["ner", "parser"]):
        lemmatized_texts.append(" ".join([token.lemma_ for token in doc if not token.is_stop and not token.is_punct]))

    df["text"] = lemmatized_texts

    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words="english"
    )
    mat = vectorizer.fit_transform(df["text"])

    joblib.dump(vectorizer, VEC_FILE)
    joblib.dump(mat, MAT_FILE)
    joblib.dump(df, META_FILE)

    print(f"✅ TF-IDF trained on {len(df)} books (with SpaCy lemmatization)")

# =======================
# LOAD OR TRAIN
# =======================

try:
    train_tfidf_from_mongo()
except Exception as e:
    print(f"⚠️ Error training TF-IDF on startup: {e}")

try:
    vectorizer = joblib.load(VEC_FILE)
    mat = joblib.load(MAT_FILE)
    books_df = joblib.load(META_FILE)
except Exception as e:
    print(f"⚠️ Failed to load TF-IDF matrices: {e}. Creating empty mock components.")
    # Fallback to empty mock data
    books_df = pd.DataFrame(columns=["id", "title", "author", "genre", "description", "isbn", "rating", "image"])
    vectorizer = TfidfVectorizer(stop_words="english")
    vectorizer.fit(["dummy text for empty corpus"])
    mat = vectorizer.transform(["dummy text for empty corpus"])

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
    recommendationSource: str
    recommendationStrategy: str

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
# ADVANCED NLP & FUZZY SEARCH
# -----------------------

class SearchRequest(BaseModel):
    query: str

class NLPSearchResult(BaseModel):
    id: str
    score: float
    fuzzy_score: float

@app.post("/search/nlp", response_model=List[NLPSearchResult])
def search_nlp(req: SearchRequest):
    query = req.query.strip()
    if not query:
        return []

    # If books_df is empty, return empty list
    if books_df.empty:
        return []

    # 1. Lemmatize the query using SpaCy (without ner/parser component for speed)
    doc = nlp(query.lower())
    lemmatized_query = " ".join([token.lemma_ for token in doc if not token.is_stop and not token.is_punct])
    if not lemmatized_query.strip():
        lemmatized_query = query.lower()

    # 2. Extract potential ISBNs from query (10 or 13 digits) using regex
    isbn_pattern = re.compile(r'\b(?:97[89])?\d{9}[\dX]\b')
    isbns_in_query = isbn_pattern.findall(query)

    # 3. Create regular expression of query terms for regex matching
    query_words = [re.escape(token.text) for token in doc if not token.is_stop and not token.is_punct]
    regex_pattern = None
    if query_words:
        regex_pattern = re.compile(r'\b(' + '|'.join(query_words) + r')\b', re.IGNORECASE)

    # 4. Compute TF-IDF similarity of the lemmatized query against all books
    try:
        query_vec = vectorizer.transform([lemmatized_query])
        sims = linear_kernel(query_vec, mat).flatten()
    except Exception as e:
        print(f"⚠️ Error computing TF-IDF similarity: {e}")
        sims = np.zeros(len(books_df))

    results = []
    for idx, row in books_df.iterrows():
        book_id = str(row.get("id"))
        title = str(row.get("title", ""))
        author = str(row.get("author", ""))
        isbn = str(row.get("isbn", ""))
        description = str(row.get("description", ""))

        # 5. Fuzzy match query against title and author using rapidfuzz
        f_title = max(fuzz.ratio(query.lower(), title.lower()), fuzz.token_sort_ratio(query.lower(), title.lower()))
        f_author = max(fuzz.ratio(query.lower(), author.lower()), fuzz.token_sort_ratio(query.lower(), author.lower()))
        fuzzy_score = float(max(f_title, f_author))

        # 6. Regex match boosts
        regex_boost = 0.0
        # If query contains ISBN and matches this book's ISBN
        if isbns_in_query and isbn in isbns_in_query:
            regex_boost += 60.0 # high boost for exact ISBN match
        
        # If pattern matches title or description
        if regex_pattern:
            if regex_pattern.search(title):
                regex_boost += 15.0
            if regex_pattern.search(description):
                regex_boost += 5.0

        tfidf_score = float(sims[idx])

        # Apply regex boost to fuzzy_score (capping fuzzy_score at 100 or keeping it higher)
        if isbns_in_query and isbn in isbns_in_query:
            fuzzy_score = 100.0
            tfidf_score = 1.0
        elif regex_boost > 0:
            fuzzy_score = min(100.0, fuzzy_score + regex_boost)

        if tfidf_score > 0.01 or fuzzy_score >= 60.0 or (isbns_in_query and isbn in isbns_in_query):
            results.append({
                "id": book_id,
                "score": tfidf_score,
                "fuzzy_score": fuzzy_score
            })

    return results

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
            "image": row["image"],
            "recommendationSource": "recommender",
            "recommendationStrategy": "similar_books_tfidf"
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
        idx_weights = {}
        for i in interactions:
            b_id = str(i["bookId"])
            if b_id in id_to_idx:
                idx = id_to_idx[b_id]
                itype = i.get("type", "view")
                
                # Determine weight based on type
                if itype == "view":
                    w = 1.0
                elif itype in ("add_to_wishlist", "positive_comment", "like"):
                    w = 5.0
                elif itype == "negative_comment":
                    w = -5.0
                else:
                    w = 1.0
                
                idx_weights[idx] = idx_weights.get(idx, 0.0) + w

        if idx_weights:
            # Construct the weighted user vector
            user_vec = np.zeros(mat.shape[1])
            total_abs_weight = 0.0
            for idx, w in idx_weights.items():
                user_vec += mat[idx].toarray().flatten() * w
                total_abs_weight += abs(w)

            if total_abs_weight > 0:
                user_vec /= total_abs_weight

            sims = linear_kernel(user_vec.reshape(1, -1), mat).flatten()

            # Set similarity score of already interacted books to -1
            interacted_idxs = list(idx_weights.keys())
            sims[interacted_idxs] = -1

            top_idx = sims.argsort()[::-1][:k]

            return [{
                "id": books_df.iloc[i]["id"],
                "title": books_df.iloc[i]["title"],
                "author": books_df.iloc[i]["author"],
                "genre": books_df.iloc[i]["genre"],
                "rating": float(books_df.iloc[i]["rating"])
                          if books_df.iloc[i]["rating"] not in ["", None] else None,
                "description": books_df.iloc[i]["description"],
                "score": float(sims[i]),
                "image": books_df.iloc[i]["image"],
                "recommendationSource": "recommender",
                "recommendationStrategy": "user_interactions_tfidf"
            } for i in top_idx]

    # -----------------------
    # FALLBACK (POPULAR)
    # -----------------------

    magnitudes = np.array(mat.sum(axis=1)).flatten()
    top_idx = magnitudes.argsort()[::-1][:k]

    return [{
        "id": books_df.iloc[i]["id"],
        "title": books_df.iloc[i]["title"],
        "author": books_df.iloc[i]["author"],
        "genre": books_df.iloc[i]["genre"],
        "rating": float(books_df.iloc[i]["rating"])
                  if books_df.iloc[i]["rating"] not in ["", None] else None,
        "description": books_df.iloc[i]["description"],
        "score": float(magnitudes[i]),
        "image": books_df.iloc[i]["image"],
        "recommendationSource": "fallback",
        "recommendationStrategy": "popular_tfidf_magnitude"
    } for i in top_idx]
