# Local Fork Runbook

This runbook reproduces the current local Polygon-fork pilot environment.

## Prerequisites

- [Datachain-AI](/Users/vicgunga/Gunga/DataChain/Datachain-AI)
- [Datachain-Frontend](/Users/vicgunga/Gunga/DataChain/Datachain-Frontend)
- local env configured in [Datachain-AI/.env.local](/Users/vicgunga/Gunga/DataChain/Datachain-AI/.env.local)

## Start the fork

From [Datachain-AI](/Users/vicgunga/Gunga/DataChain/Datachain-AI):

```bash
npm run fork:node
```

This starts a Hardhat node at `http://127.0.0.1:8545` using the configured Polygon mainnet RPC as a fork source.

For a more stable local replay, pin the upstream Polygon block:

```bash
FORK_BLOCK_NUMBER=<polygon_block_number> npm run fork:node
```

The Hardhat config will pin the fork when `FORK_BLOCK_NUMBER` is set.

## Deploy pilot contracts

```bash
npm run deploy:local
```

Outputs:

- [deployments/localhost.json](/Users/vicgunga/Gunga/DataChain/Datachain-AI/deployments/localhost.json)
- curated seller/buyer addresses
- deployment block for frontend event reads

## Sync frontend env

```bash
npm run sync:frontend-env
```

This writes [Datachain-Frontend/.env.local](/Users/vicgunga/Gunga/DataChain/Datachain-Frontend/.env.local) with:

- localhost RPC
- `chainId=31337`
- deployed contract addresses
- deployment block
- Pinata JWT for the server-side API routes

## Seed the catalog

First validation pass:

```bash
SEED_SOURCE=priority SEED_LIMIT=5 npx hardhat run scripts/seedCatalog.js --network localhost
```

Priority 50:

```bash
npm run seed:priority
```

Full approved catalog:

```bash
npm run seed:approved
```

Seed state files:

- [deployments/localhost-priority-seed-state.json](/Users/vicgunga/Gunga/DataChain/Datachain-AI/deployments/localhost-priority-seed-state.json)
- [deployments/localhost-approved-seed-state.json](/Users/vicgunga/Gunga/DataChain/Datachain-AI/deployments/localhost-approved-seed-state.json)

Current local result:

- `50` priority listings seeded
- `101` additional approved listings seeded
- `151` total listings onchain

## Run the frontend

From [Datachain-Frontend](/Users/vicgunga/Gunga/DataChain/Datachain-Frontend):

```bash
npm run dev
```

Open the app and connect MetaMask to:

- RPC: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Network name: `Local Polygon Fork`

For local testing, import one of the Hardhat accounts printed by `npm run fork:node`.

Recommended roles:

- sellers: accounts `#1`, `#2`, `#3`
- buyers: accounts `#4`, `#5`

## What is live in the local pilot

- `dcUSDC` payment flow with approval + purchase
- multi-buyer marketplace listings
- Pinata-hosted listing metadata JSON
- seeded catalog imported from the curated approved dataset export
- buyer purchase history sourced from chain events
- seller withdrawals in `dcUSDC`
- reward claiming in `RWD`

## Verification commands

From [Datachain-AI](/Users/vicgunga/Gunga/DataChain/Datachain-AI):

```bash
npm test
npm run smoke:local
```

From [Datachain-Frontend](/Users/vicgunga/Gunga/DataChain/Datachain-Frontend):

```bash
npm run build
```

The smoke test writes a verification report to [reports/localhost-smoke-test.md](/Users/vicgunga/Gunga/DataChain/Datachain-AI/reports/localhost-smoke-test.md).
