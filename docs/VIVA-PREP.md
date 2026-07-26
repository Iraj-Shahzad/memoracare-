# MemoryCare — Viva Preparation & Codebase Guide

Everything you need to **understand, explain, and defend** the project. Read top to bottom once, then use the Q&A at the end to rehearse.

---

## 1. One-line pitch
> "MemoryCare is a full-stack web application that helps Alzheimer's, dementia and MCI patients manage daily life — medication and routine reminders, a bilingual AI chatbot, face recognition to identify loved ones, and caregiver monitoring — built on the MERN stack with a separate Python machine-learning service."

## 2. Who uses it (3 roles)
- **Patient** — sees reminders, chats with the AI, uses face recognition, views memories.
- **Caregiver** — manages the patients assigned to them (medications, routines, alerts, notes, reports).
- **Admin** — system-wide oversight: users, monitoring, reports.

---

## 3. Architecture (why it's built this way)

Four layers, each with one job (**separation of concerns**):

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (browser)  — Next.js / React / Tailwind          │
│  + face-api.js (face recognition)  + Web Speech (voice)  │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS REST + WebSocket
┌───────────────▼─────────────────────────────────────────┐
│  APPLICATION — Express + TypeScript (REST API)           │
│  JWT auth · RBAC · Socket.io · node-cron scheduler       │
└──────┬──────────────────────────────────┬───────────────┘
       │ HTTP (chat)                       │ Mongoose
┌──────▼───────────────┐        ┌──────────▼───────────────┐
│ AI SERVICE (Flask)   │        │ DATA — MongoDB           │
│ Keras + NLTK chatbot │        │ 16 collections           │
└──────────────────────┘        └──────────────────────────┘
```

**Why a separate Python service for the AI?** Node.js is great for the web API but the ML ecosystem (Keras/TensorFlow, NLTK) is Python. Keeping the model in its own Flask service means it can be trained, scaled, or swapped **without touching the main app**, and each part uses the right tool for the job. They talk over a simple HTTP call.

**Why the layered design?** Each layer can be developed and tested independently, and one can change without breaking the others — the textbook benefit of a loosely-coupled, layered architecture.

---

## 4. Tech stack & the "why" for each choice

| Technology | Used for | Why chosen |
|-----------|----------|-----------|
| **Next.js 14 (App Router)** | Frontend | React framework with routing, SSR and a great DX; App Router organises pages by folder |
| **TypeScript** | Front + back | Type safety catches bugs at compile time; industry standard |
| **Tailwind CSS** | Styling | Utility-first, fast, consistent, responsive |
| **Express** | REST API | Minimal, widely-used Node web framework |
| **MongoDB + Mongoose** | Database | Flexible document model fits varied medical/patient data; Mongoose adds schemas + validation |
| **JWT** | Auth | Stateless tokens — server needn't store sessions; scales well |
| **bcrypt** | Passwords | Industry-standard salted hashing (never store plain passwords) |
| **Socket.io** | Real-time | Push alerts to caregivers instantly (missed dose, SOS) |
| **node-cron** | Scheduler | Fires medication/routine reminders and flags missed doses on a schedule |
| **Flask** | ML serving | Lightweight Python web server to expose the model |
| **Keras/TensorFlow** | The model | High-level neural-network API; quick to build and train |
| **NLTK** | NLP preprocessing | Tokenising and lemmatising the chatbot text |
| **face-api.js** | Face recognition | Pre-trained face models that run **in the browser** (TensorFlow.js) — private, no server GPU needed |
| **Web Speech API** | Voice | Built into the browser; speech-to-text and text-to-speech in English + Urdu |

---

## 5. Folder-by-folder walkthrough

```
memorycare-repo/
├── src/                      ← FRONTEND (Next.js)
│   ├── app/                  ← pages (one folder = one route)
│   │   ├── page.tsx          ← landing page (/)
│   │   ├── auth/             ← login & register (/auth)
│   │   ├── patient/          ← patient pages (dashboard, medications, routines, chatbot, face-recognition, memory-gallery, reports, ...)
│   │   ├── caregiver/        ← caregiver pages (dashboard, patients, medications, alerts, notes, reports, ...)
│   │   └── admin/            ← admin pages (dashboard, users, monitoring, reports, ...)
│   ├── components/           ← shared UI (Sidebars, Topbar, ProtectedRoute)
│   ├── context/AuthContext   ← global auth state (current user, login/logout)
│   └── lib/                  ← api.ts (fetch wrapper), socket.ts, faceApi.ts
│
├── server/                   ← BACKEND (Express + TypeScript)
│   ├── server.ts             ← entry point: DB connect, HTTP + socket.io, start scheduler
│   ├── app.ts                ← builds the Express app, mounts routes & middleware
│   ├── config/db.ts          ← MongoDB connection
│   ├── models/               ← 16 Mongoose schemas (the data shape)
│   ├── controllers/          ← the actual logic for each feature
│   ├── routes/               ← maps URLs → controllers
│   ├── middleware/           ← protect (JWT), authorize (roles), validators
│   ├── services/reminderScheduler ← the node-cron job
│   ├── utils/access.ts       ← canAccessPatient() permission helper
│   └── seed.ts               ← loads demo data
│
└── ml-service/               ← AI CHATBOT (Python)
    ├── train.py              ← trains the intent classifier
    ├── app.py                ← Flask API that serves predictions
    └── data/intents.json     ← the labelled training dataset
