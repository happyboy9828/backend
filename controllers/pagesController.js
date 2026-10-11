const PageVisit = require('../models/PageVisit');
const {
  parseRange,
  parseLimit,
  parseOffset,
  getDateRange,
} = require('../utils/dateRange');

const buildPageStatsPipeline = (start, end) => [
  { $match: { timestamp: { $gte: start, $lte: end } } },
  {
    $group: {
      _id: { page: '$page', path: '$path' },
      views: { $sum: 1 },
      uniqueVisitors: { $addToSet: '$sessionId' },
      totalDuration: { $sum: '$duration' },
      bounces: { $sum: { $cond: ['$isBounce', 1, 0] } },
      lastVisit: { $max: '$timestamp' },
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
      lastVisit: 1,
    },
  },
];

const getPages = async (req, res) => {
  try {
    const range = parseRange(req.query.range);
    const limit = parseLimit(req.query.limit, 20);
    const offset = parseOffset(req.query.offset);
    const { start, end } = getDateRange(range);

    const pipeline = [
      ...buildPageStatsPipeline(start, end),
      { $sort: { views: -1 } },
      { $skip: offset },
      { $limit: limit },
    ];

    const countPipeline = [
      ...buildPageStatsPipeline(start, end),
      { $count: 'count' },
    ];

    const [pages, countResult] = await Promise.all([
      PageVisit.aggregate(pipeline),
      PageVisit.aggregate(countPipeline),
    ]);

    const total = countResult.length > 0 ? countResult[0].count : 0;

    return res.json({
      success: true,
      data: { range, total, limit, offset, data: pages },
    });
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch pages' });
  }
};

module.exports = {
  getPages,
};
