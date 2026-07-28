# MemoryCare — How to Run the Whole App

MemoryCare has **4 parts** that run together:

| Part | Folder | Port | Tech |
|------|--------|------|------|
| Database | (MongoDB) | 27017 | MongoDB |
| AI chatbot service | `ml-service/` | 5001 | Python · Flask · Keras · NLTK |
| Backend API | `server/` | 5000 | Node · Express · TypeScript |
| Frontend | `/` (root) | 3000 | Next.js · React · TypeScript |

> Prerequisites: **Node 18+**, **Python 3.12**, **MongoDB**, **Git**.

---

## 1. One-time setup (do these once)

**Root (frontend):**
```powershell
cd D:\memoracare
git pull origin main
npm install
Copy-Item "node_modules\@vladmandic\face-api\model\*" "public\models\" -Force   # face-recognition weights
```

**ML service:**
```powershell
cd D:\memoracare\ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python train.py     # trains the chatbot model -> creates model/ (needed before app.py)
```

**Backend:**
```powershell
cd D:\memoracare\server
npm install
```
Ensure `server\.env` exists:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/memoracare
JWT_SECRET=anylongsecretstring
JWT_EXPIRE=7d
# optional (defaults to http://localhost:5001):
ML_SERVICE_URL=http://localhost:5001
```

---

## 2. Every time you run it — 4 terminals (keep all open)

**Terminal 1 — MongoDB** (skip if it runs as a Windows service):
```powershell
mongod --dbpath C:\data\db
```

**Terminal 2 — ML service (port 5001):**
```powershell
cd D:\memoracare\ml-service
.\venv\Scripts\Activate.ps1
python app.py
```

**Terminal 3 — Backend API (port 5000):**
```powershell
cd D:\memoracare\server
ts-node seed.ts       # first time only — loads demo data (safe to re-run: it skips if data exists)
ts-node server.ts     # starts the API
```

**Terminal 4 — Frontend (port 3000):**
```powershell
cd D:\memoracare
npm run dev
```

Open **http://localhost:3000**.

---

## 3. Data & the seed script

- **Your data is permanent in MongoDB.** You do **not** re-seed on every run — data survives restarts.
- `ts-node seed.ts` loads demo accounts/data. It has a **safety guard**: if the database already has users, it **skips** (it will not wipe your data).
- To deliberately reset to fresh demo data: `ts-node seed.ts --force`.
- You can also create your own data through the app (register users, add medications, etc.) — that persists forever too.

---

## 4. Test accounts (password `password123`, except Iraj)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@memoracare.pk` | `password123` |
| Caregiver | `Iraj@gmail.com` | `IRAJ123` |
| Caregiver | `sarah@memoracare.pk` | `password123` |
| Caregiver | `fatima@memoracare.pk` | `password123` |
| Patient | `ahmed@memoracare.pk` | `password123` |
| Patients | `nasreen@`, `tariq@`, `abdul@`, `zubaida@`, `iqbal@`, `khadija@`, `ghulam@` `memoracare.pk` | `password123` |

---

## 5. Quick health checks
```powershell
curl http://localhost:5001/health
curl -X POST http://localhost:5001/predict -H "Content-Type: application/json" -d "{\"message\":\"when is namaz\"}"
```

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ts-node not recognized` | `npm install -g ts-node typescript` |
| ML: `No module named tensorflow` | activate the venv first (`.\venv\Scripts\Activate.ps1`) |
| `app.py` can't find `model/...` | run `python train.py` first |
| Frontend won't compile | `npm install` in the root |
| Login "Invalid credentials" | run `ts-node seed.ts` (loads accounts) |
| Face recognition crashes | re-run the `Copy-Item ... public\models` step |
| Backend can't connect to DB | make sure MongoDB (Terminal 1) is running |

---

## 7. Architecture note (for the viva)
The app is **fully TypeScript** (frontend + backend). The **AI chatbot is a separate Python service** because it uses Keras/TensorFlow and NLTK — Python ML libraries. The services talk over HTTP (frontend → backend → Flask) and WebSocket (real-time alerts).
