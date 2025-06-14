const IpSafe = require('./lib/ipsafe');
const { checkNetworkSafe, executeIfSafe } = require('./lib/check-safe');

module.exports = {
  IpSafe,
  checkNetworkSafe,
  executeIfSafe
};