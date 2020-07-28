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

// TODO: You must implement your own data-access functions to work with your database.
// Below we show two examples pulled from the reference implementation of the PayID
// server ( using knex as our query builder ).
//
// Source : https://github.com/payid-org/payid/blob/master/src/data-access/reports.ts

/**
 * Retrieve count of addresses, grouped by payment network and environment.
 *
 * @returns A list with the number of addresses that have a given (paymentNetwork, environment) tuple,
 *          ordered by (paymentNetwork, environment).
 */
export async function getAddressCounts(): Promise<AddressCount[]> {
  const addressCounts: AddressCount[] = await knex
    .select('address.paymentNetwork', 'address.environment')
    .count('* as count')
    .from<AddressCount>('address')
    .groupBy('address.paymentNetwork', 'address.environment')
    .orderBy(['address.paymentNetwork', 'address.environment'])

  return addressCounts.map((addressCount) => ({
    paymentNetwork: addressCount.paymentNetwork,
    environment: addressCount.environment,
    count: Number(addressCount.count),
  }))
}

/**
 * Retrieve the count of PayIDs in the database.
 *
 * @returns The count of PayIDs that exist for this PayID server.
 */
export async function getPayIdCount(): Promise<number> {
  const payIdCount: number = await knex
    .count('* as count')
    .from<Account>('account')
    .then((record) => {
      return Number(record[0].count)
    })

  return payIdCount
}

/**
 * STARTUP - Now we can create a metrics instance, and start generating & pushing metrics.
 */

// Create metrics instance ( constructs Prometheus gauges )
const metrics = new Metrics(config, getAddressCount, getPayIdCount)

// Start generating PayId count metrics on an interval
metrics.scheduleRecurringMetricsGeneration()

// Start pushing metrics on an interval
metrics.scheduleRecurringMetricsPush()

/**
 * SHUTDOWN - Stop generating metrics ( e.g. On server shutdown / fatal errors ).
 * It is good practice to shut down all timers, as not doing so can prevent Node
 * from exiting.
 */

// Stop recurring metrics generation & push timers
metrics.stopMetrics()

/**
 * RECORDING LOOKUP METRICS - This metrics library also captures & pushes PayID
 * lookup statistics. These are separate from the statistics collected with the
 * data-access functions.
 */

// Record a successful ( true ) or unsuccessful ( false ) PayID lookup
// Call this function after each of those events
//
metrics.recordPayIdLookupResult(true, 'XRPL', 'TESTNET')

// Record an unsuccessful lookup that failed because of a bad accept header
// Call this function after that event
metrics.recordPayIdLookupBadAcceptHeader()

/**
 * PULLING METRICS - Above we set up push metrics, but we can also set up an endpoint
 * to enable pulling metrics from the PayID server.
 */

// Create an express router
const metricsRouter = express.Router()

// Call metrics.getMetrics() when the route is hit
metricsRouter.get(
  '/',
  (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Content-Type', 'text/plain')
    res.send(metrics.getMetrics())
    return next()
  },
)
```

## Legal

By using, reproducing, or distributing this code, you agree to the terms and conditions for use (including the Limitation of Liability) in the [Apache License 2.0](https://github.com/payid-org/metrics/blob/master/LICENSE). If you do not agree, you may not use, reproduce, or distribute the code.
