# Chapter 5 — System Interfaces

This chapter presents the main interfaces of the Memory Assistant System
(MemoryCare) along with a description of each. For every interface, insert the
corresponding screenshot from the running application in place of the
*[screenshot]* marker.

> Capture screenshots at a consistent window size. For the patient/caregiver/
> admin screens, log in with the demo accounts (password `password123`):
> patient `ahmed@memoracare.pk`, caregiver `sarah@memoracare.pk`,
> admin `admin@memoracare.pk`.

---

## 5.1 Landing Page

*[screenshot: landing / home page]*

The landing page is the public entry point to MemoryCare. It presents the
system's purpose — supporting people with Alzheimer's, dementia, and mild
cognitive impairment — through a hero section, a summary of key features
(medication reminders, routines, face recognition, AI chatbot, caregiver
monitoring), and clear calls to action to **Login** or **Register**. Content
animates into view on scroll, and the navigation collapses into a menu on
smaller screens for responsiveness.

## 5.2 Registration & Login

*[screenshot: register / login screen]*

This interface handles authentication. New users register as a **Patient** or
**Caregiver** by entering their name, email, password, phone, and role;
administrators are provisioned separately. Existing users log in with their email
and password. On success the user receives a secure session (JWT) and is
redirected to the dashboard for their role. Invalid credentials produce a clear
error message, and each role can only reach the pages permitted to it.

## 5.3 Patient Dashboard

*[screenshot: patient dashboard]*

The patient dashboard is a simple, uncluttered overview of the day. It shows how
many medications and routines have been completed, an overall wellbeing score,
and quick access to the main features via the sidebar. The layout uses large,
clear text suited to elderly users. The persistent top bar provides the SOS
button, the voice-reminder toggle, and notifications.

## 5.4 Medications

*[screenshot: patient medications page]*

This interface lists the patient's prescribed medicines, each with its dosage and
scheduled times. The patient marks each dose as **Taken** or **Missed**, and the
status is saved and reflected in their compliance statistics. Medicines are added
and maintained by the caregiver, so the patient view stays focused on taking and
recording doses without the risk of accidental edits.

## 5.5 Daily Routines

*[screenshot: patient routines page]*

The routines interface presents the patient's daily activities (for example
morning walk, prayers, meals, memory exercises) grouped by time of day —
morning, afternoon, and evening. Each activity can be ticked as **complete**, and
completion is tracked over time. Routines are scheduled by the caregiver on
chosen days of the week.

## 5.6 AI Chatbot (with Voice & Urdu)

*[screenshot: chatbot conversation]*

The chatbot is the patient's conversational assistant, powered by the project's
custom-trained NLP model. The patient can **type or speak** a question and
receive an answer in **English or Urdu**, selected with the language toggle.
Replies can also be **read aloud**. The assistant answers using the patient's
real data — for example listing today's medicines, describing the routine, or
naming family members — and gently directs emergencies to the SOS button.

## 5.7 Face Recognition

*[screenshot: face recognition screen with a result]*

This interface helps the patient recognise familiar people. Using the device
camera, the patient scans a face; the system matches it against faces previously
enrolled by the caregiver and **announces the result aloud** (for example "This
is Sarah, your daughter") with a confidence percentage. Unknown faces are
reported and logged as an alert for the caregiver. New faces are enrolled by
uploading a clear photo and entering the person's name and relationship.

## 5.8 Memory Gallery

*[screenshot: memory gallery grid]*

The memory gallery is a visual memory aid: a grid of photos of people, places,
and events, each labelled with a title, the people involved, the place, the
date, and a short note. It helps the patient recall meaningful moments and
relationships. Memories can be added with a photo and details, and removed when
no longer needed.

## 5.9 Reports

*[screenshot: reports page with a generated report]*

The reports interface lets the patient (or caregiver) generate health reports for
a chosen type and date range — for example a weekly medication summary. Each
report shows summary statistics (doses taken/missed, compliance rate, routine
completion) and can be **downloaded as a PDF or an Excel file** for sharing with
a doctor or family member.

## 5.10 Caregiver Dashboard

*[screenshot: caregiver dashboard]*

The caregiver dashboard shows only the patients assigned to that caregiver, with
each patient's compliance and any active alerts. From here the caregiver monitors
overall status and navigates to manage medications, routines, notes, alerts, and
reports for their patients.

## 5.11 Caregiver — Alerts

*[screenshot: caregiver alerts page]*

This interface lists alerts for the caregiver's patients: **missed medications**,
**missed routines**, **SOS** emergencies, and **unknown-face** detections, each
with a severity level. The caregiver reviews an alert and marks it **resolved**
once acted upon. Critical alerts (such as SOS) are highlighted for immediate
attention.

## 5.12 Administrator Dashboard

*[screenshot: admin dashboard]*

The administrator interface provides a system-wide view: overall statistics
(users, patients, alerts), user management (view, deactivate, or remove
accounts), and messages submitted through the public contact form. It gives the
administrator oversight of the whole platform.

---

### Summary

The interfaces above cover the three user roles and all core modules —
authentication, medication and routine management, the AI chatbot with voice and
bilingual support, face recognition, the memory gallery, reporting, alerting, and
administration — demonstrating a complete, role-based memory-assistance system.
