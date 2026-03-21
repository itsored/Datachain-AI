# DataChain AI
## Internal Security Review

**Prepared For:** DataChain AI  
**Prepared By:** Internal Security Review Team  
**Review Type:** Internal security assessment of smart contracts and live deployment posture  



## Executive Summary

The DataChain AI smart contract system presents a compact and intentionally narrow attack surface consisting of four primary Solidity contracts: `Marketplace`, `Reputation`, `Incentives`, and the in-house USD settlement token `DataChain USD Coin (dcUSDC)`. The assessed contracts are readable, make restrained use of external dependencies, and rely on modern Solidity compiler protections together with well-known OpenZeppelin libraries.

From a code-quality and implementation perspective, the review found the core marketplace flow to be generally well structured. In particular, the `Marketplace` contract uses a pull-based withdrawal model, validates seller and buyer permissions, and avoids unnecessary complexity in fund accounting. The `Reputation` contract enforces verified-purchase gating and prevents duplicate ratings per dataset. Across the scoped code review, no critical- or high-severity logic vulnerabilities were identified.

The principal residual risks are not low-level arithmetic or reentrancy defects, but rather deployment-model and operational trust assumptions. Most notably, the live Polygon deployment currently settles against a project-issued in-house USD token with privileged issuance controls and a public user-funding path, and privileged contract ownership remains concentrated in a single externally owned account. These issues are material for a public-network deployment, but they are remediable and do not detract from the otherwise straightforward and reviewable nature of the core contract logic.

Overall, the system is in a reasonable position for an internal pilot-stage release, provided that the current deployment is clearly labeled as such. Before the system is presented for final production sign-off, we recommend replacing pilot-only token mechanics, migrating privileged roles to a multisig, and adding a stronger incident-response control surface.

## Assessment Summary

| Metric | Result |
| --- | --- |
| Contracts Reviewed | 4 |
| Critical Findings | 0 |
| High Findings | 0 |
| Medium Findings | 2 |
| Low Findings | 1 |
| Informational Notes | 2 |

## Scope

The following files and deployment artifacts were included in scope:

- `Datachain-AI/contracts/Marketplace.sol`
- `Datachain-AI/contracts/Reputation.sol`
- `Datachain-AI/contracts/Incentives.sol`
- In-house USD settlement token contract implementation
- `Datachain-AI/deployments/polygon.json`
- `Datachain-AI/test/ContractsFullCoverage.test.js`
- `Datachain-AI/test/Marketplace.test.js`

The following were reviewed only for supporting context and were not treated as primary assurance artifacts:

- `Datachain-AI/scripts/deploy.js`
- `Datachain-AI/CONTRACTS_API.md`
- `Datachain-AI/LOCAL_FORK_RUNBOOK.md`

The frontend, API routes, Pinata configuration, wallet UX, infrastructure hardening, and organizational key-management procedures were outside the primary code-review scope except where they directly informed contract risk.

## Methodology

The review methodology combined the following workstreams:

1. Manual line-by-line review of the Solidity contracts in scope.
2. Validation of authorization boundaries, state transitions, and fund flows.
3. Review of deployment manifests and live Polygon deployment addresses.
4. Local execution of the unit and integration-style Hardhat test suite.
5. Local coverage analysis using `solidity-coverage`.
6. Read-only live onchain queries against the Polygon deployment to confirm ownership, token wiring, and observed deployment state.


## System Overview

### Architecture

The current protocol design is intentionally simple:

- `Marketplace` manages listing creation, purchasing, seller-controlled listing status, seller-controlled price updates, and seller withdrawals.
- `Reputation` consumes marketplace purchase state to gate ratings and maintain seller reputation aggregates.
- `Incentives` tracks pending rewards and mints an ERC-20 reward token upon claim.
- `DataChain USD Coin (dcUSDC)` acts as the payment token for marketplace purchases.

### Design Strengths

The following strengths were observed during review:

- The contract surface area is small and easy to reason about.
- `Marketplace` uses pull-based withdrawals, reducing direct payout complexity.
- `Marketplace.withdraw()` clears state before the external token transfer, which is the preferable ordering for this code path.
- `Reputation` checks both dataset existence and verified purchase state before accepting ratings.
- Duplicate seller rating for the same dataset is prevented.
- The contracts rely on Solidity `0.8.20`, benefiting from built-in overflow and underflow checks.
- OpenZeppelin components are used for ERC-20 handling and ownership patterns.

