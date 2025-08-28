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

    let hydraDxAddress;
    const addressBytes = Buffer.from(address.slice(2), "hex");

    try {
        if(addressBytes.length === 20) {
            hydraDxAddress = encodeAddress(
                new Uint8Array(
                    Buffer.concat([Buffer.from("ETH\0"), addressBytes, Buffer.alloc(8)]),
                )
            )
        } else {
            hydraDxAddress = encodeAddress(address)
        }

        console.log('dripping to', address, ' => ', hydraDxAddress);

        if (api && api.isConnected) {
            const {currencies, utility} = api.tx;

            // TODO: make configurable
            const tx = utility.batchAll([
                currencies.transfer(hydraDxAddress, "5", new BN('50000000000000')), // DOT
                currencies.transfer(hydraDxAddress, "10", new BN('10000000000')), // USDT
                currencies.transfer(hydraDxAddress, "22", new BN('10000000000')), // USDC
                currencies.transfer(hydraDxAddress, "1000745", new BN('10000000000000000000000')), // sUSDS
                currencies.transfer(hydraDxAddress, "1000625", new BN('10000000000000000000000')), // sUSDe
            ]);

            await tx
                .signAndSend(fundingAccount, {nonce: nextNonce()})
                .catch((error) => {
                    console.log('FUNDING FAILED', error)
                    status.message = 'funding failed, please contact support'
                    return status
                });
        }

    } catch (e) {
        status.message = 'invalid address'
        return status
    }

    status.success = true

    return status
}

export default {
    init,
    drip,
}
