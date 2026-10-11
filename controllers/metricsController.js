const PageVisit = require('../models/PageVisit');
const Session = require('../models/Session');
const {
  parseRange,
  parseLimit,
  getDateRange,
  calculateChange,
} = require('../utils/dateRange');

const countDistinctVisitors = async (start, end, filter = {}) => {
  const result = await PageVisit.aggregate([
    { $match: { timestamp: { $gte: start, $lte: end }, ...filter } },
    { $group: { _id: '$sessionId' } },
    { $count: 'count' },
  ]);
  return result.length > 0 ? result[0].count : 0;
};

const computePeriodStats = async (start, end) => {
  const [visitors, pageViews, returningVisitors, sessionAgg] = await Promise.all([
    countDistinctVisitors(start, end),
    PageVisit.countDocuments({ timestamp: { $gte: start, $lte: end } }),
    countDistinctVisitors(start, end, { isReturning: true }),
    Session.aggregate([
      { $match: { startDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalPageViews: { $sum: '$pageViews' },
          bounces: { $sum: { $cond: ['$isBounce', 1, 0] } },
        },
      },
    ]),
  ]);

  const sessionStats =
    sessionAgg.length > 0
      ? sessionAgg[0]
      : { sessions: 0, totalDuration: 0, totalPageViews: 0, bounces: 0 };

  const { sessions, totalDuration, totalPageViews, bounces } = sessionStats;

  return {
    visitors,
    uniqueVisitors: visitors,
    pageViews,
    sessions,
    totalPageViews,
    avgSessionDuration: sessions > 0 ? totalDuration / sessions : 0,
    bounceRate: sessions > 0 ? (bounces / sessions) * 100 : 0,
    pagesPerSession: sessions > 0 ? totalPageViews / sessions : 0,
    returningVisitors,
  };
};

const buildChange = (current, previous) => {
  if (!previous) {
    return null;
  }
  return {
    visitors: calculateChange(current.visitors, previous.visitors),
    pageViews: calculateChange(current.pageViews, previous.pageViews),
    sessions: calculateChange(current.sessions, previous.sessions),
    avgSessionDuration: calculateChange(
      current.avgSessionDuration,
      previous.avgSessionDuration
    ),
    bounceRate: calculateChange(current.bounceRate, previous.bounceRate),
    pagesPerSession: calculateChange(
      current.pagesPerSession,
      previous.pagesPerSession
    ),
    returningVisitors: calculateChange(
      current.returningVisitors,
      previous.returningVisitors
    ),
  };
};

const getOverview = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const { start, end, prevStart, prevEnd } = getDateRange(range);

    const [current, previous] = await Promise.all([
      computePeriodStats(start, end),
      prevStart ? computePeriodStats(prevStart, prevEnd) : Promise.resolve(null),
    ]);

    return res.json({
      success: true,
      data: { range, current, previous, change: buildChange(current, previous) },
    });
  } catch (error) {
    console.error('Failed to fetch overview metrics:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch overview metrics' });
  }
};

const fillTimeGaps = (start, end, interval, buckets) => {
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  const data = [];

  const cursor = new Date(start);
  if (interval === 'day') {
    cursor.setUTCHours(0, 0, 0, 0);
  } else {
    cursor.setUTCMinutes(0, 0, 0);
  }

  const endCursor = new Date(end);

  while (cursor <= endCursor) {
    const key =
      interval === 'day'
        ? cursor.toISOString().slice(0, 10)
        : `${cursor.toISOString().slice(0, 13)}:00`;

    const existing = bucketMap.get(key);
    data.push({
      date: key,
      visitors: existing ? existing.visitors : 0,
      pageViews: existing ? existing.pageViews : 0,
    });

    if (interval === 'day') {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else {
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
  }

  return data;
};

const getTimeSeries = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const interval = req.query.interval === 'hour' ? 'hour' : 'day';
    const { start, end } = getDateRange(range);

    const dateFormat =
      interval === 'hour' ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';

    const buckets = await PageVisit.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$timestamp' } },
          pageViews: { $sum: 1 },
          visitors: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          pageViews: 1,
          visitors: { $size: '$visitors' },
        },
      },
      { $sort: { date: 1 } },
    ]);

    const data = fillTimeGaps(start, end, interval, buckets);

    return res.json({
      success: true,
      data: { range, interval, data },
    });
  } catch (error) {
    console.error('Failed to fetch time series:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch time series' });
  }
};

const getTopPages = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const limit = parseLimit(req.query.limit, 10);
    const { start, end } = getDateRange(range);

    const pages = await PageVisit.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { page: '$page', path: '$path' },
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$sessionId' },
          totalDuration: { $sum: '$duration' },
          bounces: { $sum: { $cond: ['$isBounce', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          page: '$_id.page',
          path: '$_id.path',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          avgDuration: {
            $cond: [
              { $gt: ['$views', 0] },
              { $divide: ['$totalDuration', '$views'] },
              0,
            ],
          },
          bounceRate: {
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$bounces', '$views'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
    ]);

    return res.json({
      success: true,
      data: { range, limit, data: pages },
    });
  } catch (error) {
    console.error('Failed to fetch top pages:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch top pages' });
  }
};

const aggregateTrafficSources = (start, end) =>
  Session.aggregate([
    { $match: { startDate: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$trafficSource',
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$sessionId' },
      },
    },
    {
      $project: {
        _id: 0,
        source: '$_id',
        sessions: 1,
        visitors: { $size: '$visitors' },
      },
    },
  ]);

const getTrafficSources = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const { start, end, prevStart, prevEnd } = getDateRange(range);

    const [current, previous] = await Promise.all([
      aggregateTrafficSources(start, end),
      prevStart
        ? aggregateTrafficSources(prevStart, prevEnd)
        : Promise.resolve([]),
    ]);

    const previousMap = new Map(previous.map((item) => [item.source, item.sessions]));
    const total = current.reduce((sum, item) => sum + item.sessions, 0);

    const data = current
      .map((item) => ({
        source: item.source,
        sessions: item.sessions,
        visitors: item.visitors,
        percentage:
          total > 0
            ? Number(((item.sessions / total) * 100).toFixed(1))
            : 0,
        change: calculateChange(item.sessions, previousMap.get(item.source) || 0),
      }))
      .sort((a, b) => b.sessions - a.sessions);

    return res.json({
      success: true,
      data: { range, total, data },
    });
  } catch (error) {
    console.error('Failed to fetch traffic sources:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch traffic sources' });
  }
};

module.exports = {
  getOverview,
  getTimeSeries,
  getTopPages,
  getTrafficSources,
};
