---
tags: [architecture, backend, reputation, icp]
date: 2026-06-16
sources:
  - docs/comprehensive_reputation_system.md
related:
  - [[Reputation System Overview]]
  - [[Reputation Service (Firestore)]]
  - [[Reputation Scoring Algorithm]]
---

# Reputation System — ICP Canister (Legacy Design)

> **Note**: The production reputation system runs as a Firestore-native JS Cloud Function (see [[Reputation Service (Firestore)]]). This page documents the original ICP canister architecture that inspired the JS port.

The original Internet Computer Protocol (ICP) canister design at `src/backend/function/` was the initial trust engine concept. Canisters are WebAssembly smart contracts combining code and state, acting as decentralized servers.

## What Would Have Been Stored On-Chain

- **User Identity**: `Principal ID` (anonymized cryptographic identifier)
- **Reputation Score**: `TrustScore` (0–100 float)
- **Trust Level**: Derived tier (`New`, `Low`, `Medium`, `High`, `VeryHigh`)
- **History**: Timestamped log of score changes for immutable audit trail
- **Detection Flags**: Active flags for suspicious behavior
- **Aggregated Stats**: `completedBookings` count and `averageRating`

## Core Algorithm: Bayesian Average

Prevents score skewing for new users. Adds dummy votes pulling the score toward a global prior mean (3.0) with a confidence threshold of 2.0. This same algorithm was ported to JS in `reputationMath.js`.

## Why It Was Replaced

The JS/Firestore approach was chosen for simplicity, lower latency, and easier debugging. The scoring logic from the Motoko canister was ported directly to `functions/src/utils/reputationMath.js`. The ICP canister code remains in the codebase as a reference.
