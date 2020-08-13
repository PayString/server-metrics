import { hostname } from 'os'

import { Counter, Gauge, Pushgateway, Registry } from 'prom-client'

import checkMetricsConfiguration from './check'
import logger from './logger'
import { AddressCount, MetricsConfig } from './types'

/**
 * A singleton class that holds various metrics related state and functionality.
 *
 * Used to create a metrics object that can start recurring metrics generation,
 * send metrics to Prometheus, generate metrics for the /metrics endpoint,
 * and shut down the recurring metrics Timeouts.
 */
export default class Metrics {
  // Custom Prometheus registries.
  // The default registry gets used for other metrics that we don't want to collect from partners, like memory usage.
  //
  // We need separate registries so the gauge metrics need to be reported under a common org grouping,
  // so that they are treated as an absolute value. Lookup metrics need to be reported under a specific instance
  // name so multiple counters get added up. (In scenarios where you are running multiple PayID servers).
  private readonly payIdLookupCounterRegistry: Registry
  private readonly payIdGaugeRegistry: Registry

  /** Prometheus Counter reporting the number of PayID lookups. */
  private readonly payIdLookupCounter: Counter<
    'paymentNetwork' | 'environment' | 'org' | 'result'
  >

  /** Prometheus Gauge for reporting the current count of addresses by [network, environment, org]. */
  private readonly addressGauge: Gauge<'paymentNetwork' | 'environment' | 'org'>

  /** Prometheus Gauge for reporting the current count of PayIDs by org. */
  private readonly payIdGauge: Gauge<'org'>

  /** Prometheus Gauge for reporting the current count of PayIDs by org. */
  private readonly serverInfoGauge: Gauge<
    'org' | 'serverAgent' | 'protocolVersion'
  >

  // These are Timeouts for generating metrics on a recurring basis.
  // To shut down the app properly, we need to clean these up as we shut down.
  private recurringMetricsPushTimeout?: NodeJS.Timeout
  private recurringMetricsTimeout?: NodeJS.Timeout

  // These are passed in from the constructor
  private readonly config: MetricsConfig
  private readonly getAddressCounts: () => Promise<AddressCount[]>
  private readonly getPayIdCount: () => Promise<number>

  /**
   * Create a new Metrics instance.
   *
   * @param config - The metrics configuration object.
   * @param addressCountFn - A function to retrieve count of addresses, grouped by payment network and environment.
   * @param payIdCountFn - A function to retrieve the count of PayIDs in the database.
   */
  public constructor(
    config: MetricsConfig,
    addressCountFn: () => Promise<AddressCount[]>,
    payIdCountFn: () => Promise<number>,
  ) {
    this.getAddressCounts = addressCountFn
    this.getPayIdCount = payIdCountFn
    this.config = config

    this.payIdLookupCounterRegistry = new Registry()
    this.payIdGaugeRegistry = new Registry()

    this.payIdLookupCounter = new Counter({
      name: 'payid_lookup_request',
      help: 'count of requests to lookup a PayID',
      labelNames: ['paymentNetwork', 'environment', 'org', 'result'],
      registers: [this.payIdLookupCounterRegistry],
    })

    this.addressGauge = new Gauge({
      // This should really be address_count, but changing it now would break metrics,
      // so we're leaving this as is.
      name: 'payid_count',
      help: 'count of addresses by (paymentNetwork, environment)',
      labelNames: ['paymentNetwork', 'environment', 'org'],
      registers: [this.payIdGaugeRegistry],
    })

    this.payIdGauge = new Gauge({
      name: 'actual_payid_count',
      help: 'count of total PayIDs',
      labelNames: ['org'],
      registers: [this.payIdGaugeRegistry],
    })

    this.serverInfoGauge = new Gauge({
      name: 'payid_server_info',
      help: 'version information for server',
      labelNames: ['org', 'serverAgent', 'protocolVersion'],
      registers: [this.payIdGaugeRegistry],
    })
  }

  /**
   * Tells you whether metrics are currently running.
   *
   * @returns A boolean indicating whether metrics are currently running.
   */
  public areMetricsRunning(): boolean {
    return (
      Boolean(this.recurringMetricsPushTimeout) ||
      Boolean(this.recurringMetricsTimeout)
    )
  }

