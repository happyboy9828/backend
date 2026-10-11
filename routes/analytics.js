const express = require('express');
const router = express.Router();
const {
  getDeviceBreakdown,
  getBrowserBreakdown,
  getCountryBreakdown,
} = require('../controllers/analyticsController');

router.get('/devices', getDeviceBreakdown);
router.get('/browsers', getBrowserBreakdown);
router.get('/countries', getCountryBreakdown);

module.exports = router;
