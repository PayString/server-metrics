import { MetricsConfig } from './types'

/**
 * Checks our metrics configuration to make sure that we are good to go.
 *
 * If metrics cannot be generated, or if push metrics are enabled and metrics could not be pushed,
 * we throw an error.
 *
 * @param config - A configuration object controlling how metrics are pushed and generated.
 *
 * @throws An error if pushing metrics is enabled, but the required configuration to push metrics is missing or malformed.
 */
export default function checkMetricsConfiguration(config: MetricsConfig): void {
  const oneDayInSeconds = 86_400

  if (
    config.payIdCountRefreshIntervalInSeconds <= 0 ||
    config.payIdCountRefreshIntervalInSeconds >= oneDayInSeconds
  ) {
    throw new Error(
      `Invalid PAYID_COUNT_REFRESH_INTERVAL value: "${config.payIdCountRefreshIntervalInSeconds}". Must be a positive number less than 86400 seconds. PayID count metrics will not be generated.`,
    )
  }

  // All config tested after this has to do with pushing metrics
  if (!config.pushMetrics) {
    return
  }

  try {
    // eslint-disable-next-line no-new -- We are using Node's URL library to see if the URL is valid.
    new URL(config.gatewayUrl)
  } catch {
    throw new Error(
      `Push metrics are enabled, but the environment variable PUSH_GATEWAY_URL is not a valid url: "${config.gatewayUrl}".`,
    )
  }

  try {
    // eslint-disable-next-line no-new -- We are using Node's URL library to see if the URL is valid.
    new URL(`https://${config.domain}`)
  } catch {
    throw new Error(
      `Push metrics are enabled, but the environment variable PAYID_DOMAIN is not a valid url: "${config.domain}".`,
    )
  }

  if (
    config.pushIntervalInSeconds <= 0 ||
    config.pushIntervalInSeconds > oneDayInSeconds
  ) {
    throw new Error(
      `Push metrics are enabled, but the environment variable PUSH_METRICS_INTERVAL has an invalid value: "${config.pushIntervalInSeconds}". Must be positive and less than one day in seconds.`,
    )
  }
}
