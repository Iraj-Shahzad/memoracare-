const RecognitionLog = require('../models/RecognitionLog');
const Patient = require('../models/Patient');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/faces'));
  },
  filename: (req, file, cb) => {
    cb(null, `face_${Date.now()}${path.extname(file.originalname)}`);
  },
});

exports.upload = multer({
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

// @desc Recognize a face
// @route POST /api/face-recognition/recognize
exports.recognizeFace = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    const imageUrl = req.file ? `/uploads/faces/${req.file.filename}` : null;

    // TODO: In Phase 4B, this will call the Siamese Network via Flask API
    // For now, return a placeholder response
    const recognitionResult = {
      result: 'recognized',
      recognizedPerson: { name: 'Dr. Ahmed Khan', relationship: 'Doctor' },
      confidence: 0.92,
    };

    const log = await RecognitionLog.create({
      patient: patientId,
      imageUrl,
      result: recognitionResult.result,
      recognizedPerson: recognitionResult.recognizedPerson,
      confidence: recognitionResult.confidence,
    });

    // If unknown face, create an alert
    if (recognitionResult.result === 'unknown') {
      const Alert = require('../models/Alert');
      await Alert.create({
        patient: patientId,
        type: 'face_unknown',
        severity: 'warning',
        message: 'An unrecognized face was detected',
      });

      if (req.io) {
        req.io.to(patientId).emit('alert', { type: 'face_unknown', message: 'Unrecognized face detected' });
      }
    }

    res.status(200).json({ success: true, recognition: log });
  } catch (err) {
    next(err);
  }
};

// @desc Get recognition logs for a patient
// @route GET /api/face-recognition/patient/:patientId/logs
exports.getRecognitionLogs = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const total = await RecognitionLog.countDocuments({ patient: patientId });
    const logs = await RecognitionLog.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: logs.length, total, logs });
  } catch (err) {
    next(err);
  }
};

// @desc Add a known face (for training)
// @route POST /api/face-recognition/known-faces
exports.addKnownFace = async (req, res, next) => {
  try {
    const { patientId, name, relationship } = req.body;
    const imageUrl = req.file ? `/uploads/faces/${req.file.filename}` : null;

    // TODO: In Phase 4B, this will store the face embedding via Flask API
    // For now, store a recognition log entry as a reference
    const entry = await RecognitionLog.create({
      patient: patientId,
      imageUrl,
      result: 'recognized',
      recognizedPerson: { name, relationship },
      confidence: 1.0,
    });

    res.status(201).json({ success: true, message: 'Known face added successfully', entry });
  } catch (err) {
    next(err);
  }
};

// @desc Get known faces for a patient
// @route GET /api/face-recognition/patient/:patientId/known-faces
exports.getKnownFaces = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Get distinct recognized persons from logs
    const logs = await RecognitionLog.find({
      patient: patientId,
      result: 'recognized',
      'recognizedPerson.name': { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });

    // Deduplicate by person name
    const seenNames = new Set();
    const knownFaces = [];
    for (const log of logs) {
      if (log.recognizedPerson?.name && !seenNames.has(log.recognizedPerson.name)) {
        seenNames.add(log.recognizedPerson.name);
        knownFaces.push({
          name: log.recognizedPerson.name,
          relationship: log.recognizedPerson.relationship,
          imageUrl: log.imageUrl,
          lastSeen: log.createdAt,
        });
      }
    }

    res.status(200).json({ success: true, count: knownFaces.length, knownFaces });
  } catch (err) {
    next(err);
  }
};
