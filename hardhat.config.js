require("dotenv").config({ path: ".env.local", override: true });
require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const hardhatNetwork = {
  chainId: 31337,
};

if (process.env.HARDHAT_FORK === "true" && process.env.POLYGON_RPC_URL) {
  hardhatNetwork.forking = {
    url: process.env.POLYGON_RPC_URL,
  };

  if (process.env.FORK_BLOCK_NUMBER) {
    hardhatNetwork.forking.blockNumber = Number(process.env.FORK_BLOCK_NUMBER);
  }
}

const networks = {
  hardhat: hardhatNetwork,
  localhost: {
    url: process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545",
    chainId: 31337,
  },
};

if (process.env.AMOY_RPC_URL && process.env.PRIVATE_KEY) {
  networks.amoy = {
    url: process.env.AMOY_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
  };
}

module.exports = {
  solidity: "0.8.20",
  networks,
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
};
