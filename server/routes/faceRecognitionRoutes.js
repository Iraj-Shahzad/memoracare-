const express = require('express');
const router = express.Router();
const {
  recognizeFace,
  getRecognitionLogs,
  addKnownFace,
  getKnownFaces,
  upload,
} = require('../controllers/faceRecognitionController');
const { protect } = require('../middleware/auth');

router.use(protect); // All routes protected

router.post('/recognize', upload, recognizeFace);
router.get('/patient/:patientId/logs', getRecognitionLogs);
router.post('/known-faces', upload, addKnownFace);
router.get('/patient/:patientId/known-faces', getKnownFaces);

module.exports = router;
