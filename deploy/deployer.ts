import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-etherscan';
import hre, {network} from 'hardhat';
import * as fs from 'fs';
import dbitsABI from '../artifacts/src/dbits.sol/Dbits.json';
import {ethers} from 'ethers';
import {InfuraToken} from '../hardhat.config';
import '@nomiclabs/hardhat-etherscan/dist/src/type-extensions';
import '@openzeppelin/hardhat-upgrades';
import {spawnSync} from 'child_process';

const {upgrades} = require("hardhat")

let account: ethers.Wallet;

let configurations: ChainConfig;

interface DeployedContract {
  abi: Array<unknown>;
  bytecode: string;
  address: string;
  block: number;
  url: string;
}

interface DeployedData {
  chainId: number;
  contracts: {
    dbits: DeployedContract;
  };
}

interface ChainConfig {
  chainId?: number;
  networkName: string;
  deployedData: DeployedData;
  url: string;
}

interface Mnemonic {
  mnemonic: string;
}

let networkDeployedData: DeployedData;
try {
  networkDeployedData = require('../' + network.name + '_deployed.json');
} catch (e) {
  networkDeployedData = {
    chainId: network.config.chainId,
    contracts: {
      dbits: {} as DeployedContract,
    },
  } as unknown as DeployedData;
}

const configs: Record<string, ChainConfig> = {
  testnet: {
    chainId: network.config.chainId,
    networkName: network.name,
    deployedData: networkDeployedData,
    url: hre.config.etherscan.customChains[0]['urls']['browserURL'].toString(),
  },
};

const config: ChainConfig = configs[network.name]
  ? configs[network.name]
  : ({
    chainId: network.config.chainId,
    networkName: network.name,
    deployedData: networkDeployedData,
    url: '',
  } as ChainConfig);

const blockChainVendor = hre.network.name;

async function setConfigurations() {
  let wallet: ethers.Wallet;
  if (Array.isArray(hre.network.config.accounts)) {
    if (hre.network.config.accounts.length > 1) {
      throw new Error('only 1 private key expected');
    }
    wallet = new ethers.Wallet(hre.network.config.accounts[0] as string);
  } else if (isMnemonic(hre.network.config.accounts)) {
    wallet = ethers.Wallet.fromMnemonic(hre.network.config.accounts.mnemonic);
  } else {
    throw new Error('unknown type');
  }
  switch (blockChainVendor) {
    case 'testnet':
      account = wallet.connect(new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/' + InfuraToken));
      configurations = configs['testnet'];
      break;
    default:
      account = wallet.connect(hre.ethers.provider);
      configurations = configs['private'];
  }
}

function isMnemonic(param: unknown): param is Mnemonic {
  return typeof param === 'object' && param != null && 'mnemonic' in param;
}

async function main() {
  //set configs
  await setConfigurations()

  let deployed = await JSON.parse(JSON.stringify(config.deployedData).toString());

  // Deploy the Dbits contract and set metadata
  deployed = await deployDBITS(deployed)

  // writer
  await writeFile(deployed)

  if (process.env.MAINNET_ETHERSCAN_KEY || process.env.TESTNET_ETHERSCAN_KEY) {
    console.log('Verifying...');
    await verifier(deployed)
  }
}

async function deployDBITS(deployed: any) {
  //deploy
  console.log('Deploying Dbits contract...');
  const DbitsTokenContract = await new ethers.ContractFactory(dbitsABI.abi, dbitsABI.bytecode).connect(account)
  const DbitsToken = await DbitsTokenContract.deploy();
  console.log('tx hash:' + DbitsToken.deployTransaction.hash);
  await DbitsToken.deployed();
  console.log("Contract deployed to " + DbitsToken.address)
  let deployTx = await DbitsToken.deployTransaction.wait(1);
  return await setMetadata(deployTx, "dbits", deployed, DbitsToken.address, dbitsABI.abi, dbitsABI.bytecode.toString())
}

async function setMetadata(
  deploymentReceipt: any,
  contractName: string,
  deployed: any,
  address: string,
  abi: any,
  bytecode: string) {
  deployed['contracts'][contractName]['abi'] = abi;
  deployed['contracts'][contractName]['bytecode'] = bytecode;
  deployed['contracts'][contractName]['address'] = address;
  deployed['contracts'][contractName]['block'] = deploymentReceipt.blockNumber;
  deployed['contracts'][contractName]['url'] = config.url + "address/" + address;

  return deployed
}

async function writeFile(deployed: any) {
  await fs.writeFileSync(config.networkName + '_deployed.json', JSON.stringify(deployed, null, '\t'));
}

async function verifier(deployedData: DeployedData) {
  await processExecutor(
    deployedData['contracts']['dbits']['address']);
}

async function processExecutor(address: string) {
  const sp = spawnSync('yarn run hardhat verify ' + address + ' --network testnet ', [], {
    timeout: 30000,
    stdio: ['inherit', 'inherit', 'pipe'],
    shell: true,
  });
  if (sp.stderr.toString('utf-8').includes('Already Verified')) {
    console.log('Contract already verified');
  } else if (sp.stderr.toString() === null || sp.stderr.toString() === '') {
    console.log('Contract Verified Successfully');
  } else {
    throw new Error(sp.stderr.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
