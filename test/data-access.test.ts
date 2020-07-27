import 'mocha'
import { assert } from 'chai'

import { getAddressCounts, getPayIdCount } from './data-access'

describe('Data Access - getPayIdCounts()', function (): void {
  it('getAddressCounts - Returns a result per by unique network and environment', async function () {
    const results = await getAddressCounts()
    const expected = [
      {
        paymentNetwork: 'XRPL',
        environment: 'TESTNET',
        count: 1,
      },
    ]
    assert.deepEqual(results, expected)
  })

  it('getPayIdCount - Returns a count of PayIDs', async function () {
    const payIdCount = await getPayIdCount()
    const expectedPayIdCount = 1

    assert.strictEqual(payIdCount, expectedPayIdCount)
  })
})
