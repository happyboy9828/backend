require('dotenv').config();

const API_SECRET_KEY = process.env.API_SECRET_KEY;

const authMiddleware = (req, res, next) => {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!API_SECRET_KEY) {
    console.warn('API_SECRET_KEY not configured on server');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: API secret key not set',
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required: API secret key missing',
    });
  }

  if (providedKey !== API_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Authentication failed: Invalid API secret key',
    });
  }

  next();
};

const optionalAuthMiddleware = (req, res, next) => {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;

  if (!API_SECRET_KEY) {
    console.warn('API_SECRET_KEY not configured on server');
    return next();
  }

  if (!providedKey) {
    return next();
  }

  if (providedKey !== API_SECRET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Authentication failed: Invalid API secret key',
    });
  }

  req.authenticated = true;
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};