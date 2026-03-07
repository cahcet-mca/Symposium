const express = require('express');
const router = express.Router();
const { verifyPayment, getMyRegistrations } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/verify', protect, verifyPayment);
router.get('/my-registrations', protect, getMyRegistrations);

module.exports = router;