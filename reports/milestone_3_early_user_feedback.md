# Milestone 3 Early User Feedback and Feature Refinements



## 1. Purpose

This document addresses the Milestone 3 requirement to summarize feedback collected from early users and to document the feature refinements made as a result.

Because the platform is still in an early pilot stage, the feedback summarized here is primarily qualitative rather than statistically significant. It consolidates input gathered during:

- early contributor onboarding conversations
- direct product walkthroughs with prospective data providers and AI developers
- wallet connection and transaction support interactions
- observation of pilot usage on the live platform
- internal review of friction points encountered during marketplace seeding and pilot testing

## 2. Summary

The feedback themes were consistent across early pilot interactions:

- users wanted lower-friction wallet connection, especially on mobile
- buyers wanted more context before purchasing a dataset
- participants wanted stronger trust signals around sellers and listing quality
- users needed clearer post-purchase outcomes and account visibility
- data providers needed a simpler listing flow with better metadata capture
- early marketplace participants wanted a more curated and searchable initial catalog

In response, Milestone 3 refinements focused on usability, trust, and catalog quality rather than major protocol redesign.

## 3. Feedback Themes and Refinements

| Theme | Early User Feedback | Refinements Implemented During Milestone 3 | Outcome |
| --- | --- | --- | --- |
| Wallet onboarding | Users found wallet connection confusing on mobile and wanted clearer guidance when no injected wallet was present. | Added mobile wallet connection handling with MetaMask and Trust Wallet deep links, improved connection state handling, clearer pending-request messaging, and wallet/network guidance. | Reduced onboarding friction for mobile and first-time wallet users. |
| Dataset evaluation before purchase | AI developers wanted more detail than a title and price before deciding whether to purchase. | Expanded listing detail views to show metadata such as source platform, license, modality, task tags, domain tags, provenance confidence, redistribution confidence, quality signals, and external source links. | Buyers can make a more informed decision before purchase. |
| Seller trust and credibility | Early users asked for stronger trust signals and wanted assurance that ratings reflected real transactions rather than arbitrary reviews. | Added verified-purchase-gated seller ratings, seller reputation summaries, verified rating counts, and one-rating-per-dataset controls. | Improved trust signaling while keeping the feedback loop tied to real marketplace activity. |
| Purchase clarity and post-purchase access | Users wanted clearer confirmation after buying, easier access to purchased listings, and better visibility into balances and rewards. | Added dashboard views for purchased datasets, pending withdrawals, payment token balances, pending rewards, reward balances, rating actions, and clearer transaction toasts. Purchased users also receive source links, repository links, homepage links, or file download access where applicable. | Improved confidence in the purchase flow and reduced ambiguity after transactions complete. |
| Listing workflow for providers | Providers wanted a more guided listing flow with space for structured metadata and optional file upload. | Added a listing form covering dataset name, description, modality, source URL, license, size, format, task tags, quality tags, pricing, and optional file upload to IPFS. Error handling around failed listing transactions was also improved. | Lowered the barrier to creating a marketplace-ready listing. |
| Marketplace discovery and seed quality | Early users reported that marketplace value depends heavily on seeing credible, useful datasets quickly. | Curated a seeded catalog with conservative approval criteria, licensing review, provenance scoring, manual-review routing for risky records, and searchable marketplace cards covering title, task, modality, license, and seller. | Improved the first-run marketplace experience and reduced low-quality or unclear listings in the pilot catalog. |

## 4. Detailed Feedback Notes

### 4.1 Wallet Onboarding

Observed feedback:

- mobile users needed a clearer path to connect through their wallet app browser
- some users were unsure whether the platform was waiting on wallet approval or had failed
- network switching and wallet detection needed clearer UX

Implemented refinements:

- added mobile wallet deep-link options for MetaMask and Trust Wallet
- improved connection-state messaging for in-progress and pending wallet requests
- improved wallet detection and reconnect behavior

Why this matters:

- wallet connection is the first critical conversion step for both buyers and sellers
- reducing friction here increases the chance that pilot users reach listing and purchase flows

### 4.2 Richer Dataset Context Before Purchase

Observed feedback:

- buyers wanted more provenance and quality context before spending funds
- users wanted to understand what a dataset contains, its source, and its permitted usage
- plain on-chain listing data was not enough for confident selection

Implemented refinements:

