import 'mocha'
import { assert } from 'chai'

import { AddressCount, Metrics } from '../src'

import config from './config'
import structuredClone from './helpers'

let metrics: Metrics

describe('Push Metrics - scheduleRecurringMetricsGeneration()', function (): void {
  afterEach('', function () {
    metrics.stopMetrics()
  })

  it('publishes all gauges when provided valid functions', async function () {
    const expectedPayIdCount = 5
    const expectedBtcAddressCount = 3
    const expectedXrpAddressCount = 4
    const metricsConfig = structuredClone(config)
    const addressCountFn = async (): Promise<AddressCount[]> => {
      return [
        {
          paymentNetwork: 'BTC',
          environment: 'MAINNET',
          count: expectedBtcAddressCount,
        },
        {
          paymentNetwork: 'XRPL',
          environment: 'MAINNET',
          count: expectedXrpAddressCount,
        },
      ]
    }

    const payIdCountFn = async (): Promise<number> => expectedPayIdCount

    metrics = new Metrics(metricsConfig, addressCountFn, payIdCountFn)
    await metrics.generateAddressCountMetrics()
    await metrics.generatePayIdCountMetrics()
    metrics.scheduleRecurringMetricsGeneration()

    assertMetrics(
      /payid_server_info\{org="example.com",serverAgent="unittest:1.2.3",protocolVersion="1.0.0"\} 1/u,
    )

    assertMetrics(
      new RegExp(
        `actual_payid_count\\{org="example.com"\\} ${expectedPayIdCount}`,
        'u',
      ),
    )

    assertMetrics(
      new RegExp(
        `payid_count\\{paymentNetwork="XRPL",environment="MAINNET",org="example.com"\\} ${expectedXrpAddressCount}`,
        'u',
      ),
    )

    assertMetrics(
      new RegExp(
        `payid_count\\{paymentNetwork="BTC",environment="MAINNET",org="example.com"\\} ${expectedBtcAddressCount}`,
        'u',
      ),
    )
  })
})

/**
 * A helper function that fetches PayID metrics and matches them against
 * expected metrics.
 *
 * @param expectedMetric - The expected metric to match on.
 */
function assertMetrics(expectedMetric: RegExp): void {
  assert.match(metrics.getMetrics(), expectedMetric)
}
