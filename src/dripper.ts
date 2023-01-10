import {ApiPromise, WsProvider, Keyring} from '@polkadot/api'
import BN from 'bn.js'
import {encodeAddress, cryptoWaitReady} from '@polkadot/util-crypto'
import {KeyringPair} from '@polkadot/keyring/types'

let api: ApiPromise | null = null
let fundingAccount: KeyringPair | null = null
let nextNonce: () => number

interface DripStatus {
    success: boolean
    message: string
}

const init = async (
    rpc: string,
    funding_key: string,
) => {
    await cryptoWaitReady()
    const keyring = new Keyring({type: 'sr25519'})
    fundingAccount = keyring.addFromUri(funding_key)

    console.log('funding account:', fundingAccount.address)

    initNetwork(rpc, fundingAccount).then(result => [api, nextNonce] = result);
}

const initNetwork = async (rpc: string, fundingAccount: KeyringPair): Promise<[ApiPromise, () => number]> => {
    const provider = new WsProvider(rpc)
    const api = await ApiPromise.create({provider})
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

    if (api && api.isConnected) {
        const {balances, utility, currencies} = api.tx;

        // TODO: make configurable
        const tx = utility.batchAll([
            balances.transfer(address, new BN(166111111111)), // ACA
            currencies.transfer(address, {Erc20: '0x54a37a01cd75b616d63e0ab665bffdb0143c52ae'}, new BN(11000000000000000)), // DAI
        ]);

        await tx
            .signAndSend(fundingAccount, {nonce: nextNonce()})
            .catch((error) => {
                console.log('FUNDING FAILED', error)
                status.message = 'funding failed, please contact support'
                return status
            });
    }

    status.success = true

    return status
}

export default {
    init,
    drip,
}
