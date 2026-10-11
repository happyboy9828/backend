const Session = require('../models/Session');
const {
  parseRange,
  parseLimit,
  getDateRange,
  round,
} = require('../utils/dateRange');

const capitalize = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const getDeviceBreakdown = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const { start, end } = getDateRange(range);

    const devices = await Session.aggregate([
      { $match: { startDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$device',
          sessions: { $sum: 1 },
          visitors: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          device: '$_id',
          sessions: 1,
          visitors: { $size: '$visitors' },
        },
      },
      { $sort: { sessions: -1 } },
    ]);

    const total = devices.reduce((sum, item) => sum + item.sessions, 0);

    const data = devices.map((item) => ({
      name: capitalize(item.device),
      sessions: item.sessions,
      visitors: item.visitors,
      percentage: total > 0 ? round((item.sessions / total) * 100, 1) : 0,
    }));

    return res.json({
      success: true,
      data: { range, total, data },
    });
  } catch (error) {
    console.error('Failed to fetch device breakdown:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch device breakdown' });
  }
};

const getBrowserBreakdown = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const { start, end } = getDateRange(range);

    const browsers = await Session.aggregate([
      { $match: { startDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$browser',
          sessions: { $sum: 1 },
          visitors: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          browser: '$_id',
          sessions: 1,
          visitors: { $size: '$visitors' },
        },
      },
      { $sort: { sessions: -1 } },
    ]);

    const total = browsers.reduce((sum, item) => sum + item.sessions, 0);

    const data = browsers
      .map((item) => ({
        name: item.browser === 'unknown' ? 'Other' : item.browser,
        sessions: item.sessions,
        visitors: item.visitors,
        percentage: total > 0 ? round((item.sessions / total) * 100, 1) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    return res.json({
      success: true,
      data: { range, total, data },
    });
  } catch (error) {
    console.error('Failed to fetch browser breakdown:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch browser breakdown' });
  }
};

const getCountryBreakdown = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const limit = parseLimit(req.query.limit, 10);
    const { start, end } = getDateRange(range);

    const countries = await Session.aggregate([
      {
        $match: {
          startDate: { $gte: start, $lte: end },
          country: { $ne: '' },
        },
      },
      {
        $group: {
          _id: '$country',
          visitors: { $addToSet: '$sessionId' },
          sessions: { $sum: 1 },
          totalPageViews: { $sum: '$pageViews' },
          totalDuration: { $sum: '$duration' },
          bounces: { $sum: { $cond: ['$isBounce', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          country: '$_id',
          visitors: { $size: '$visitors' },
          sessions: 1,
          totalPageViews: 1,
          totalDuration: 1,
          bounces: 1,
        },
      },
      { $sort: { visitors: -1 } },
      { $limit: limit },
    ]);

    const data = countries.map((item) => {
      const { visitors, sessions, totalPageViews, totalDuration, bounces } = item;
      return {
        country: item.country,
        visitors,
        sessions,
        pagesPerSession:
          sessions > 0 ? round(totalPageViews / sessions, 1) : 0,
        avgSessionDuration:
          sessions > 0 ? round(totalDuration / sessions, 1) : 0,
        bounceRate:
          sessions > 0 ? round((bounces / sessions) * 100, 1) : 0,
      };
    });

    return res.json({
      success: true,
      data: { range, limit, data },
    });
  } catch (error) {
    console.error('Failed to fetch country breakdown:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch country breakdown' });
  }
};

module.exports = {
  getDeviceBreakdown,
  getBrowserBreakdown,
  getCountryBreakdown,
};
