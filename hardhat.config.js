require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    // hardhat: {
    //   // forking: {
    //   //   url: "https://rpc-amoy.polygon.technology",
    //   // },
    // },
    amoy: {
      url: "https://ancient-cosmopolitan-log.matic-amoy.quiknode.pro/fb1a4f33baf2aded83137f9d4a71e1bb3a25b0ff/",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
};
