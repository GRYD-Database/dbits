import 'dotenv/config';
import {HardhatRuntimeEnvironment, HardhatUserConfig, TaskArguments} from 'hardhat/types';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-contract-sizer';
import {removeConsoleLog} from 'hardhat-preprocessor';

require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-waffle");

export const InfuraToken = process.env.INFURA_TOKEN === undefined ? 'undefined' : process.env.INFURA_TOKEN;
if (InfuraToken === 'undefined') {
  console.log('Please set your INFURA_TOKEN in a .env file');
}

// Set Private RPCs if added, otherwise use Public that are hardcoded in this config

const PRIVATE_RPC_TESTNET = !process.env.PRIVATE_RPC_TESTNET ? undefined : process.env.PRIVATE_RPC_TESTNET;

const walletSecret = process.env.WALLET_SECRET === undefined ? 'undefined' : process.env.WALLET_SECRET;
if (walletSecret === 'undefined') {
  console.log('Please set your WALLET_SECRET in a .env file');
}
const accounts = walletSecret.length === 64 ? [walletSecret] : {mnemonic: walletSecret};

const testnetEtherscanKey = process.env.TESTNET_ETHERSCAN_KEY;

// Config for hardhat.
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  preprocess: {
    eachLine: removeConsoleLog((hre) => hre.network.name !== 'hardhat' && hre.network.name !== 'localhost'),
  },
  namedAccounts: {
    deployer: 0,
    admin: 1
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
      hardfork: 'merge'
    },
    localhost: {
      url: 'http://localhost:8545',
      chainId: 1,
      accounts
    },
    testnet: {
      url: 'https://goerli.infura.io/v3/' + InfuraToken,
      accounts,
      chainId: 5,
      gas: 2100000,
      gasPrice: 8000000000,
    }
  },
  etherscan: {
    apiKey: {
      testnet: testnetEtherscanKey || ''
    },
    customChains: [
      {
        network: 'testnet',
        chainId: 5,
        urls: {
          apiURL: 'https://api-goerli.etherscan.io/api',
          browserURL: 'https://goerli.etherscan.io/'
        }
      }
    ]
  },
  paths: {
    sources: 'src'
  },
  contractSizer: {
    runOnCompile: true
  }
};

export default config;
