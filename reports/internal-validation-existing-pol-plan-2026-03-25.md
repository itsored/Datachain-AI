# Internal Validation Plan Using Existing POL

Date: 2026-03-25
Network: Polygon
Scope: Use currently funded wallets plus the deployer's remaining POL. Do not spread gas across wallets `41-150` except optional `dcUSDC` mints that count as token-contract tx.

## Live Balance Snapshot

- Deployer: `1.178287154521916929 POL`
- Wallets `1-20`: `1.461812537658450366 POL`, `3168 dcUSDC`, `596 dcUSDC` allowance
- Wallets `21-40`: `1.571942739820896148 POL`, `1318 dcUSDC`, `928 dcUSDC` allowance
- Wallets `41-150`: `0 POL`, `0 dcUSDC`
- Active datasets: `17`
- Active price band: `4-7 dcUSDC`

## Current Gas Assumptions

- `approve`: `~0.008237196571435 POL`
- `purchase`: `~0.02154343718683 POL`
- `update-price`: `~0.01013808808792 POL`
- `toggle-active`: `~0.01013808808792 POL`
- `withdraw`: `~0.01013808808792 POL`
- Average owner funding gas from the last live funding wave: `~0.005052642932054311 POL` per tx

## Recommended Target

- Marketplace/reputation-heavy target without counting new token mints: `~255 tx`
- Protocol-wide target if small `dcUSDC` mints are counted: `~312 tx`

## Top-Up Plan

Top up these seller wallets to `0.08 POL`:

- `1,2,3,4,7,9,12,13,14,15,16,18,19`

This needs about:

- `0.4223055168193376 POL` sent to wallets
- `13` owner transfer tx
- about `0.065684358116705 POL` owner gas

Top up these buyer wallets to `0.07 POL`:

- `22,23,24,25,26,27,28,31,33,35,36,38,39`

This needs about:

- `0.33508069782939226 POL` sent to wallets
- `13` owner transfer tx
- about `0.065684358116705 POL` owner gas

## Seller Action Targets

After the seller top-ups above, target this seller-side mix:

- Wallet `1`: `8`
- Wallet `2`: `8`
- Wallet `3`: `8`
- Wallet `4`: `8`
- Wallet `5`: `8`
- Wallet `6`: `14`
- Wallet `7`: `8`
- Wallet `8`: `18`
- Wallet `9`: `8`
- Wallet `10`: `12`
- Wallet `11`: `13`
- Wallet `12`: `8`
- Wallet `13`: `8`
- Wallet `14`: `8`
- Wallet `15`: `8`
- Wallet `16`: `8`
- Wallet `17`: `7`
- Wallet `18`: `8`
- Wallet `19`: `8`
- Wallet `20`: `7`

Projected seller-side total:

- `170` tx at target `0.08 POL`
- Suggested mix: `140 update-price`, `20 toggle-active`, `10 withdraw`

## Buyer Action Targets

After the buyer top-ups above, target this buyer-side mix:

- Wallet `21`: `5 purchases`
- Wallet `22`: `3 purchases`
- Wallet `23`: `3 purchases`
- Wallet `24`: `3 purchases`
- Wallet `25`: `3 purchases`
- Wallet `26`: `3 purchases`
- Wallet `27`: `3 purchases`
- Wallet `28`: `3 purchases`
- Wallet `29`: `5 purchases`
- Wallet `30`: `1 approve + 7 purchases`
- Wallet `31`: `3 purchases`
- Wallet `32`: `1 approve + 7 purchases`
- Wallet `33`: `3 purchases`
- Wallet `34`: `4 purchases`
- Wallet `35`: `3 purchases`
- Wallet `36`: `3 purchases`
- Wallet `37`: `1 approve + 7 purchases`
- Wallet `38`: `3 purchases`
- Wallet `39`: `3 purchases`
- Wallet `40`: `1 approve + 7 purchases`

Projected buyer-side total:

- `85` tx
- `81 purchases`
- `4 approvals`

## Optional Mint Layer

If token mint tx should count toward the total, use the remaining deployer POL to mint small variable `dcUSDC` amounts to a slice of the new wallets.

Recommended mint slice:

- Wallets `51-107`

Recommended amount pattern:

- Repeat `1,2,3 dcUSDC` across the wallet slice

Projected mint total:

- `57` token-contract tx
- about `114 dcUSDC` minted total
- about `0.287` deployer POL available after the wallet top-ups above, which is enough for this mint layer at the recent average owner gas cost

## Expected Outcome

Without mint layer:

- `170 seller tx + 85 buyer tx = 255 tx`

With mint layer:

- `170 seller tx + 85 buyer tx + 57 mint tx = 312 tx`

## Recommendation

Use this order:

1. Top up seller wallets listed above.
2. Top up buyer wallets listed above.
3. Run seller maintenance wave first.
4. Run buyer approvals and purchases in parallel.
5. If the goal is protocol-wide tx count rather than just marketplace-style activity, use the optional mint layer last.

This plan keeps the new `100` wallets mostly untouched, preserves the remaining native gas, and gets the highest tx count from the POL already onchain.
