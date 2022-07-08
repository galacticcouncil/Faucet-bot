import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import BN from 'bn.js'
import { encodeAddress, cryptoWaitReady } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'
import { Index } from '@polkadot/types/interfaces'
import { system } from '@polkadot/types/interfaces/definitions'

let testnet_api: ApiPromise | null = null
let rococo_api: ApiPromise | null = null
let fundingAccount: KeyringPair | null = null
let nextTestnetNonce: () => number
let nextRococoNonce: () => number

interface DripStatus {
  success: boolean
  message: string
}

const init = async (
  testnet_rpc: string,
  rococo_rpc: string,
  funding_key: string,
) => {
  await cryptoWaitReady()
  const testnet_provider = new WsProvider(testnet_rpc)
  const rococo_provider = new WsProvider(rococo_rpc)
  const keyring = new Keyring({ type: 'sr25519' })
  testnet_api = await ApiPromise.create({ provider: testnet_provider })
  rococo_api = await ApiPromise.create({ provider: rococo_provider })

  const [testnet_chain, testnet_nodeVersion] = await Promise.all([
    testnet_api.rpc.system.chain(),
    testnet_api.rpc.system.version(),
  ])

  const [rococo_chain, rococo_nodeVersion] = await Promise.all([
    rococo_api.rpc.system.chain(),
    rococo_api.rpc.system.version(),
  ])

  console.log(
    `connected to testnet ${testnet_rpc} (${testnet_chain} ${testnet_nodeVersion})`,
  )
  console.log(
    `connected to rococo ${rococo_rpc} (${rococo_chain} ${rococo_nodeVersion})`,
  )

  fundingAccount = keyring.addFromUri(funding_key)

  let currentTestnetNonce = await testnet_api.rpc.system
    .accountNextIndex(fundingAccount.address)
    .then((n) => n.toNumber())
  nextTestnetNonce = () => currentTestnetNonce++

  let currentRococoNonce = await rococo_api.rpc.system
    .accountNextIndex(fundingAccount.address)
    .then((n) => n.toNumber())
  nextRococoNonce = () => currentRococoNonce++
}

const drip = async (address: string): Promise<DripStatus> => {
  const status: DripStatus = {
    success: false,
    message: '',
  }
  if (!testnet_api || !rococo_api || !fundingAccount) {
    status.message = 'Bot API not initialized'
    return status
  }
  if (!rococo_api.isConnected || !testnet_api.isConnected) {
    status.message = 'Bot API connection error'
    return status
  }

  try {
    const encodedAddress = encodeAddress(address)
  } catch (e) {
    status.message = 'invalid address'
    return status
  }

  console.log('dripping to', address)

  const testnet_transfer = testnet_api.tx.balances.transfer(
    address,
    new BN('10000000000000000'),
  )

  const rococo_transfer = rococo_api.tx.balances.transfer(
    address,
    new BN('10000000000000000'),
  )

  await testnet_transfer
    .signAndSend(fundingAccount, { nonce: nextTestnetNonce() })
    .catch((error) => {
      console.log('FUNDING FAILED', error)
      status.message = 'funding failed, please contact support'
      return status
    })

  await rococo_transfer
    .signAndSend(fundingAccount, { nonce: nextRococoNonce() })
    .catch((error) => {
      console.log('FUNDING FAILED', error)
      status.message = 'funding failed, please contact support'
      return status
    })

  status.success = true

  return status
}

export default {
  init,
  drip,
}
