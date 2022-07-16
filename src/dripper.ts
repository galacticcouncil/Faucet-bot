import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import BN from 'bn.js'
import { encodeAddress, cryptoWaitReady } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'

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
  const keyring = new Keyring({ type: 'sr25519' })
  fundingAccount = keyring.addFromUri(funding_key)

  initNetwork(testnet_rpc, fundingAccount).then(([api, nextNonce]) => {
    testnet_api = api;
    nextTestnetNonce = nextNonce;
  })
  initNetwork(rococo_rpc, fundingAccount).then(([api, nextNonce]) => {
    rococo_api = api;
    nextRococoNonce = nextNonce;
  })
}

const initNetwork = async (rpc: string, fundingAccount: KeyringPair): Promise<[ApiPromise, () => number]> => {
  const provider = new WsProvider(rpc)
  const api = await ApiPromise.create({ provider })
  const [chain, version] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.version(),
  ])

  console.log(
      `connected to ${rpc} (${chain} ${version})`,
  )

  let currentNonce = await api.rpc.system
      .accountNextIndex(fundingAccount.address)
      .then(n => n.toNumber())
  const nextNonce = () => currentNonce++

  return [api, nextNonce];
}

const drip = async (address: string): Promise<DripStatus> => {
  const status: DripStatus = {
    success: false,
    message: '',
  }
  if (!fundingAccount) {
    status.message = 'Bot API not initialized'
    return status
  }

  try {
    const encodedAddress = encodeAddress(address)
  } catch (e) {
    status.message = 'invalid address'
    return status
  }

  console.log('dripping to', address)

  if (testnet_api && testnet_api.isConnected) {
    // Transfer BSX
    const testnet_transfer_native = testnet_api.tx.balances.transfer(
        address,
        new BN('100000000000000000'),
    )

    // Transfer KSM(FAKE-WND)
    const testnet_transfer_relay = testnet_api.tx.tokens.transfer(
        address,
        new BN('1'),
        new BN('1000000000000'),
    )

    await testnet_transfer_native
        .signAndSend(fundingAccount, {nonce: nextTestnetNonce()})
        .catch((error) => {
          console.log('FUNDING FAILED', error)
          status.message = 'funding failed, please contact support'
          return status
        })

    await testnet_transfer_relay
        .signAndSend(fundingAccount, {nonce: nextTestnetNonce()})
        .catch((error) => {
          console.log('FUNDING FAILED', error)
          status.message = 'funding failed, please contact support'
          return status
        })
  }

  if (rococo_api && rococo_api.isConnected) {
    // Transfer BSX
    const rococo_transfer_native = rococo_api.tx.balances.transfer(
        address,
        new BN('100000000000000000'),
    )

    // Transfer KSM(FAKE-ROC)
    const rococo_transfer_relay = rococo_api.tx.tokens.transfer(
        address,
        new BN('5'),
        new BN('1000000000000'),
    )

    await rococo_transfer_native
        .signAndSend(fundingAccount, {nonce: nextRococoNonce()})
        .catch((error) => {
          console.log('FUNDING FAILED', error)
          status.message = 'funding failed, please contact support'
          return status
        })

    await rococo_transfer_relay
        .signAndSend(fundingAccount, {nonce: nextRococoNonce()})
        .catch((error) => {
          console.log('FUNDING FAILED', error)
          status.message = 'funding failed, please contact support'
          return status
        })
  }

  status.success = true

  return status
}

export default {
  init,
  drip,
}