- expanded dataset detail views with richer metadata pulled from IPFS
- exposed license details, license verification state, source platform, file formats, maintainer, quality signals, task tags, and domain tags
- added access to dataset homepage, source listing, repository, and downloadable file where applicable

Why this matters:

- richer metadata reduces purchase uncertainty
- strong context supports trust and helps the marketplace feel curated instead of raw

### 4.3 Trust Signals and Reputation

Observed feedback:

- users wanted stronger confidence that seller ratings were tied to real economic activity
- early participants wanted to see seller quality signals before purchasing

Implemented refinements:

- introduced verified seller ratings gated by purchase history
- added seller reputation summaries and verified review counts to listing views
- added buyer rating flows in both the dashboard and dataset detail modal

Why this matters:

- trust is essential in a two-sided dataset marketplace
- tying reputation to verified purchases helps reduce low-signal or spammy reviews

### 4.4 Clearer Dashboard and Transaction Outcomes

Observed feedback:

- users wanted clearer visibility into what they owned, what they earned, and what they could do next
- early buyers and sellers needed confirmation that actions had succeeded

Implemented refinements:

- added a dashboard covering seller and buyer views
- surfaced pending withdrawals, token balances, pending rewards, and claimed reward balances
- added transaction success and failure toasts for purchases, withdrawals, reward claims, faucet claims, and ratings
- surfaced purchased datasets with direct next actions such as rating a seller or accessing unlocked resources

Why this matters:

- transparency after a transaction is just as important as the transaction itself
- clearer account state reduces support burden during early onboarding

### 4.5 Simpler Listing Flow for Providers

Observed feedback:

- providers wanted a straightforward path to publish without needing to understand raw IPFS or contract inputs
- metadata entry needed to feel structured rather than ad hoc

Implemented refinements:

- added a structured listing form for the most important fields needed to create a usable dataset listing
- supported optional direct file upload alongside metadata-only and source-link listings
- improved error reporting for rejected transactions and misconfigured networks

Why this matters:

- provider onboarding speed directly affects supply-side growth
- a simpler listing workflow supports repeated use by non-technical contributors

### 4.6 Catalog Quality and Discovery

Observed feedback:

- early users wanted the marketplace to feel populated with credible, relevant datasets
- listing quality and searchability were important to perceived value

Implemented refinements:

- built a seeded catalog of approved datasets for the pilot experience
- applied conservative licensing and provenance filters
- routed ambiguous or risky datasets to manual review
- added marketplace search over title, description, seller, task, license, and modality-linked metadata

Why this matters:

- a curated initial catalog improves first impressions
- stronger quality controls reduce clutter and legal ambiguity in the pilot environment

## 5. Evidence of Implemented Refinements

The following product areas reflect the changes summarized above:

- wallet onboarding and mobile connection UX in `Datachain-Frontend/components/connect-wallet.tsx` and `Datachain-Frontend/hooks/useWeb3.ts`
- marketplace browsing and search in `Datachain-Frontend/app/market/page.tsx`
- rich dataset detail and access flows in `Datachain-Frontend/components/dataset-detail-modal.tsx`
- buyer/seller dashboard improvements in `Datachain-Frontend/app/dashboard/page.tsx`
- verified ratings flow in `Datachain-Frontend/components/rating-modal.tsx` and `Datachain-Frontend/hooks/useReputation.ts`
- listing flow improvements in `Datachain-Frontend/app/list/page.tsx`
- metadata normalization and IPFS retrieval in `Datachain-Frontend/lib/marketplace-metadata.ts` and `Datachain-Frontend/app/api/ipfs/[cid]/route.ts`
- curated seed catalog and conservative dataset review in `reports/summary_report.md` and the data pipeline outputs under `data/final/`


## 6. Next Iteration Priorities

Based on the feedback collected so far, the next product refinements should focus on:

- clearer provider onboarding and listing review guidance
- stronger dataset filtering and sorting
- more explicit purchase-access messaging for different unlock types
- structured user research collection as pilot usage grows
- broader onboarding of both providers and AI developers so future feedback includes a larger and more representative user base

## 7. Conclusion

Milestone 3 did include meaningful early-user feedback collection, but the original submission did not package that work as a dedicated deliverable. This document provides that missing summary.

The key takeaway is that early feedback was used to improve:

- onboarding
- discovery
- trust signals
- listing quality
- dashboard visibility
- purchase clarity

These refinements materially improved the usability of the live pilot and created a stronger foundation for the next phase of adoption and ecosystem growth.
