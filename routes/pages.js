const express = require('express');
const router = express.Router();
const { getPages } = require('../controllers/pagesController');

router.get('/', getPages);

module.exports = router;
