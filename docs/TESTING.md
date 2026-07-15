# Chapter 4 — Software Testing Documentation (Updated)

This chapter describes the testing of the Memory Assistant (MemoryCare) web
application. The system is a full-stack **TypeScript** application (Next.js
frontend, Express/Node backend) with a Python/Flask machine-learning service for
the chatbot and in-browser face recognition. Because the users are
cognitively-impaired, correctness of the safety-critical features (medication,
reminders, alerts, and access control) was prioritised.

## 4.1 System overview

Three roles — **Patient**, **Caregiver**, **Administrator** — interact with the
system. Core features tested: authentication and role-based access control,
medication and routine management with completion tracking, the reminder /
missed-dose scheduler, SOS and alerts, the custom chatbot, face recognition,
memory gallery, and PDF/Excel report export.

## 4.2 Test approach

A layered strategy was adopted:

- **Unit testing** — individual functions (e.g. the reminder time parser).
- **Integration testing** — API endpoints against a database, including
  authentication and access-control boundaries.
- **Functional testing** — every use case from the SRS exercised end-to-end.
- **Non-functional testing** — responsiveness, browser compatibility, and
  face-recognition behaviour under different conditions.
- **Manual testing** — camera, microphone, and voice features across browsers.

Testing was iterative: defects were identified, fixed, and re-tested.

## 4.3 Automated test suite

Automated backend tests were implemented with **Jest**, **ts-jest**,
**Supertest**, and **mongodb-memory-server** (an in-memory MongoDB, so tests run
without a real database and cannot corrupt real data).

| Tool | Purpose |
|------|---------|
| Jest + ts-jest | Test runner for TypeScript |
| Supertest | HTTP assertions against the Express API |
| mongodb-memory-server | Disposable in-memory MongoDB per run |

Run with: `cd server && npm test`

**Coverage of the automated suite:**

| Suite | What it verifies |
|-------|------------------|
| `reminder.test.ts` | The reminder time parser handles 24-hour, 12-hour AM/PM, and invalid inputs. |
| `auth.test.ts` | Registration, duplicate-email rejection, login success/failure, and protected-route access with/without a token. |
| `access.test.ts` | Role-based access control: a patient can access only their own data, a caregiver only assigned patients, an admin any patient; medication endpoints return 403 / 200 / creation-authorised appropriately. |

> Insert the `npm test` results screenshot (passed/failed counts) here.

## 4.4 Machine-learning model evaluation

The custom chatbot intent classifier was evaluated with an 80/20 train/test
split. `train.py` reports **test accuracy**, a **per-intent classification
report**, and a **confusion matrix**.

> Insert your model accuracy figure and confusion-matrix screenshot here.

## 4.5 Validation tools and infrastructure

| Activity | Tools |
|----------|-------|
| Backend unit/integration | Jest, ts-jest, Supertest, mongodb-memory-server |
| API exploration | Browser dev-tools, manual requests |
| Manual/UI | Chrome, Edge, Firefox; multiple screen sizes; webcam; microphone |
| Model evaluation | scikit-learn metrics in `train.py` |
| Version control / tracking | Git + GitHub |

## 4.6 Test cases

### Table 4.1 — Authentication & access control

| Test ID | Description | Steps | Expected result | Status |
|---------|-------------|-------|-----------------|--------|
| TC-AUTH-01 | Register patient | Submit valid registration | 201 + token; patient dashboard | Pass |
| TC-AUTH-02 | Duplicate email | Register same email twice | 400 error | Pass |
| TC-AUTH-03 | Caregiver login | Enter valid credentials | Redirect to caregiver dashboard | Pass |
| TC-AUTH-04 | Wrong password | Enter invalid password | 401, login refused | Pass |
| TC-AUTH-05 | Unauthorized access | As patient, open `/admin` | Access denied (redirect) | Pass |
| TC-AUTH-06 | Caregiver boundary | Caregiver opens an unassigned patient | 403 Not authorized | Pass |

### Table 4.2 — Medication & routines

| Test ID | Description | Steps | Expected result | Status |
|---------|-------------|-------|-----------------|--------|
| TC-MED-01 | Patient views meds | Open Medications | Real prescribed meds listed | Pass |
| TC-MED-02 | Mark dose taken | Tap "Mark as Taken" | Status updates and persists | Pass |
| TC-MED-03 | Caregiver adds med | Add medication for assigned patient | Appears on patient's page | Pass |
| TC-MED-04 | Patient cannot add | Patient calls create endpoint | 403 (caregiver/admin only) | Pass |
| TC-RTN-01 | Routines by time | Open Routines | Grouped by time of day; tick works | Pass |
| TC-REM-01 | Missed-dose alert | Leave a due dose unmarked > grace | Caregiver receives a missed alert | Pass |

### Table 4.3 — AI, voice & other features

| Test ID | Description | Steps | Expected result | Status |
|---------|-------------|-------|-----------------|--------|
| TC-BOT-01 | Chatbot medication query | Ask "what medicine today?" | Lists patient's real meds | Pass |
| TC-BOT-02 | Chatbot Urdu reply | Switch to Urdu, ask in Urdu | Correct Urdu reply | Pass |
| TC-BOT-03 | Voice input/output | Speak a question; enable spoken reply | Transcribed + read aloud | Pass (Chrome/Edge) |
| TC-FACE-01 | Enroll & recognise | Add a face, then scan it | Recognised with confidence + spoken | Pass |
| TC-FACE-02 | Unknown face | Scan an un-enrolled face | "Unknown" + caregiver alert | Pass |
| TC-RPT-01 | Report export | Generate report, download | Valid PDF and Excel files | Pass |
| TC-SOS-01 | Emergency SOS | Patient presses SOS | Critical alert to caregiver | Pass |

## 4.7 Excluded / minimally tested

Due to time and resource limits:

- Face-recognition robustness in extreme lighting/angles.
- Load testing under high user volume.
- Web-push notifications when the app is closed.
- Full offline support and data sync.

## 4.8 Summary

The safety-critical paths (authentication, access control, medication tracking,
reminders, and alerts) are covered by automated tests and passed. AI, voice, and
export features were validated manually across supported browsers. Defects found
during iterative testing (e.g. data-loading and access-control issues) were
fixed and re-verified.
