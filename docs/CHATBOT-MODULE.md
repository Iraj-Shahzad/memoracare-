# Module Documentation — AI Chatbot (Custom-Trained NLP Model)

This document describes the Memory Assistant chatbot: the project's own
custom-trained natural-language model. Unlike the face-recognition module (which
integrates a pretrained model), the chatbot's intent classifier was **designed,
trained, and evaluated as part of this project**.

## 1. Overview

The chatbot lets a patient ask about their medicines, routines, family, name,
the date/time, and general help — by typing or by voice, in **English or Urdu**.
It works in two stages:

1. **Intent classification (custom model):** a neural network reads the message
   and predicts its *intent* (e.g. `medication_query`, `routine_query`,
   `emergency`).
2. **Response generation (application logic):** the backend takes the predicted
   intent and produces a personalised reply using the patient's real data from
   the database, in the requested language.

This separation means the model stays small and focused (classification only),
while answers are always accurate and personalised.

## 2. Architecture

```
Patient (types or speaks)
        │  (Web Speech API converts speech → text)
        ▼
Next.js chatbot  ──POST /api/chat/message {query, lang}──▶  Express API (Node/TS)
                                                                │  POST /predict {message}
                                                                ▼
                                                     Flask ML service (Python)
                                                     custom Keras intent model
                                                                │  {intent, confidence}
                                                                ▼
                                          Express builds a personalised reply
                                          (real meds/routines/name/date) in en/ur
                                                                │
                                          ◀── reply text ───────┘
        ▲
  (Web Speech API reads the reply aloud, if enabled)
```

## 3. Dataset

- **File:** `ml-service/data/intents.json`
- **Structure:** a list of *intents*, each with a `tag`, a set of example
  `patterns` (utterances), and template `responses`.
- **Intents (14):** greeting, goodbye, thanks, medication_query,
  medication_time, routine_query, family_query, name_query, date_time,
  location, feeling, emergency, appointment, help.
- **Bilingual:** each intent contains both **English** and **Urdu-script**
  example phrases, so the model can classify input in either language.
- The dataset is easily extended — adding more `patterns` and re-training
  improves real-world accuracy.

## 4. Pre-processing

Implemented in `ml-service/train.py` using NLTK:

1. **Tokenisation** — each utterance is split into words (`word_tokenize`).
2. **Lemmatisation** — words are reduced to their base form (`WordNetLemmatizer`).
3. **Vocabulary** — the unique lemmas across all patterns form the vocabulary.
4. **Bag-of-words** — each utterance becomes a fixed-length binary vector: `1`
   if a vocabulary word is present, `0` otherwise.
5. **Labels** — each intent tag is one-hot encoded.

## 5. Model architecture

A feed-forward neural network built with Keras / TensorFlow:

| Layer | Units | Activation | Notes |
|-------|-------|-----------|-------|
| Input | vocabulary size | — | bag-of-words vector |
| Dense | 128 | ReLU | + Dropout 0.5 |
| Dense | 64 | ReLU | + Dropout 0.5 |
| Output | number of intents | Softmax | probability per intent |

- **Loss:** categorical cross-entropy
- **Optimiser:** Stochastic Gradient Descent (SGD, learning rate 0.01, Nesterov
  momentum 0.9)
- **Epochs:** 200, **batch size:** 8
- **Regularisation:** dropout (0.5) after each hidden layer to reduce overfitting

## 6. Training & evaluation

Run with `python train.py`. The script:

1. Builds the dataset and splits it **80% train / 20% test** (stratified).
2. Trains the network.
3. Prints **test accuracy**, a **per-intent classification report**
   (precision / recall / F1), and a **confusion matrix**.
4. Saves the artifacts: `model/chatbot_model.h5`, `model/words.pkl`,
   `model/classes.pkl`.

> Insert your actual accuracy figure and confusion-matrix screenshot here after
> running `train.py`. (With a small, clean dataset, training accuracy is
> typically very high; test accuracy is reported on the held-out split.)

## 7. Serving (inference)

`ml-service/app.py` (Flask) loads the trained model and exposes:

- `POST /predict` with `{ "message": "..." }` → `{ intent, confidence, response }`
- A **confidence threshold** (`ERROR_THRESHOLD = 0.60`): if the top intent's
  probability is below this, the service returns a `fallback` intent instead of
  guessing — the assistant then asks the user to rephrase.
- `GET /health` for status checks.

## 8. Integration & personalisation

The Node/Express backend (`server/controllers/chatController.ts`) calls the ML
service, then builds the final reply:

- **Data intents** (`medication_query`, `routine_query`, `name_query`,
  `date_time`, `family_query`, `location`) are answered with the patient's
  **real records** from MongoDB.
- **Conversational intents** (greeting, thanks, emergency, …) use template
  responses.
- All replies are produced in the requested **language** (English or Urdu).
- **Resilience:** if the ML service is unavailable, the backend falls back to a
  rule-based keyword responder so the feature never breaks.

## 9. Voice support

Voice uses the browser's **Web Speech API** (no external service):

- **Speech-to-text** (`SpeechRecognition`) — the patient speaks; the transcript
  is sent to the chatbot. Language-aware (`en-US` / `ur-PK`).
- **Text-to-speech** (`speechSynthesis`) — the reply is read aloud in the chosen
  language.

## 10. Limitations & future work

- Accuracy depends on how closely a question resembles the training phrases;
  the dataset can be expanded to broaden coverage.
- Urdu speech **output** requires an Urdu voice installed on the device; speech
  **input** requires a Chromium-based browser.
- Future work: larger/curated dataset, transformer-based classifier, and
  slot-filling for multi-turn conversations.

## 11. How to re-train

```bash
cd ml-service
# activate venv, then:
python train.py     # re-reads intents.json, retrains, prints metrics
python app.py       # serves the updated model
```