## Verification Performed

### Test Execution

The following command was executed locally:

```bash
npm test
```

Result:

- `30` tests passed
- No failing tests were observed during the review run

### Coverage Execution

The following command was executed locally:

```bash
npx hardhat coverage
```


### Live Deployment Observations

 Polygon queries were performed against the deployment recorded in `Datachain-AI/deployments/polygon.json`.

Observed facts:

- Deployment network: Polygon (`chainId = 137`)
- `Marketplace.paymentToken()` resolves to the deployed `DataChain USD Coin (dcUSDC)` address
- `DataChain USD Coin (dcUSDC)` owner resolves to `0xDd7f982e25006541dA9cE25ade452013884A844c`
- `Incentives.owner()` resolves to `0xDd7f982e25006541dA9cE25ade452013884A844c`
- The owner address has no bytecode deployed and is therefore an externally owned account rather than a multisig contract wallet
- `Marketplace.datasetCount()` returned `25`


These observations support the view that the Polygon deployment is presently operating as a limited pilot rather than a fully matured production system with substantial economic activity.

## Severity Definition

| Severity | Description |
| --- | --- |
| Critical | Direct loss of funds or complete protocol compromise likely under realistic conditions |
| High | Serious loss of funds, severe control failure, or major integrity breakdown |
| Medium | Meaningful security, trust, or operational risk requiring remediation before production promotion |
| Low | Limited impact issue or control gap that should be improved as the system matures |
| Informational | Best-practice note, clarity improvement, or non-blocking enhancement |

## Findings Overview

| ID | Title | Severity | Status |
| --- | --- | --- | --- |
| M-01 | Mainnet deployment uses an in-house payment token with centrally managed issuance controls | Medium | Open |
| M-02 | Privileged roles remain concentrated in a single externally owned account | Medium | Open |
| L-01 | Core live contracts do not expose an emergency pause mechanism | Low | Open |

## Detailed Findings

### M-01 Mainnet deployment uses an in-house payment token with centrally managed issuance controls

**Severity:** Medium  
**Status:** Open  
**Affected Components:** `DataChain USD Coin (dcUSDC)`, `Marketplace`, live Polygon deployment

#### Description

The live Polygon deployment recorded in `Datachain-AI/deployments/polygon.json` wires the `Marketplace` contract to the deployed `DataChain USD Coin (dcUSDC)` contract. The token implementation exposes both owner-controlled issuance and a public user-funding path intended to support onboarding and controlled usage:

- privileged issuance remains restricted to the owner
- a public user-funding path permits controlled user access to settlement balances

This is acceptable in a  pilot environment where the payment asset is understood to be non-economic. However, once the deployment is framed as a production mainnet marketplace handling real user value, these mechanics materially weaken the trust model of the system. 

The marketplace implementation itself is straightforward and sound under the assumption that the payment token has a meaningful and appropriately controlled issuance model. 

#### Impact

Under the present Polygon deployment model:

- payment balances do not represent scarce or credibly neutral settlement value
- purchase-derived reputation can be influenced at low cost
- external reviewers may reasonably classify the deployment as pilot/beta rather than production-grade financial infrastructure

#### Recommendation

Before seeking production sign-off:

1. Replace `DataChain USD Coin (dcUSDC)` with a canonical external payment asset or harden the in-house token for production use without public funding endpoints.
2. If a project-issued payment asset is required, deploy a separate production token contract with issuance controls aligned to the intended trust model.
3. Maintain a strict separation between pilot funding controls and public production deployments.


#### References

- In-house USD token contract implementation
- Marketplace payment token configuration
- Polygon deployment manifest

### M-02 Privileged roles remain concentrated in a single externally owned account

**Severity:** Medium  
**Status:** Open  
**Affected Components:** `DataChain USD Coin (dcUSDC)`, `Incentives`, live Polygon deployment

#### Description

Two privileged surfaces remain active in the current deployment:

- `DataChain USD Coin (dcUSDC)` issuance and user-funding controls
- `Incentives.distributeReward()`

Direct read-only onchain queries confirmed that the owner of both `DataChain USD Coin (dcUSDC)` and `Incentives` is `0xDd7f982e25006541dA9cE25ade452013884A844c`. Additional bytecode inspection confirmed that this address is an externally owned account rather than a contract wallet or multisig.

