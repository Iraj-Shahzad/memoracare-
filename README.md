# MemoryCare

A memory-assistance web application for people living with Alzheimer's, dementia,
and mild cognitive impairment (MCI) — and the caregivers who support them.

MemoryCare helps patients keep track of their **medications** and **daily
routines**, **recognise familiar faces**, revisit a **memory gallery** of loved
ones, and talk to a **memory assistant chatbot** — while caregivers manage care
plans, receive **real-time alerts** (missed doses, SOS, unknown faces), and
export **PDF / Excel reports**.

> Final Year Project. Built as a full-stack **TypeScript** application (MERN +
> Next.js) with a custom Python/Flask NLP service for the chatbot.

---

## Features

### Patient
- **Dashboard** — today's medication & routine progress at a glance.
- **Medications** — see prescribed medicines and mark each dose taken / missed.
- **Routines** — daily activities grouped by time of day, with completion tracking.
- **Memory Gallery** — photos of family, friends, and places with names & notes.
- **Face Recognition** — point the camera at a person to recall who they are.
- **AI Chatbot** — ask about medicines, routines, family, the date, and more.
- **SOS button** — instantly alert the caregiver in an emergency.
- **Reports** — generate and download health reports as **PDF** or **Excel**.

### Caregiver
- **Dashboard** — assigned patients, compliance, and alerts.
- **Manage** medications & routines for assigned patients.
- **Alerts** — view and resolve missed-dose / SOS / unknown-face alerts.
- **Care notes** and **reports** per patient.

### Admin
- **System dashboard**, **user management**, **contact messages**, monitoring.

### Cross-cutting
- **Role-based access control** — patients see only their own data; caregivers
  only their assigned patients; admins everything (enforced server-side).
- **Real-time** notifications via Socket.IO.
- **Reminders** — a `node-cron` scheduler pushes dose/routine reminders and
  raises caregiver alerts for missed items.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript (ts-node), Socket.IO |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| AI chatbot | Python, Flask, TensorFlow/Keras, NLTK (custom intent classifier) |
| Face recognition | `@vladmandic/face-api` (TensorFlow.js, in-browser) |
| Reports | pdfkit (PDF), exceljs (Excel) |
| Testing | Jest, Supertest, mongodb-memory-server |

---

## Architecture

```
                 ┌─────────────────────────┐
                 │   Next.js frontend       │  http://localhost:3000
                 │   (React + TypeScript)   │
                 └───────────┬─────────────┘
                             │ REST + Socket.IO
                             ▼
                 ┌─────────────────────────┐        ┌──────────────────┐
                 │  Express API (TypeScript)│───────▶│  MongoDB          │
                 │  http://localhost:5000   │        │  (Mongoose)       │
                 └───────────┬─────────────┘        └──────────────────┘
                             │ HTTP (intent classification)
                             ▼
                 ┌─────────────────────────┐
                 │  Flask ML service        │  http://localhost:5001
                 │  (custom Keras chatbot)  │
                 └─────────────────────────┘

Face recognition runs entirely in the browser (face-api.js) and stores
128-value face descriptors via the Express API.
```

---

## Repository structure

