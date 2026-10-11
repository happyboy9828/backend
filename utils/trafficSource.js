const SEARCH_ENGINES = [
  'google.',
  'bing.',
  'yahoo.',
  'baidu.',
  'duckduckgo.',
  'yandex.',
  'ask.com',
];

const SOCIAL_NETWORKS = [
  'facebook.',
  'twitter.',
  'x.com',
  'linkedin.',
  'instagram.',
  'tiktok.',
  'reddit.',
  'youtube.',
  'pinterest.',
  'whatsapp.',
];

const deriveTrafficSource = (referrer) => {
  if (!referrer) {
    return 'direct';
  }

  try {
    const { hostname } = new URL(referrer);
    const host = hostname.toLowerCase();

    if (SEARCH_ENGINES.some((engine) => host.includes(engine))) {
      return 'organic';
    }
    if (SOCIAL_NETWORKS.some((network) => host.includes(network))) {
      return 'social';
    }
    return 'referral';
  } catch (error) {
    console.error('Failed to parse referrer:', error.message);
    return 'referral';
  }
};

module.exports = deriveTrafficSource;
