# Local Pilot Smoke Test

- Timestamp: 2026-03-10T13:46:45.595Z
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Deployment block: 69
- Healthcheck block: 121
- Buyer: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
- Seller: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- Listing ID: 1
- Listing price (dcUSDC): 5.0
- Faucet used: no
- Buyer balance before purchase (dcUSDC): 2500.0
- Buyer balance after purchase (dcUSDC): 2495.0
- Seller pending before withdrawal (dcUSDC): 0.0
- Seller pending after purchase (dcUSDC): 5.0
- Seller balance delta after withdrawal (dcUSDC): 5.0
- Purchase count after test: 1
- Reward distributed (RWD): 250
- Buyer RWD balance after claim: 250
- Seller reputation after rating: 5.00

## Transactions

- Purchase: 0x44bdf1693abd1fd219f1cb1cbe051073f93edb61ccfbf85eb98b44dec074092a
- Withdraw: 0x65a46d1e886015c7c7a62d69f5a54fe3629e9643e81f05284047164366f9ff02
- Reward distribute: 0x7272468d52058243dd0d4d28391afc93a6b76f2f0aa076c36a2196d6d1ced9ce
- Reward claim: 0x55d8332e065ea7f0a9f836cf50a33422ca1d5f108d306633b9d260c9b1ee3975
- Rating: 0x6ef37c6f910839570fb5cb52fc4acc9bb9355e93f1491919a4a104594f658d61

## Result

Pilot smoke test passed: buyer funded, approved dcUSDC, purchased a seeded dataset, seller withdrew proceeds, reward was distributed and claimed, and seller reputation was updated.
