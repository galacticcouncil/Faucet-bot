import { ApiPromise, WsProvider, Keyring } from '@polkadot/api'
import BN from 'bn.js'
import { encodeAddress, cryptoWaitReady } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'

let api: ApiPromise | null = null
let fundingAccount: KeyringPair | null = null

interface DripStatus {
  success: boolean
  message: string
}

const init = async (rpc: string, funding_key: string) => {
  await cryptoWaitReady()
  const provider = new WsProvider(rpc)
  const keyring = new Keyring({ type: 'sr25519' })
  api = await ApiPromise.create({ provider })

  const [chain, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.version(),
  ])

  console.log(`connected to ${rpc} (${chain} ${nodeVersion})`)

  fundingAccount = keyring.addFromUri(funding_key)

  console.log('drip account:', fundingAccount.address)
}

const drip = async (address: string): Promise<DripStatus> => {
  const status: DripStatus = {
    success: false,
    message: '',
  }
  if (!api || !fundingAccount) {
    status.message = 'Bot API not initialized'
    return status
  }
  if (!api.isConnected) {
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

  const transfer = api.tx.balances.transfer(
    address,
    new BN('10000000000000000'),
  )
  await transfer.signAndSend(fundingAccount).catch((error) => {
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
