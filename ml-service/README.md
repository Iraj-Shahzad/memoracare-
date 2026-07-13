# MemoryCare — ML Service (Custom Intent Classifier)

A custom **bag-of-words neural network** (Keras/TensorFlow) that classifies a
patient's message into an intent (e.g. `medication_query`, `routine_query`,
`emergency`). Served over HTTP with Flask so the Node/Express backend can use it.

This is the project's own trained NLP model — not a third-party API.

## Architecture

```
Next.js chat  ->  Node/Express (chatController)  ->  Flask /predict  ->  Keras model
                          |                                   |
                          |<----------- {intent, confidence} -+
                          |
                  Node fills in the patient's real meds / routines / name
                          |
                          -> final personalized reply -> saved to ChatHistory
```

## Setup (Windows PowerShell)

```powershell
cd ml-service

# 1. Create + activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Train the model (creates model/chatbot_model.h5 + words.pkl + classes.pkl)
python train.py

# 4. Run the API (http://localhost:5001)
python app.py
```

> First run downloads small NLTK data (punkt, wordnet) automatically.

## Files

| File | Purpose |
|------|---------|
| `data/intents.json` | The labelled dataset (intents, example utterances, responses). Edit this to teach new intents, then re-run `train.py`. |
| `train.py` | Trains the NN, prints **accuracy + classification report + confusion matrix**, saves the model. |
| `app.py` | Flask API that loads the model and answers `POST /predict`. |
| `model/` | Generated artifacts (created by `train.py`). |

## Test it

```powershell
curl -X POST http://localhost:5001/predict -H "Content-Type: application/json" -d "{\"message\": \"what medicine do I take today\"}"
```

Expected: `{"intent": "medication_query", "confidence": 0.9x, ...}`

## Improving accuracy

Add more example `patterns` per intent in `data/intents.json` (aim for 10–15
each), then re-run `python train.py`. More varied examples = better real-world
accuracy.

## Connecting to the backend

The Node backend calls this service at the URL in `server/.env`:

```
ML_SERVICE_URL=http://localhost:5001
```

If the ML service is offline, the backend falls back to simple rule-based
replies so the app keeps working.
