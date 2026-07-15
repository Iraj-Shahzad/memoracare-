# Thesis Updates — Aligning the Report with the Built System

Paste these revisions into the matching chapters of `fypchapters.docx`. They
correct where the implementation differs from the original proposal and add the
features built beyond it. (Brand name in code is **MemoryCare**; the report can
keep "Memory Assistant System".)

---

## Chapter 1 — SPMP → *Tools and Techniques*

**Replace the "Software Tools" list with:**

- **Next.js (TypeScript):** frontend web application
- **Node.js + Express (TypeScript):** backend server and REST API
- **MongoDB + Mongoose:** database management
- **Python + Flask + TensorFlow/Keras + NLTK:** custom-trained NLP chatbot model
- **face-api.js (TensorFlow.js):** in-browser face recognition
- **Web Speech API:** voice input/output (English & Urdu)
- **Socket.IO:** real-time notifications
- **Jest, Supertest, mongodb-memory-server:** automated testing
- **Docker:** containerised deployment
- **Figma / Draw.io:** UI and diagram design; **GitHub:** version control

> **Important correction:** the proposal listed **Dialogflow** for the chatbot.
> The implemented system does **not** use Dialogflow — instead, a **custom
> intent-classification neural network was designed and trained** for this
> project (see Chapter / Module Documentation on the chatbot). This is a
> stronger contribution: the model is the project's own trained work rather than
> a third-party hosted service.

**Add a line under "Techniques Used":** *Full-stack type safety (TypeScript on
both client and server).*

---

## Chapter 2 — SRS

### 2.x External Interface Requirements → Software Interfaces
Add: *The frontend and backend are both implemented in TypeScript. A separate
Python/Flask service hosts the custom chatbot model. Face recognition executes
in the browser via TensorFlow.js.*

### 2.x Functional Requirements — additions
Keep FR-1 … FR-18, and add:

- **FR-19:** The system shall allow the patient (or their caregiver) to store a
  **memory gallery** of photos with names, relationships, and notes.
- **FR-20:** The system shall generate patient **reports** and allow download as
  **PDF and Excel**.
- **FR-21:** The system shall automatically detect **missed medications/routines**
  and raise a caregiver alert.
- **FR-22:** The system shall provide **voice reminders** and read chatbot
  replies aloud (text-to-speech).
- **FR-23:** The system shall accept **voice input** for the chatbot
  (speech-to-text).
- **FR-24:** The system shall support **English and Urdu** for the chatbot and
  voice features.
- **FR-25:** The system shall enforce **role-based access control** so that
  caregivers access only their assigned patients.

### 2.x Clarification on FR-17/FR-18 (AI-Assisted Support)
- **FR-17 (Face recognition):** implemented as a patient *memory aid* — the
  patient scans a face and the system announces who the person is (spoken).
  It uses a **pretrained** face-embedding model with nearest-neighbour matching
  against faces enrolled by the caregiver. *(Note: face recognition is a
  recall/identification feature, not the login mechanism.)*
- **FR-18 (Chatbot):** implemented with the project's **custom-trained** intent
  model, personalised with the patient's real data, in English and Urdu.

---

## Chapter 3 — SDD

### 3.x System Architecture (updated)
The system follows a three-tier, service-oriented architecture:

1. **Presentation tier** — Next.js (App Router, React, TypeScript). Runs face
   recognition in the browser (TensorFlow.js) and voice via the Web Speech API.
2. **Application tier** — Express/Node (TypeScript) REST API with JWT auth,
   role-based access control, Socket.IO for real-time alerts, and a `node-cron`
   scheduler for reminders and missed-dose detection.
3. **Intelligence tier** — a Python/Flask service hosting the custom Keras
   chatbot model, called by the application tier.
4. **Data tier** — MongoDB (via Mongoose): users, patients, caregivers,
   medications, routines, logs, alerts, chat history, known faces, memories, and
   reports.

### 3.x Technology stack table (add)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript, Socket.IO |
| Database | MongoDB, Mongoose |
| Chatbot model | Python, Flask, TensorFlow/Keras, NLTK |
| Face recognition | face-api.js (TensorFlow.js) |
| Voice | Web Speech API |
| Auth | JWT, bcrypt |
| Reports | pdfkit, exceljs |

### 3.x Security design (add/expand)
Authentication uses JWT with bcrypt-hashed passwords. **Authorization** is
enforced by a central `canAccessPatient` check on every patient-scoped endpoint:
admins access all patients, caregivers only assigned patients, and patients only
their own records.

---

## Note for Chapter 4 (Testing)
The testing chapter has been rewritten to reflect the actual automated suite
(Jest + Supertest + in-memory MongoDB) and the model evaluation. See
`docs/TESTING.md`.
