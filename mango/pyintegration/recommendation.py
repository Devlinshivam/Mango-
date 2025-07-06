from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
import pandas as pd
import numpy as np
import joblib
import random

# ---------- CONFIGURATION ----------
MONGO_URI = "mongodb+srv://Shivam:3wrkC1O2FmdxCpgN@mango.dk09q.mongodb.net/?retryWrites=true&w=majority&appName=mango"
DB_NAME   = "test"
C = 5  # Bayesian smoothing hyperparameter

# ---------- SET UP CONNECTION ----------
client       = MongoClient(MONGO_URI)
db           = client[DB_NAME]
lancers_col  = db["lancers"]
projects_col = db["accepteds"]
rated_col    = db["rated"]

# Load all freelancers
all_lancers = list(lancers_col.find())

# Global mean rating
ratings = [l.get("rating", 0) for l in all_lancers if l.get("people", 0) > 0]
m = np.mean(ratings) if ratings else 0

# ---------- EMBEDDING MODEL ----------
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# ---------- FEATURE EXTRACTION ----------
def bayesian_rating(r_avg, r_count, m, C=C):
    br = (r_count * r_avg + C * m) / (r_count + C)
    return br / 5.0

def extract_features(project, lancer):
    r_avg   = lancer.get("rating", 0)
    r_count = lancer.get("people", 0)
    bayes_r = bayesian_rating(r_avg, r_count, m)

    proj_skills   = set(project.get("skills", []))
    lancer_skills = set(lancer.get("skills", []))
    skill_match = len(proj_skills & lancer_skills) / max(1, len(proj_skills))

    job_text   = project.get("description", "")
    exp_text   = lancer.get("bio", "") + " " + " ".join(lancer.get("skills", []) or [])
    job_emb    = embedder.encode(job_text)
    lancer_emb = embedder.encode(exp_text)
    cos_sim    = cosine_similarity([job_emb], [lancer_emb])[0][0]

    cost = project.get("cost", 0)
    is_new = 1 if r_count == 0 else 0

    return [bayes_r, skill_match, cos_sim, cost, is_new]

# ---------- COLLECT TRAINING DATA ----------
data = []

for proj in projects_col.find():
    print(f"📦 Processing project {proj.get('_id')}")
    hired_username = proj.get("lancer_id")

    if not hired_username:
        print("⚠️ Skipping project with missing lancer_id (username).")
        continue

    hired = lancers_col.find_one({"username": hired_username})
    if not hired:
        print(f"⚠️ No freelancer found with username: {hired_username}")
        continue

    feats = extract_features(proj, hired)
    data.append({"features": feats, "label": 1})  # Positive example

    # Sample negative examples
    negatives = [l for l in all_lancers if l.get("username") != hired_username]
    for neg in random.sample(negatives, k=min(2, len(negatives))):
        feats = extract_features(proj, neg)
        data.append({"features": feats, "label": 0})

# ---------- TRAIN MODEL ----------
if not data:
    print("❌ No training data collected. Check your project and lancer documents.")
    exit()

df = pd.DataFrame(data)
X = np.vstack(df["features"].values)
y = df["label"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBClassifier(use_label_encoder=False, eval_metric="logloss")
model.fit(X_train, y_train)

joblib.dump(model, "recommendation_model.pkl")
print("✅ Trained XGBoost model saved as recommendation_model.pkl")