For an internal pilot, a single-key owner may be acceptable temporarily. For a public deployment, however, concentrated control over minting and rewards distribution materially increases operational risk. A compromised or unavailable owner key could impact issuance integrity, reward distribution, or incident response timing. Even absent compromise, single-operator privilege concentration increases reviewer concern and weakens external assurance posture.

#### Impact

If the privileged owner key is compromised, lost, or misused:

- additional payment tokens can be minted
- user-funding controls can be altered
- reward accounting can be manipulated through new reward distribution
- incident handling is dependent on a single operator rather than shared governance

#### Recommendation

1. Transfer ownership of privileged contracts to a multisig before production sign-off.
2. Define and document role separation for issuance, reward operations, and emergency response.
3. Maintain a written key-rotation and incident-handling procedure.
4. Consider a timelock for non-emergency configuration changes if governance complexity increases.

#### References

- In-house USD token ownership controls
- Incentives ownership controls
- Polygon deployment manifest
- Onchain owner verification performed March 21, 2026

### L-01 Core live contracts do not expose an emergency pause mechanism

**Severity:** Low  
**Status:** Open  
**Affected Components:** `Marketplace`, `Reputation`

#### Description

The core public contracts do not implement a protocol-level emergency stop or circuit breaker. Sellers can deactivate their own listings individually through `setDatasetActive`, but there is no system-wide mechanism to pause new purchases or rating submissions in response to an incident affecting shared logic, token integrations, or offchain metadata dependencies.

This is not a flaw in the normal transaction path and is understandable in a deliberately minimal MVP. Nevertheless, once a contract is deployed on a public network, the lack of an emergency control can lengthen containment time if a security issue, integration mistake, or unexpected economic abuse is discovered.

#### Impact

In a live incident scenario:

- new purchases may continue while remediation is coordinated
- containment is dependent on user-by-user or seller-by-seller action
- response options are narrower than they would be with an explicit protocol pause path

#### Recommendation

1. Add a narrowly scoped pause mechanism for the highest-risk user actions such as purchases.
2. If minimizing trust is a priority, document the governance and activation rules clearly so the pause power is transparent and bounded.
3. At minimum, prepare an offchain incident runbook that explains how affected listings will be disabled rapidly if a shared issue is identified.

#### References

- `Datachain-AI/contracts/Marketplace.sol:44-125`
- `Datachain-AI/contracts/Reputation.sol:43-107`

## Informational Notes

### I-01 Core contract logic is concise and reviewable

The limited contract count and low-complexity state model materially improve auditability. The review did not identify classes of defects often associated with more complex systems, such as upgradeability storage collisions, delegatecall abuse, signature replay issues, or complex liquidation math errors.

### I-02 Coverage quality is good for the current scope

The test suite provides strong statement and line coverage for the current contract set. As the system moves closer to production, the next improvement step should be invariant-style testing and additional branch coverage for negative paths and constructor assumptions.

## Conclusion

The DataChain AI contracts reviewed in this engagement demonstrate a solid internal foundation. The code is intentionally simple, uses established libraries. No critical or high-severity code vulnerabilities were identified in the scoped smart contract logic, which is a positive outcome for a pilot-stage protocol.

The remaining issues are concentrated in deployment posture rather than core correctness. Specifically, the public Polygon deployment still reflects pilot-era assumptions around payment token issuance and owner control. These issues should be addressed before the system is positioned as production-grade or before requesting final external sign-off.

Subject to remediation of the issues described in this report, the project appears well positioned for a formal third-party audit engagement. In our view, the codebase is sufficiently compact and structured to benefit from a targeted external review once the production deployment model is finalized.

## Recommended Next Steps

1. Replace or harden the in-house settlement token controls for any production-facing public deployment.
2. Move privileged ownership to a multisig.
3. Add an emergency pause or clearly documented incident-control alternative.
4. Expand testing with invariants and additional branch coverage.
5. Freeze contract scope and commission an external third-party audit once the production deployment model is finalized.

## Appendix A: Reviewed Addresses

| Component | Address |
| --- | --- |
| DataChain USD Coin (dcUSDC) | `0x76A68ee8516e95517d5B43adC38feb508b00A500` |
| Marketplace | `0xfff97580aC773Ed97D4aFd0C3f91Bd45716F861c` |
| Reputation | `0x8A3bAC0b80d9603EDf514eb016f36d58561D5388` |
| Incentives | `0x35002f72b78182B6DAE1E47B6A7949795197168E` |
| Observed Privileged Owner | `0xDd7f982e25006541dA9cE25ade452013884A844c` |


