const express = require('express');
const router = express.Router();
const {
  getMyRegistrations,
  checkTimeConflict,
  checkIfRegistered,
  getRegistrationCount,
  getTicketDetails
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/myregistrations', protect, getMyRegistrations);
router.post('/check-conflict', protect, checkTimeConflict);
router.post('/check-registered', protect, checkIfRegistered);
router.get('/count/:eventId', getRegistrationCount);
router.get('/ticket/:id', getTicketDetails);

module.exports = router;