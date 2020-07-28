# `@payid-org/payid-metrics`

![NPM version badge](https://img.shields.io/npm/v/@xpring-eng/logger)

A TypeScript library providing PayID metrics support.

## Usage

```ts
import { Metrics, MetricsConfig, AddressCount } from '@payid-org/payid-metrics'

/**
 * SETUP - To configure a metrics server, you will need to define both a valid configuration
 * and 2 data-access functions (getAddressCount & getPayIdCount) to query your database for
 * these statistics.
 */

/**
 * Metrics configuration.
 */
const config: MetricsConfig = {
  // Whether or not to report PayID server metrics
  pushMetrics: true,

  // Domain name that operates this PayID server
  domain: 'example.com',

  // URL to Xpring Prometheus server Prometheus push gateway
  gatewayUrl: 'https://push00.mon.payid.tech/',

  // How frequently (in seconds) to push metrics to the Prometheus push gateway
  pushIntervalInSeconds: 15,

  // How frequently (in seconds) to refresh the PayID Count report data from the database
  payIdCountRefreshIntervalInSeconds: 60,
}

/**
 * Retrieve count of addresses, grouped by payment network and environment.
 *
 * @returns A list with the number of addresses that have a given (paymentNetwork, environment) tuple,
 *          ordered by (paymentNetwork, environment).
 */
async function getAddressCount(): Promise<AddressCount[]> {
  return [
    {
      paymentNetwork: 'XRPL',
      environment: 'TESTNET',
      count: 10,
    },
  ]
}

/**
 * Retrieve the count of PayIDs in the database.
 *
 * @returns The count of PayIDs that exist for this PayID server.
 */
async function getPayIdCount(): Promise<number> {
  return 1
}

/**
 * PUSHING/GENERATING METRICS - To start pushing metrics, you can create a metrics instance,
 * and schedule recurring timers to generate ( from the data-access functions above ) and
 * push metrics.
 */

// Create metrics instance ( constructs Prometheus gauges )
const metrics = new Metrics(config, getAddressCount, getPayIdCount)

// Start generating PayId count metrics on an interval
metrics.scheduleRecurringMetricsGeneration()

// Start pushing metrics on an interval
metrics.scheduleRecurringMetricsPush()

/**
 * RECORDING LOOKUP METRICS - This metrics library also captures & pushes PayID
 * lookup statistics.
 */

// Record a successful ( true ) or unsuccessful ( false ) PayID lookup
// Call this function after each of those events
metrics.recordPayIdLookupResult(true, 'XRPL', 'TESTNET')

// Record an unsuccessful lookup that failed because of a bad accept header
// Call this function after that event
metrics.recordPayIdLookupBadAcceptHeader()

/**
 * SHUTDOWN - Stop generating metrics ( e.g. On server shutdown / fatal errors ).
 */

// Stop recurring metrics generation & push timers
metrics.stopMetrics()
```

## Legal

By using, reproducing, or distributing this code, you agree to the terms and conditions for use (including the Limitation of Liability) in the [Apache License 2.0](https://github.com/payid-org/metrics/blob/master/LICENSE). If you do not agree, you may not use, reproduce, or distribute the code.
