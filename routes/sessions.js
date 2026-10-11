const express = require('express');
const router = express.Router();
const {
  getSessions,
  getSessionById,
} = require('../controllers/sessionsController');

router.get('/', getSessions);
router.get('/:sessionId', getSessionById);

module.exports = router;
