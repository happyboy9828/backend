const Session = require('../models/Session');
const PageVisit = require('../models/PageVisit');
const {
  parseRange,
  parseLimit,
  parseOffset,
  getDateRange,
} = require('../utils/dateRange');

const getSessions = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const limit = parseLimit(req.query.limit, 20);
    const offset = parseOffset(req.query.offset);
    const { start, end } = getDateRange(range);

    const [sessions, total] = await Promise.all([
      Session.find({ startDate: { $gte: start, $lte: end } })
        .sort({ startDate: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Session.countDocuments({ startDate: { $gte: start, $lte: end } }),
    ]);

    return res.json({
      success: true,
      data: { range, total, limit, offset, data: sessions },
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch sessions' });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId }).lean();

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: 'Session not found' });
    }

    const pageVisits = await PageVisit.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean();

    return res.json({
      success: true,
      data: { ...session, pageVisits },
    });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch session' });
  }
};

module.exports = {
  getSessions,
  getSessionById,
};
