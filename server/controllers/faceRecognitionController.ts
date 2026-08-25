/**
 * FACE RECOGNITION CONTROLLER — enroll known faces, log scans, alert on strangers.
 *
 * Key concepts: the actual face MATCHING runs in the BROWSER with face-api.js — this server
 * never compares faces; it only persists results. Each KnownFace stores a 128-dimensional
 * descriptor (validated by parseDescriptor: must be an array of exactly 128 numbers, accepted
 * as a JSON string from multipart or a raw array from JSON); recognizeFace just LOGS the client's
 * verdict, and on an 'unknown' result raises an Alert and Socket.IO-emits it to the patient's
 * assignedCaregivers (their rooms), NOT the patient's own room. multer handles optional 5MB
 * jpeg/png reference-image uploads to /uploads/faces. canAccessPatient guards every route (IDOR).
 * Viva line: "Recognition is done client-side with face-api.js descriptors; the backend stores
 * enrolments, keeps an audit log, and pushes real-time stranger alerts to caregivers."
 */
import { Request, Response, NextFunction } from 'express';
import RecognitionLog from '../models/RecognitionLog';
import KnownFace from '../models/KnownFace';
import Alert from '../models/Alert';
import Patient from '../models/Patient';
import { canAccessPatient } from '../utils/access';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload folder exists.
const facesDir = path.join(__dirname, '../uploads/faces');
try {
  fs.mkdirSync(facesDir, { recursive: true });
} catch {
  /* already exists */
}

// Configure multer for optional reference-image uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, facesDir),
  filename: (req, file, cb) => cb(null, `face_${Date.now()}${path.extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png) are allowed'));
  },
}).single('image');

// Parse a descriptor that may arrive as a JSON string (multipart) or array (JSON body).
function parseDescriptor(raw: any) {
  if (!raw) return null;
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length !== 128) return null;
  return arr.map(Number);
}

// @desc Log a recognition result (matching is done in the browser)
// @route POST /api/face-recognition/recognize
export const recognizeFace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.body.patientId || req.body.patient;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Please provide a patient' });
    }
    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const { result, name, relationship, confidence, knownFaceId } = req.body;
    const imageUrl = req.file ? `/uploads/faces/${req.file.filename}` : null;
    const finalResult = result === 'unknown' ? 'unknown' : 'recognized';

    const log = await RecognitionLog.create({
      patient: patientId,
      imageUrl,
      knownFace: finalResult === 'recognized' && knownFaceId ? knownFaceId : undefined,
      result: finalResult,
      recognizedPerson: finalResult === 'recognized' ? { name, relationship } : undefined,
      confidence: confidence != null ? Number(confidence) : undefined,
    });

    // Update the matched known face's stats.
    if (finalResult === 'recognized' && knownFaceId) {
      await KnownFace.findByIdAndUpdate(knownFaceId, {
        $inc: { recognitionCount: 1 },
        lastSeen: new Date(),
      }).catch(() => {});
    }

    // Unknown face → raise an alert for the caregiver.
    if (finalResult === 'unknown') {
      await Alert.create({
        patient: patientId,
        type: 'face_unknown',
        severity: 'warning',
        message: 'An unrecognized face was detected',
      });
      if (req.io) {
        // Emit to the patient's assigned caregiver(s), not the patient's own room.
        const pDoc: any = await Patient.findById(patientId).select('assignedCaregivers');
        (pDoc?.assignedCaregivers || []).forEach((cgId: any) => {
          req.io.to(cgId.toString()).emit('alert', {
            type: 'face_unknown',
            severity: 'warning',
            patient: patientId,
            message: 'Unrecognized face detected',
          });
        });
      }
    }

    res.status(200).json({ success: true, recognition: log });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get recognition logs for a patient
// @route GET /api/face-recognition/patient/:patientId/logs
export const getRecognitionLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, knownFace } = req.query;

    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    // Optionally filter to a single person's scans (per-person image gallery).
    const filter: any = { patient: patientId };
    if (knownFace) filter.knownFace = knownFace;

    const total = await RecognitionLog.countDocuments(filter);
    const logs = await RecognitionLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({ success: true, count: logs.length, total, logs });
  } catch (err: any) {
    next(err);
  }
};

// @desc Enroll a known face (stores the face descriptor)
// @route POST /api/face-recognition/known-faces
export const addKnownFace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.body.patientId || req.body.patient;
    const { name, relationship, phone } = req.body;

    if (!patientId || !name) {
      return res.status(400).json({ success: false, message: 'Patient and name are required' });
    }
    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const descriptor = parseDescriptor(req.body.descriptor);
    if (!descriptor) {
      return res.status(400).json({ success: false, message: 'A valid 128-value face descriptor is required. Make sure a clear face is visible.' });
    }

    const imageUrl = req.file ? `/uploads/faces/${req.file.filename}` : null;

    const face = await KnownFace.create({
      patient: patientId,
      name,
      relationship,
      phone,
      descriptor,
      imageUrl,
      addedBy: req.user.id || req.user._id,
    });

    res.status(201).json({ success: true, message: 'Known face added successfully', face });
  } catch (err: any) {
    next(err);
  }
};

// @desc Get known faces for a patient (includes descriptors for matching)
// @route GET /api/face-recognition/patient/:patientId/known-faces
export const getKnownFaces = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const knownFaces = await KnownFace.find({ patient: patientId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: knownFaces.length, knownFaces });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete a known face
// @route DELETE /api/face-recognition/known-faces/:id
export const deleteKnownFace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const face = await KnownFace.findById(req.params.id);
    if (!face) {
      return res.status(404).json({ success: false, message: 'Known face not found' });
    }
    const allowed = await canAccessPatient(req.user, face.patient.toString());
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    await face.deleteOne();
    res.status(200).json({ success: true, message: 'Known face deleted' });
  } catch (err: any) {
    next(err);
  }
};

// @desc Delete ONE recognition-log (a single scan image), not the whole person
// @route DELETE /api/face-recognition/logs/:id
export const deleteRecognitionLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log: any = await RecognitionLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Scan not found' });
    }
    const allowed = await canAccessPatient(req.user, log.patient.toString());
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    // Keep the known face's recognition count in sync when a scan is removed.
    if (log.knownFace) {
      await KnownFace.findByIdAndUpdate(log.knownFace, { $inc: { recognitionCount: -1 } }).catch(() => {});
    }
    await log.deleteOne();
    res.status(200).json({ success: true, message: 'Scan deleted' });
  } catch (err: any) {
    next(err);
  }
};
