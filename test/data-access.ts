import { AddressCount } from '../src/types'

/**
 * Mock address counts.
 *
 * @returns An object containing the address type and the count of addresses found in the database.
 */
export async function getAddressCounts(): Promise<AddressCount[]> {
  return [
    {
      paymentNetwork: 'XRPL',
      environment: 'TESTNET',
      count: 1,
    },
  ]
}

/**
 * Mock PayID counts.
 *
 * @returns A number indicating the number of PayIDs in the database.
 */
export async function getPayIdCount(): Promise<number> {
  return 1
}
