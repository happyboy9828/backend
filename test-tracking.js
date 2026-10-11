const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const PageVisit = require('./models/PageVisit');
const Session = require('./models/Session');
const parseUserAgent = require('./utils/parseUserAgent');
const deriveTrafficSource = require('./utils/trafficSource');

const TEST_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TEST_UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

let mongod;

async function setup() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to in-memory MongoDB:', uri);
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else {
    console.log('PASS:', message);
  }
}

async function runTests() {
  await setup();

  // 1. Test UA parsing
  const parsedDesktop = parseUserAgent(TEST_UA);
  assert(parsedDesktop.device === 'desktop', `UA parse desktop device (got ${parsedDesktop.device})`);
  assert(parsedDesktop.browser === 'Chrome', `UA parse browser (got ${parsedDesktop.browser})`);
  assert(parsedDesktop.os === 'Windows', `UA parse OS (got ${parsedDesktop.os})`);

  const parsedMobile = parseUserAgent(TEST_UA_MOBILE);
  assert(parsedMobile.device === 'mobile', `UA parse mobile device (got ${parsedMobile.device})`);
  assert(parsedMobile.browser === 'Mobile Safari', `UA parse mobile browser (got ${parsedMobile.browser})`);

  // 2. Test traffic source derivation
  assert(deriveTrafficSource() === 'direct', 'No referrer -> direct');
  assert(deriveTrafficSource('https://www.google.com/search?q=test') === 'organic', 'Google referrer -> organic');
  assert(deriveTrafficSource('https://twitter.com/home') === 'social', 'Twitter referrer -> social');
  assert(deriveTrafficSource('https://example.com/page') === 'referral', 'Example referrer -> referral');

  // 3. Test session creation via tracking logic (replicating controller)
  const sessionId = 'test-session-' + Date.now();

  const session = new Session({
    sessionId,
    userId: null,
    device: parsedDesktop.device,
    browser: parsedDesktop.browser,
    os: parsedDesktop.os,
    country: 'US',
    ip: '127.0.0.1',
    userAgent: TEST_UA,
    entryPage: '/',
    exitPage: '/',
    pageViews: 1,
    duration: 0,
    isBounce: true,
    trafficSource: 'direct',
    startDate: new Date(),
    endDate: new Date(),
  });
  await session.save();

  const found = await Session.findOne({ sessionId });
  assert(found !== null, 'Session was saved to DB');
  assert(found.sessionId === sessionId, 'Session ID matches');
  assert(found.device === 'desktop', 'Session device saved');
  assert(found.browser === 'Chrome', 'Session browser saved');
  assert(found.os === 'Windows', 'Session OS saved');
  assert(found.country === 'US', 'Session country saved');
  assert(found.ip === '127.0.0.1', 'Session IP saved');
  assert(found.entryPage === '/', 'Session entryPage saved');
  assert(found.pageViews === 1, 'Session pageViews saved');
  assert(found.isBounce === true, 'Session isBounce saved');
  assert(found.trafficSource === 'direct', 'Session trafficSource saved');

  // 4. Test page view creation
  const visit = new PageVisit({
    page: 'Home',
    path: '/',
    referrer: '',
    userAgent: TEST_UA,
    ip: '127.0.0.1',
    country: 'US',
    device: parsedDesktop.device,
    browser: parsedDesktop.browser,
    os: parsedDesktop.os,
    sessionId,
    userId: null,
    duration: 5,
    isBounce: false,
    isReturning: false,
    trafficSource: 'direct',
    timestamp: new Date(),
  });
  await visit.save();

  const foundVisit = await PageVisit.findOne({ sessionId });
  assert(foundVisit !== null, 'PageVisit was saved to DB');
  assert(foundVisit.page === 'Home', 'PageVisit page saved');
  assert(foundVisit.path === '/', 'PageVisit path saved');
  assert(foundVisit.device === 'desktop', 'PageVisit device saved');
  assert(foundVisit.browser === 'Chrome', 'PageVisit browser saved');
  assert(foundVisit.os === 'Windows', 'PageVisit OS saved');
  assert(foundVisit.country === 'US', 'PageVisit country saved');
  assert(foundVisit.trafficSource === 'direct', 'PageVisit trafficSource saved');
  assert(foundVisit.duration === 5, 'PageVisit duration saved');
  assert(foundVisit.isBounce === false, 'PageVisit isBounce saved');
  assert(foundVisit.isReturning === false, 'PageVisit isReturning saved');

  // 5. Test session update (page view increments)
  found.exitPage = '/about';
  found.pageViews = 2;
  found.endDate = new Date();
  found.duration = 10;
  found.isBounce = false;
  await found.save();

  const updated = await Session.findOne({ sessionId });
  assert(updated.pageViews === 2, 'Session pageViews updated to 2');
  assert(updated.exitPage === '/about', 'Session exitPage updated');
  assert(updated.isBounce === false, 'Session isBounce updated to false');
  assert(updated.duration === 10, 'Session duration updated');

  // 6. Test indexes
  const indexes = await Session.collection.indexes();
  const sessionIdIndex = indexes.find((i) => i.key.sessionId === 1);
  assert(sessionIdIndex !== undefined, 'Session has sessionId index');
  assert(sessionIdIndex.unique === true, 'Session sessionId index is unique');

  const visitIndexes = await PageVisit.collection.indexes();
  const visitSessionIndex = visitIndexes.find((i) => i.key.sessionId === 1);
  assert(visitSessionIndex !== undefined, 'PageVisit has sessionId index');

  await teardown();
  console.log('\nAll tests completed.');
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});