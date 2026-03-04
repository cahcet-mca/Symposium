const express = require('express');
const router = express.Router();
const {
  getMyRegistrations,
  checkTimeConflict,
  checkIfRegistered,
  getRegistrationCount
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/myregistrations', protect, getMyRegistrations);
router.post('/check-conflict', protect, checkTimeConflict);
router.post('/check-registered', protect, checkIfRegistered);
router.get('/count/:eventId', getRegistrationCount);

module.exports = router;