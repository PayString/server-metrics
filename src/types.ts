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
  // serverAgent is an optional field to identify the PayID server implementation that's reporting the metrics.
  // For example the PayID reference implementation sets this like @payid-org/payid:1.0.0
  readonly serverAgent?: string
  readonly payIdProtocolVersion: string
}