```

---

## 6. Data models (the 16 collections — know the main ones)

- **User** — everyone (name, email, hashed password, role). One User → one Patient *or* one Caregiver profile.
- **Patient** — medical profile (diagnosis, doctor, allergies, emergency contacts, assignedCaregivers).
- **Caregiver** — specialization + assignedPatients.
- **Medication** + **MedicationLog** — the prescription and the taken/missed history.
- **Routine** + **RoutineLog** — daily activities and their completion history.
- **Alert** — notifications for caregivers (missed medication, SOS, unknown face).
- **ChatHistory** — every chatbot message and reply.
- **KnownFace** — an enrolled face (name, relationship, 128-number descriptor).
- **RecognitionLog** — each face-recognition attempt and its result.
- **Memory** — memory-aid photos (who/where/when).
- **Report** — generated PDF/Excel reports.
- **Note** — caregiver notes about a patient.
- **Contact** — contact-form submissions.

**One-to-many & many-to-many:** a Patient has many Medications/Routines (1-to-many); Patients and Caregivers are many-to-many (a caregiver has many patients, a patient can have several caregivers).

---

## 7. Authentication & security (examiners love this)

1. **Register/Login** → server checks credentials, signs a **JWT** (`jwt.sign({id}, SECRET)`), returns it.
2. Frontend stores the token in `localStorage` and sends it on every request as `Authorization: Bearer <token>`.
3. **`protect` middleware** verifies the token on protected routes and loads `req.user`.
4. **`authorize('admin')` / `authorize('caregiver')`** restricts routes by role — this is **RBAC** (Role-Based Access Control).
5. **`canAccessPatient(user, patientId)`** enforces *resource-level* access: a patient can only see their own record, a caregiver only their assigned patients, an admin anyone.
6. **Passwords** are hashed with **bcrypt** in a Mongoose `pre('save')` hook — plain passwords are never stored.

**JWT vs sessions:** JWT is *stateless* — the server doesn't store session data; the signed token itself proves identity. Easier to scale.

---

## 8. The AI chatbot — model training explained stage by stage

This is your **custom-trained model** (not OpenAI, not Dialogflow). File: `ml-service/train.py`.

**Dataset:** `data/intents.json` — a **custom bilingual** dataset: **18 intents**, **~535 labelled phrases** in **English, Roman-Urdu and Urdu** (greeting, medication, routine, family, emergency, appointment, meals, weather, memories, doctor, etc.). A survey of public datasets (Kaggle intent sets, medical intent corpora, the Urdu-translated ATIS) found none covering dementia daily-care intents bilingually — which is why the dataset was curated rather than downloaded.

| Stage | What happens | Why |
|-------|--------------|-----|
| **1. Load** | Read the labelled intents | The supervised training data |
| **2. Tokenise** | Split each phrase into words (NLTK `word_tokenize`), lowercase | Words are the features |
| **3. Lemmatise** | Reduce words to base form ("taking"→"take") with WordNet | Fewer, cleaner features; "take"/"taking" treated the same |
| **4. Bag-of-Words** | Turn each phrase into a vector of 0/1 — "is each vocabulary word present?" | Neural nets need numbers, not text |
| **5. One-hot labels** | Each intent → a vector with a 1 in its slot | Target for the softmax output |
| **6. Split** | Stratified 80/20 train/test, `random_state=42` | Honest evaluation on data the model never trained on |
| **7. Model** | `Dense(128,relu) → Dropout(0.5) → Dense(64,relu) → Dropout(0.5) → Dense(14,softmax)` | Learns patterns; dropout prevents overfitting; softmax gives a probability per intent |
| **8. Train** | SGD optimiser, categorical cross-entropy loss, 200 epochs, batch 8 | Standard classification training |
| **9. Evaluate** | Accuracy + classification report (precision/recall/F1) + confusion matrix on the test set | The numbers for your results chapter |
| **10. Save** | `chatbot_model.h5`, `words.pkl`, `classes.pkl` | So `app.py` can load and serve it |

**Serving (`app.py`):** loads the saved model, exposes `POST /predict`. For a message it rebuilds the bag-of-words, runs `model.predict`, takes the highest-probability intent. If confidence **< 0.60** it returns a safe *fallback* ("I didn't quite understand…") instead of guessing.

**End-to-end chat flow:** patient types → Next.js `POST /chat/message` → Express `chatController` → `POST http://localhost:5001/predict` (Flask) → intent returned → Express personalises the reply with the patient's **real** data (their meds, routine, family, the date) in English or Urdu → saves to `ChatHistory` → emits over socket.io → shown to the patient. If Flask is down it gracefully falls back to keyword rules.

