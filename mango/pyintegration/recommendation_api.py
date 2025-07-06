from flask import Flask, request, jsonify
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import joblib

app = Flask(__name__)

# Load models
model = joblib.load("recommendation_model.pkl")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# MongoDB setup
MONGO_URI = "mongodb+srv://Shivam:3wrkC1O2FmdxCpgN@mango.dk09q.mongodb.net/?retryWrites=true&w=majority&appName=mango"
client = MongoClient(MONGO_URI)
db = client["test"]
lancers_col = db["lancers"]

# Preload all freelancers and compute global mean rating
all_lancers = list(lancers_col.find())
ratings = [float(l.get("rating", 0)) for l in all_lancers if l.get("people", 0) > 0]
m = float(np.mean(ratings)) if ratings else 0.0
C = 5.0

def bayesian_rating(r_avg, r_count, m, C=C):
    return float((r_count * r_avg + C * m) / (r_count + C) / 5.0)

def extract_features(project, lancer):
    # Bayesian-smoothed rating
    r_avg = float(lancer.get("rating", 0))
    r_count = float(lancer.get("people", 0))
    bayes_r = bayesian_rating(r_avg, r_count, m)

    # Skill match percentage
    proj_skills = set(project.get("skills", []))
    lancer_skills = set(lancer.get("skills", []))
    skill_match = float(len(proj_skills & lancer_skills) / max(1, len(proj_skills)))

    # Semantic similarity
    job_text = project["description"]
    exp_text = lancer.get("bio", "") + " " + " ".join(lancer.get("skills", []) or [])
    job_emb = embedder.encode(job_text)
    lancer_emb = embedder.encode(exp_text)
    cos_sim = float(cosine_similarity([job_emb], [lancer_emb])[0][0])

    # Cost and cold-start flag
    cost = float(project.get("cost", 0))
    is_new = 1.0 if r_count == 0 else 0.0

    features = [bayes_r, skill_match, cos_sim, cost, is_new]
    return features, cos_sim

@app.route("/recommend", methods=["POST"])
def recommend():
    req = request.get_json()
    project = {
        "description": req.get("description", ""),
        "skills": req.get("skills", []),
        "cost": req.get("cost", 0)
    }

    scored = []
    for lancer in all_lancers:
        features, sem_sim = extract_features(project, lancer)
        # Ensure all features are floats
        features = [float(f) for f in features]

        # Predict with XGBoost
        probs = model.predict_proba(np.array([features]))
        xgb_prob = float(probs[0][1])

        scored.append({
            "username": lancer.get("username", ""),
            "email": lancer.get("email", ""),
            "rating": float(lancer.get("rating", 0)),
            "semantic_score": round(sem_sim, 4),
            "recommendation_score": round(xgb_prob, 4)
        })

    top_semantic = scored.copy()
    top_semantic.sort(key=lambda x: x["semantic_score"], reverse=True)
    top_xgb = scored.copy()
    top_xgb.sort(key=lambda x: x["recommendation_score"], reverse=True)

    return jsonify({
        "semantic_top": top_semantic[:5],
        "xgb_top": top_xgb[:5]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
