const PageVisit = require('../models/PageVisit');
const Session = require('../models/Session');
const parseUserAgent = require('../utils/parseUserAgent');
const deriveTrafficSource = require('../utils/trafficSource');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '';
};

const createSession = async (payload) => {
  const {
    sessionId,
    userId,
    page,
    path,
    userAgent,
    ip,
    country,
    trafficSource,
    timestamp,
  } = payload;

  const parsed = parseUserAgent(userAgent);

  const session = new Session({
    sessionId,
    userId: userId || null,
    device: parsed.device,
    browser: parsed.browser,
    os: parsed.os,
    country: country || '',
    ip: ip || '',
    userAgent: userAgent || '',
    entryPage: path || page || '',
    exitPage: path || page || '',
    pageViews: 1,
    duration: 0,
    isBounce: true,
    trafficSource: trafficSource || 'unknown',
    startDate: timestamp,
    endDate: timestamp,
  });

  return session.save();
};

const trackSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, error: 'sessionId is required' });
    }

    const existing = await Session.findOne({ sessionId });

    if (existing) {
      const now = new Date();
      existing.endDate = now;
      existing.duration = Math.max(
        (now - existing.startDate) / 1000,
        0
      );
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const timestamp = req.body.timestamp
      ? new Date(req.body.timestamp)
      : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      return res
        .status(400)
        .json({ success: false, error: 'invalid timestamp' });
    }

    const userAgent = req.body.userAgent || req.headers['user-agent'] || '';
    const ip = req.body.ip || getClientIp(req);
    const trafficSource =
      req.body.trafficSource || deriveTrafficSource(req.body.referrer);

    const session = await createSession({
      sessionId,
      userId: req.body.userId,
      page: req.body.page,
      path: req.body.path || req.body.entryPage,
      userAgent,
      ip,
      country: req.body.country,
      trafficSource,
      timestamp,
    });

    return res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Failed to track session:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to track session' });
  }
};

const trackPageView = async (req, res) => {
  try {
    const { page, path, sessionId } = req.body;

    if (!page || !path || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'page, path and sessionId are required',
      });
    }

    const timestamp = req.body.timestamp
      ? new Date(req.body.timestamp)
      : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      return res
        .status(400)
        .json({ success: false, error: 'invalid timestamp' });
    }

    const userAgent = req.body.userAgent || req.headers['user-agent'] || '';
    const ip = req.body.ip || getClientIp(req);
    const parsed = parseUserAgent(userAgent);
    const trafficSource =
      req.body.trafficSource || deriveTrafficSource(req.body.referrer);

    const visit = await PageVisit.create({
      page,
      path,
      referrer: req.body.referrer || '',
      userAgent,
      ip,
      country: req.body.country || '',
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      sessionId,
      userId: req.body.userId || null,
      duration: req.body.duration || 0,
      isBounce: req.body.isBounce || false,
      isReturning: req.body.isReturning || false,
      trafficSource,
      timestamp,
    });

    let session = await Session.findOne({ sessionId });

    if (!session) {
      session = await createSession({
        sessionId,
        userId: req.body.userId,
        page,
        path,
        userAgent,
        ip,
        country: req.body.country,
        trafficSource,
        timestamp,
      });
    } else {
      session.exitPage = path;
      session.pageViews += 1;
      session.endDate = timestamp > session.startDate ? timestamp : new Date();
      session.duration = Math.max(
        (session.endDate - session.startDate) / 1000,
        0
      );
      session.isBounce = session.pageViews <= 1;
      if (req.body.country) {
        session.country = req.body.country;
      }
      if (trafficSource && session.trafficSource === 'unknown') {
        session.trafficSource = trafficSource;
      }
      await session.save();
    }

    return res.status(201).json({ success: true, data: visit });
  } catch (error) {
    console.error('Failed to track page view:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to track page view' });
  }
};

const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: 'Session not found' });
    }

    const now = new Date();
    session.endDate = now;
    session.duration = Math.max((now - session.startDate) / 1000, 0);
    session.isBounce = session.pageViews <= 1;
    await session.save();

    return res.json({ success: true, data: session });
  } catch (error) {
    console.error('Failed to end session:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to end session' });
  }
};

module.exports = {
  trackSession,
  trackPageView,
  endSession,
};