**Key ML terms to define confidently:**
- **Bag-of-words:** represent text as which words are present, ignoring order.
- **Softmax:** turns the final layer into probabilities that sum to 1.
- **Dropout:** randomly "switches off" 50% of neurons during training so the model can't memorise — reduces overfitting.
- **Epoch:** one full pass over the training data (we do 200).
- **Overfitting:** model memorises training data but fails on new data; we counter it with dropout + a held-out test set.
- **Confusion matrix:** table of true vs predicted labels — shows which intents get mixed up.

---

## 9. Face recognition (be clear: this is NOT your trained model)

- Uses **face-api.js**, which ships **pre-trained** models (TinyFaceDetector, FaceLandmark68, FaceRecognitionNet) that run **in the browser** via TensorFlow.js.
- **Enrol:** capture a face → the model outputs a **128-number "descriptor"** (a numeric fingerprint of the face) → stored in `KnownFace`.
- **Recognise:** capture a live face → compute its descriptor → measure the **Euclidean distance** to each stored descriptor → the closest within a threshold is the match; otherwise "unknown". Every attempt is saved to `RecognitionLog`.
- **Why in the browser?** Privacy (the face image never leaves the device) and no server GPU needed.

> Honesty for the viva: "The chatbot is my own trained model; face recognition uses a pre-trained library — I integrated it and built the enrolment, matching threshold, logging and UI around it."

---

## 10. Real-time & scheduling
- **Socket.io:** when a dose is missed or an SOS is pressed, the server pushes an alert to the caregiver instantly (no page refresh).
- **node-cron:** a scheduled job checks due medications/routines, sends reminders, and after a grace period marks a dose missed and alerts the caregiver.

---

## 11. Bugs I found and fixed (say these — they show engineering maturity)

1. **Double-hashed passwords** — the seed hashed the password *and* the model's save-hook hashed it again, so login always failed. Fixed by passing the plain password and letting the hook hash once.
2. **Privilege escalation on register** — the public register endpoint accepted any `role`, so anyone could create an **admin**. Fixed to only ever create patient/caregiver.
3. **Broken access control (IDOR)** — `/patients/:id` and `/users/:id` had no ownership check, so any logged-in user could read/edit **any** patient's medical record. Fixed with the `canAccessPatient` / self-or-admin guards.
4. **Unmounted validators** — input-validation middleware was written but never wired to the routes. Mounted it.
5. **Duplicate caregiver assignments** — an ObjectId was compared to a string (always false), creating duplicates. Fixed the comparison.
6. **Server crash on stray rejection** — an unhandled promise called `process.exit(1)`, which could kill the app mid-demo. Changed to log instead.
7. **Hardcoded dashboard data** — the patient dashboard showed fake meds/caregiver; wired it to the real API.

---

## 12. Known limitations (own them before the examiner finds them)
- **Modest ML dataset** (~535 phrases, 18 intents) → good accuracy but limited generalisation to very different phrasings. *Mitigation:* confidence threshold + rule-based fallback; k-fold cross-validation for an honest estimate; more data would help further.
- **`emergency` vs `feeling` overlap** — physical distress ("I am in pain") and emotional distress ("I feel bad") are semantically close, so they sometimes get confused. This is acceptable because both route the patient toward care/SOS, and it's easy to explain.
- **Single train/test split** → accuracy is a small-sample estimate; k-fold cross-validation would be more robust.
- **Urdu** isn't lemmatised (NLTK is English-only) — it still works as distinct bag-of-words features.
- **Face recognition** needs the model weight files present and a decent camera/light; it's a pre-trained library, not custom-trained.
- A few UI extras (e.g. "Continue with Google") are visual only.

