/**
 * Query result record for a count of addresses by environment and paymentNetwork.
 */
export interface AddressCount {
  paymentNetwork: string
  environment: string
  count: number
}

/**
 * Metrics configuration.
 */
export interface MetricsConfig {
  pushMetrics: boolean
  domain: string | undefined
  gatewayUrl: string
  pushIntervalInSeconds: number
  payIdCountRefreshIntervalInSeconds: number
}
