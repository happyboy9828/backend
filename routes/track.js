const express = require('express');
const router = express.Router();
const {
  trackSession,
  trackPageView,
  endSession,
} = require('../controllers/trackingController');

router.post('/session', trackSession);
router.post('/pageview', trackPageView);
router.post('/session/:sessionId/end', endSession);

module.exports = router;