---

## 13. Likely viva questions + model answers

**General / architecture**
1. *What is MemoryCare?* → the one-line pitch (§1).
2. *Why MERN?* → JS across the stack, MongoDB's flexible documents suit varied patient data, huge ecosystem.
3. *Why a separate Python service?* → right tool for ML; independently trainable/scalable (§3).
4. *How do the parts communicate?* → REST + WebSocket (client↔server), HTTP (server↔Flask), Mongoose (server↔DB).
5. *Is it responsive / bilingual?* → Tailwind responsive; English + Urdu via Web Speech + the dataset.

**Auth & security**
6. *How does login work?* → §7 steps 1-3.
7. *What is JWT and why not sessions?* → stateless signed token; scales without server-side session storage.
8. *What is RBAC?* → restrict routes/actions by role (`authorize`).
9. *How are passwords stored?* → bcrypt salted hash in a pre-save hook; never plain.
10. *What is IDOR and how did you prevent it?* → accessing another user's data by changing the id; prevented with `canAccessPatient`/self-or-admin checks.

**Database**
11. *Why MongoDB over SQL?* → flexible schema for heterogeneous medical data; Mongoose adds validation.
12. *Show a relationship.* → Patient 1-to-many Medications; Patient many-to-many Caregivers.
13. *What's an ODM?* → Object-Data Modelling (Mongoose) — maps JS objects to MongoDB documents with schemas.

**Machine learning (rehearse these hardest)**
14. *Walk me through training.* → the 10 stages in §8.
15. *Is this your own model or an API?* → my own Keras model trained on my dataset; served by Flask.
16. *What are the features?* → bag-of-words vectors over the vocabulary.
17. *Why softmax at the output?* → produces a probability per intent that sum to 1; pick the max.
18. *Why dropout?* → regularisation; prevents overfitting on the small dataset.
19. *What accuracy did you get?* → **73.6% (±5.4%) under 5-fold cross-validation, and 80.95% on a held-out test set** (macro-F1 ≈ 0.83), with a full classification report + confusion matrix. The cross-validated figure is the robust one; the held-out run gives the per-class report.
20. *How do you avoid overfitting?* → dropout + a held-out test split; I also report per-class precision/recall.
21. *What if the model is unsure?* → confidence threshold 0.60 → safe fallback message.
22. *What's the loss function?* → categorical cross-entropy (multi-class classification).
23. *Bag-of-words limitation?* → ignores word order and unseen words; fine for short intent phrases.
24. *How would you improve it?* → more data, k-fold CV, TF-IDF or word embeddings, proper Urdu tokenisation.

**Face recognition**
25. *Did you train the face model?* → no, pre-trained face-api.js; I built enrolment, matching, logging.
26. *How does matching work?* → compare 128-number descriptors by Euclidean distance vs a threshold.
27. *Why run it in the browser?* → privacy + no server GPU.

**Real-time / scheduling**
28. *How do caregivers get instant alerts?* → Socket.io push.
29. *How do reminders fire?* → node-cron scheduled job; grace period then "missed" + alert.

**Engineering**
30. *What bugs did you find and fix?* → §11 (double-hash, privilege escalation, IDOR, …). *This answer impresses examiners.*
31. *How is the code organised?* → MVC-style: models, controllers, routes, middleware (§5).
32. *How would you deploy it?* → Docker (there's a `docker-compose.yml`); the Flask Dockerfile even self-trains the model.

---

## 14. 30-second demo script (for the live viva)
1. Log in as **Ahmed (patient)** → dashboard shows his real meds, routines, caregiver.
2. Open **AI Chatbot** → "what medicine do I take today" → real personalised reply → then Urdu.
3. Open **Face Recognition** → enrol + recognise a face.
4. Log in as **Sarah (caregiver)** → see assigned patients, resolve an alert, generate a report.
5. Log in as **Admin** → users + system health (custom NLP model) + generate a system report.
6. Mention: *"the chatbot is my own trained model — here's the accuracy and confusion matrix from `train.py`."*

Good luck — you know this system. 💪
