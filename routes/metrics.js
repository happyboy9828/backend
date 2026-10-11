const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTimeSeries,
  getTopPages,
  getTrafficSources,
} = require('../controllers/metricsController');

router.get('/overview', getOverview);
router.get('/timeseries', getTimeSeries);
router.get('/top-pages', getTopPages);
router.get('/traffic-sources', getTrafficSources);

module.exports = router;
