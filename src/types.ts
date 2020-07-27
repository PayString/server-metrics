/**
 * Query result record for a count of addresses by environment and paymentNetwork.
 */
export interface AddressCount {
  readonly paymentNetwork: string
  readonly environment: string
  readonly count: number
}

/**
 * Metrics configuration.
 */
export interface MetricsConfig {
  readonly pushMetrics: boolean
  readonly domain: string
  readonly gatewayUrl: string
  readonly pushIntervalInSeconds: number
  readonly payIdCountRefreshIntervalInSeconds: number
}
