import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    xlayerTestnet: {
      url: process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts,
      gasPrice: 1000000000, // 1 Gwei
    },
    xlayerMainnet: {
      url: process.env.XLAYER_MAINNET_RPC || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      xlayerTestnet: process.env.OKLINK_API_KEY || "",
      xlayerMainnet: process.env.OKLINK_API_KEY || "",
    },
    customChains: [
      {
        network: "xlayerTestnet",
        chainId: 1952,
        urls: {
          apiURL: "https://web3.okx.com/explorer/x-layer-testnet/api",
          browserURL: "https://web3.okx.com/explorer/x-layer-testnet",
        },
      },
      {
        network: "xlayerMainnet",
        chainId: 196,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/xlayer/api",
          browserURL: "https://www.okx.com/web3/explorer/xlayer",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