  /**
   * Attempt to schedule a recurring metrics push to the metrics gateway URL.
   * Configured through the environment/defaults set in the PayID app config.
   */
  // eslint-disable-next-line max-lines-per-function -- Prometheus library is verbose.
  public scheduleRecurringMetricsPush(): void {
    if (!this.config.pushMetrics) {
      return
    }

    checkMetricsConfiguration(this.config)

    const payIdLookupCounterGateway = new Pushgateway(
      this.config.gatewayUrl,
      [],
      this.payIdLookupCounterRegistry,
    )

    const payIdGaugeGateway = new Pushgateway(
      this.config.gatewayUrl,
      [],
      this.payIdGaugeRegistry,
    )

    this.recurringMetricsPushTimeout = setInterval(() => {
      // Use 'pushAdd' because counts are additive. You want all values over time from multiple servers.
      // You don’t want the lookup count on one server to overwrite the running totals.
      payIdLookupCounterGateway.pushAdd(
        {
          jobName: 'payid_counter_metrics',
          groupings: {
            instance: `${String(this.config.domain)}_${hostname()}_${
              process.pid
            }`,
          },
        },
        (err, _resp, _body): void => {
          if (err) {
            logger.warn('counter metrics push failed with ', err)
          }
        },
      )

      // Use push because we want the value to overwrite (only care about the current PayID count)
      payIdGaugeGateway.push(
        {
          jobName: 'payid_gauge_metrics',
          groupings: {
            instance: String(this.config.domain),
          },
        },
        (err, _resp, _body): void => {
          if (err) {
            logger.warn('gauge metrics push failed with ', err)
          }
        },
      )
    }, this.config.pushIntervalInSeconds * 1000)
  }

  /**
   * Set a recurring timer that will generate PayID count metrics every PAYID_COUNT_REFRESH_INTERVAL seconds.
   */
  public scheduleRecurringMetricsGeneration(): void {
    checkMetricsConfiguration(this.config)

    const refreshIntervalInSeconds = this.config
      .payIdCountRefreshIntervalInSeconds

    // Generate the metrics immediately so we don't wait for the interval
    this.generateAddressCountMetrics().catch((err) =>
      logger.warn('Failed to generate initial address count metrics', err),
    )
    this.generatePayIdCountMetrics().catch((err) =>
      logger.warn('Failed to generate initial PayID count metrics', err),
    )

    this.updateInfoGauge()

    this.recurringMetricsTimeout = setInterval(() => {
      this.generateAddressCountMetrics().catch((err) =>
        logger.warn('Failed to generate scheduled address count metrics', err),
      )
      this.generatePayIdCountMetrics().catch((err) =>
        logger.warn('Failed to generate scheduled PayID count metrics', err),
      )
    }, refreshIntervalInSeconds * 1000)
  }

  /**
   * Cleans up the Timeouts we use to generate metrics on a recurring schedule.
   */
  public stopMetrics(): void {
    if (this.recurringMetricsTimeout?.hasRef()) {
      clearInterval(this.recurringMetricsTimeout.ref())
    }

    if (this.recurringMetricsPushTimeout?.hasRef()) {
      clearInterval(this.recurringMetricsPushTimeout.ref())
    }
  }

  /**
   * Increment a Prometheus Counter for every PayID lookup (public API).
   *
   * Segregated by whether the lookup was successful or not, and [paymentNetwork, environment].
   *
   * @param found - Whether the PayID lookup was successful or not.
   * @param paymentNetwork - The payment network of the lookup.
   * @param environment - The environment of the lookup.
   */
  public recordPayIdLookupResult(
    found: boolean,
    paymentNetwork: string,
    environment = 'null',
  ): void {
    this.payIdLookupCounter.inc(
      {
        paymentNetwork,
        environment,
        org: this.config.domain,
        result: found ? 'found' : 'not_found',
      },
      1,
    )
  }

  /**
   * Record a PayID lookup that failed due to a bad accept header.
   */
  public recordPayIdLookupBadAcceptHeader(): void {
    // TODO:(hbergren) Would we ever want to record the bad accept header here?
    this.payIdLookupCounter.inc(
      {
        paymentNetwork: 'unknown',
        environment: 'unknown',
        org: this.config.domain,
        result: 'error: bad_accept_header',
      },
      1,
    )
  }

  /**
   * Get PayID metrics from the registry.
   *
   * @returns A string representation of metrics.
   */
  public getMetrics(): string {
    return (
      this.payIdLookupCounterRegistry.metrics() +
      this.payIdGaugeRegistry.metrics()
    )
  }

  /** Generates the count of addresses grouped by [paymentNetwork, environment]. */
  public async generateAddressCountMetrics(): Promise<void> {
    const addressCounts = await this.getAddressCounts()

    // Set the address count for a given [paymentNetwork, environment] tuple.
    addressCounts.forEach((addressCount) => {
      this.addressGauge.set(
        {
          paymentNetwork: addressCount.paymentNetwork,
          environment: addressCount.environment,
          org: this.config.domain,
        },
        addressCount.count,
      )
    })
  }

  /** Generates the count of PayIDs. */
  public async generatePayIdCountMetrics(): Promise<void> {
    const payIdCount = await this.getPayIdCount()

    this.payIdGauge.set(
      {
        org: this.config.domain,
      },
      payIdCount,
    )
  }

  /**
   * Updates the serverInfoGauge with the current configuration.
   */
  private updateInfoGauge(): void {
    const serverAgent = this.config.serverAgent ?? 'unknown'
    const protocolVersion = this.config.payIdProtocolVersion
    this.serverInfoGauge.set(
      {
        org: this.config.domain,
        serverAgent,
        protocolVersion,
      },
      1,
    )
  }
}
