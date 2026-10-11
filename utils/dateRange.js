const VALID_RANGES = ['today', '7d', '30d', '90d', 'all'];

const getDateRange = (range = '7d') => {
  const now = new Date();
  const end = new Date(now);

  if (range === 'all') {
    return { start: new Date(0), end, prevStart: null, prevEnd: null, days: null, range };
  }

  let days = 7;
  if (range === 'today') {
    days = 1;
  } else if (range === '30d') {
    days = 30;
  } else if (range === '90d') {
    days = 90;
  }

  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - days);
  }

  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  if (range === 'today') {
    prevStart.setDate(prevStart.getDate() - 1);
  } else {
    prevStart.setDate(prevStart.getDate() - days);
  }

  return { start, end, prevStart, prevEnd, days, range };
};

const parseRange = (value) => {
  const range = (value || '7d').toLowerCase();
  return VALID_RANGES.includes(range) ? range : '7d';
};

const parseLimit = (value, defaultValue = 10, max = 100) => {
  const limit = parseInt(value, 10);
  if (Number.isNaN(limit) || limit < 1) {
    return defaultValue;
  }
  return Math.min(limit, max);
};

const parseOffset = (value) => {
  const offset = parseInt(value, 10);
  if (Number.isNaN(offset) || offset < 0) {
    return 0;
  }
  return offset;
};

const calculateChange = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const round = (value, decimals = 1) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const formatDuration = (seconds) => {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

module.exports = {
  VALID_RANGES,
  getDateRange,
  parseRange,
  parseLimit,
  parseOffset,
  calculateChange,
  round,
  formatDuration,
};
