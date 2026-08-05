"""
MemoryCare — Intent Classifier API (Flask)
==========================================
Loads the trained Keras model + the fitted TF-IDF vectorizer and exposes them
over HTTP so the Node/Express backend can classify a patient's message.

Endpoints:
  GET  /health           -> {status, model_loaded, classes}
  POST /predict          -> body {"message": "..."}  returns {intent, confidence, response}

Run:  python app.py   (starts on port 5001)
"""

import json
import os
import pickle
import random

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model

from nlp_utils import normalize

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "intents.json")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Confidence below this is treated as "not understood". Override with ML_THRESHOLD.
ERROR_THRESHOLD = float(os.environ.get("ML_THRESHOLD", 0.5))

# Load artifacts produced by train.py
with open(DATA_PATH, "r", encoding="utf-8") as f:
    intents = json.load(f)
with open(os.path.join(MODEL_DIR, "classes.pkl"), "rb") as f:
    classes = pickle.load(f)

# Feature mode marker: "embeddings" (sentence transformer) or "tfidf" (default).
_mode_path = os.path.join(MODEL_DIR, "mode.txt")
MODE = "tfidf"
if os.path.exists(_mode_path):
    with open(_mode_path, "r", encoding="utf-8") as f:
        MODE = f.read().strip()

vectorizer = None
if MODE == "embeddings":
    from embed_utils import embed as _embed  # lazy: loads the sentence model
else:
    with open(os.path.join(MODEL_DIR, "vectorizer.pkl"), "rb") as f:
        vectorizer = pickle.load(f)

model = load_model(os.path.join(MODEL_DIR, "chatbot_model.h5"))
print(f"Feature mode: {MODE}")

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------
def predict_intent(sentence):
    # Build features exactly as training did, per mode.
    if MODE == "embeddings":
        features = _embed([sentence])
    else:
        features = vectorizer.transform([normalize(sentence)]).toarray().astype("float32")
    probs = model.predict(features, verbose=0)[0]
    top_idx = int(np.argmax(probs))
    confidence = float(probs[top_idx])
    if confidence < ERROR_THRESHOLD:
        return None, confidence
    return classes[top_idx], confidence


def response_for(tag):
    for intent in intents["intents"]:
        if intent["tag"] == tag:
            return random.choice(intent["responses"])
    return "I'm not sure I understood. Could you say that a different way?"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None, "classes": classes})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"success": False, "message": "No message provided"}), 400

    intent, confidence = predict_intent(message)

    if intent is None:
        return jsonify({
            "success": True,
            "intent": "fallback",
            "confidence": round(confidence, 3),
            "response": "I'm sorry, I didn't quite understand. You can ask me about "
                        "your medicines, your routine, your family, or the date and time.",
        })

    return jsonify({
        "success": True,
        "intent": intent,
        "confidence": round(confidence, 3),
        "response": response_for(intent),
    })


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"MemoryCare ML service running on port {port}")
    app.run(host="0.0.0.0", port=port)
