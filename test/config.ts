/**
 * Test metrics configuration.
 */
const config = {
  // Whether or not to report PayID server metrics
  pushMetrics: true,

  // Domain name that operates this PayID server.
  domain: 'example.com',

  // URL to Xpring Prometheus server Prometheus push gateway
  gatewayUrl: 'https://push00.mon.payid.tech/',

  // How frequently (in seconds) to push metrics to the Prometheus push gateway
  pushIntervalInSeconds: 15,

  // How frequently (in seconds) to refresh the PayID Count report data from the database
  payIdCountRefreshIntervalInSeconds: 60,
}

export default config
