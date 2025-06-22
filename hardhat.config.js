require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc-amoy.polygon.technology",
      },
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
};