```
memorycare/
├── src/                  # Next.js frontend (App Router, TypeScript)
│   ├── app/              # pages (patient / caregiver / admin + public)
│   ├── components/       # shared UI (sidebars, Topbar, etc.)
│   ├── context/          # AuthContext
│   └── lib/              # api client, socket, face-api helpers
├── public/models/        # face-api model weights (copied in — see below)
├── server/               # Express + TypeScript backend
│   ├── models/ controllers/ routes/ middleware/ services/ utils/
│   ├── tests/            # Jest + Supertest suite
│   ├── app.ts server.ts seed.ts tsconfig.json
├── ml-service/           # Python/Flask custom chatbot model
│   ├── data/intents.json train.py app.py requirements.txt
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **Python 3.10–3.12** (for the chatbot ML service)
- **MongoDB** — local (`mongod` on port 27017) or a MongoDB Atlas cluster
- **Git**

---

## Local setup

Run each service in its own terminal. Start MongoDB first.

### 1. Clone

```bash
git clone https://github.com/Iraj-Shahzad/memoracare-.git
cd memoracare-
```

### 2. Backend — Express API (port 5000)

```bash
cd server
cp .env.example .env        # then edit values (see below)
npm install
npm run seed                # loads sample accounts + data (clears the DB!)
npm run dev                 # ts-node + nodemon
```

### 3. ML service — chatbot model (port 5001)

```bash
cd ml-service
python -m venv venv
# Windows:  .\venv\Scripts\Activate.ps1     |  macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
python train.py             # trains the intent model (prints accuracy)
python app.py               # serves the model
```

### 4. Frontend — Next.js (port 3000)

```bash
# from the project root
npm install
# copy the face-recognition model weights into public/models:
#   Windows:  Copy-Item "node_modules/@vladmandic/face-api/model/*" "public/models/" -Force
#   macOS/Linux:  cp node_modules/@vladmandic/face-api/model/* public/models/
npm run dev
```

Open **http://localhost:3000**.

---

## Environment variables

### `server/.env`

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/memoracare
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:5001
```

### `.env.local` (frontend, optional)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Defaults to `http://localhost:5000/api` if omitted.

---

## Test accounts

Created by `npm run seed`. Password for all: **`password123`**

| Role | Email |
|------|-------|
| Patient | `ahmed@memoracare.pk` |
| Patient | `nasreen@memoracare.pk` |
| Patient | `tariq@memoracare.pk` |
| Caregiver | `sarah@memoracare.pk` |
| Caregiver | `fatima@memoracare.pk` |
| Admin | `admin@memoracare.pk` |

---

## Running tests

```bash
cd server
npm test
```

Uses an in-memory MongoDB (no real database needed). The first run downloads a
MongoDB binary once. Covers authentication, role-based access control, and the
reminder scheduler.

---

## Deployment

A typical cloud setup:

| Component | Platform | Notes |
|-----------|----------|-------|
| Database | **MongoDB Atlas** | Free tier; put the connection string in `MONGODB_URI`. |
| Backend API | **Render** / **Railway** | Build: `npm install`; start: `npm run build && npm run serve` (or `npm start`). Set all `server/.env` variables. |
| ML service | **Render** / **Railway** | Python service; build: `pip install -r requirements.txt && python train.py`; start: `python app.py`. Point the backend's `ML_SERVICE_URL` at it. |
| Frontend | **Vercel** | Set `NEXT_PUBLIC_API_URL` to the deployed API URL. |

CORS: the API currently allows `http://localhost:3000`. Update the `origin` in
`server/app.ts` (and the Socket.IO CORS in `server/server.ts`) to your deployed
frontend URL before going live.

Notes:
- Uploaded images (faces, memories) are stored on the server's local disk under
  `server/uploads/`. For a stateless host, move these to object storage
  (e.g. S3) or a persistent volume.
- If the ML service isn't deployed, the chatbot automatically falls back to
  simple rule-based replies, so the rest of the app still works.

### Run the whole stack with Docker

The repository includes Dockerfiles for each service and a `docker-compose.yml`
that runs MongoDB, the API, the ML service, and the frontend together:

```bash
docker compose up --build
# then, once it's up, seed sample data:
docker compose exec backend npm run seed
```

Open **http://localhost:3000**. Change `JWT_SECRET` (and, for a real deployment,
the CORS origins) before exposing it publicly.

---

## Project status

Implemented: authentication & RBAC, patient/caregiver/admin dashboards and CRUD,
SOS, reminders (node-cron), custom-trained chatbot, in-browser face recognition,
memory gallery, PDF/Excel report export, full-stack TypeScript, and an automated
backend test suite. Responsive on mobile and desktop.

---

## Acknowledgements

Built as a Final Year Project. Not a medical device — MemoryCare supports care
coordination and is not a substitute for professional medical advice.
