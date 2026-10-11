const UAParser = require('ua-parser-js');

const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      device: 'unknown',
      browser: 'unknown',
      os: 'unknown',
    };
  }

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let device = 'unknown';
    if (result.device.type === 'mobile') {
      device = 'mobile';
    } else if (result.device.type === 'tablet') {
      device = 'tablet';
    } else if (result.device.type === 'desktop' || !result.device.type) {
      device = 'desktop';
    }

    return {
      device,
      browser: result.browser.name || 'unknown',
      os: result.os.name || 'unknown',
    };
  } catch (error) {
    return {
      device: 'unknown',
      browser: 'unknown',
      os: 'unknown',
    };
  }
};

module.exports = parseUserAgent;