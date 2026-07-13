import { Request, Response, NextFunction } from 'express';
import Memory from '../models/Memory';
import { canAccessPatient } from '../utils/access';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload folder exists.
const memoriesDir = path.join(__dirname, '../uploads/memories');
try {
  fs.mkdirSync(memoriesDir, { recursive: true });
} catch {
  /* already exists */
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, memoriesDir),
  filename: (req, file, cb) => cb(null, `memory_${Date.now()}${path.extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
  },
}).single('image');

// Accept people as a JSON array, a comma-separated string, or an array.
function parsePeople(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map(String).map((x) => x.trim()).filter(Boolean);
      } catch {
        /* fall through to comma split */
      }
    }
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

// @desc Get all memories for a patient
// @route GET /api/memories/patient/:patientId
export const getMemoriesByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const memories = await Memory.find({ patient: patientId }).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: memories.length, memories });
  } catch (err) {
    next(err);
  }
};

// @desc Create a memory (patient, their caregiver, or admin)
// @route POST /api/memories
export const createMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.body.patientId || req.body.patient;
    const { title, location, date, description } = req.body;

    if (!patientId || !title) {
      return res.status(400).json({ success: false, message: 'Patient and title are required' });
    }
    const allowed = await canAccessPatient(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }

    const imageUrl = req.file ? `/uploads/memories/${req.file.filename}` : null;

    const memory = await Memory.create({
      patient: patientId,
      title,
      location,
      description,
      date: date ? new Date(date) : undefined,
      people: parsePeople(req.body.people),
      imageUrl,
      addedBy: req.user.id || req.user._id,
    });

    res.status(201).json({ success: true, message: 'Memory added', memory });
  } catch (err) {
    next(err);
  }
};

// @desc Delete a memory
// @route DELETE /api/memories/:id
export const deleteMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }
    const allowed = await canAccessPatient(req.user, memory.patient.toString());
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this patient' });
    }
    await memory.deleteOne();
    res.status(200).json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    next(err);
  }
};
