# Reputation System Documentation

## System Architecture & Workflow

- **Hybrid Architecture**: The system utilizes a hybrid approach combining Google Firebase (frontend/backend) and the Internet Computer (IC) Blockchain (trust engine).
- **The Bridge**: Firebase Cloud Functions serve as a secure bridge, fetching user data and reviews from Firestore and transmitting them to the IC Canister for processing.
- **Data Flow**:
  - **Trigger**: Actions like completing a booking or submitting a review trigger the process.
  - **Data Aggregation**: The system fetches relevant history (bookings, ratings, account age) from Firestore.
  - **Computation**: This data is sent to the `ReputationCanister` on the blockchain, which executes the scoring logic.
  - **Storage**: The calculated `ReputationScore` is stored in the canister's persistent state and returned to the application.

## Reputation Scoring Mechanics

## Technical Deep Dive: The ICP Canister

### What is a Canister?

"Canisters" are the smart contracts of the Internet Computer. Unlike Ethereum smart contracts which are typically just code, a Canister is a computational unit that bundles **Code (WebAssembly)** and **State (Memory)** together. It acts like a secure, decentralized server that runs 24/7 without a centralized owner or cloud provider (like AWS).

### What We Store On-Chain

We strictly store **Metadata** and **Trust Logic** in the canister, ensuring privacy and efficiency while maintaining immutability for critical data.

- **User Identity**: `Principal ID` (Anonymized, cryptographic user identifier).
- **Reputation Score**: The calculated `TrustScore` (0-100 float).
- **Trust Level**: The derived tier (`#New`, `#Low`, `#Medium`, `#High`, `#VeryHigh`).
- **History**: A timestamped log of score changes (for immutable history tracking).
- **Detection Flags**: Active flags for suspicious behavior (e.g., `#ReviewBomb`, `#IdentityFraud`).
- **Aggregated Stats**: `completedBookings` count and `averageRating`.

### Strengths of Canisters

1.  **Tamper-Proof State**: The memory pages of a canister are cryptographically signed by the blockchain subnet. No admin can "edit the database" directly; state changes only happen through valid code execution.
2.  **Orthogonal Persistence**: Data lives in the canister's memory forever. We don't need a separate database connection (like SQL); the variables in the code _are_ the database.
3.  **Reverse Gas Model**: The canister pays for its own computation cycles. This means users don't need to hold crypto wallets or pay gas fees to interact with the reputation system.
4.  **Http Outcalls & AI**: Canisters can make HTTP calls to external APIs and run AI inference (like our Llama3 sentiment analysis) natively on-chain.

### Core Algorithm: Bayesian Average

- **Purpose**: Prevents score skewing for new users with few ratings (e.g., a single 5-star rating shouldn't equal a perfect reputation).
- **Formula**: The system adds "dummy" votes to pull the score toward a global average.
  - **Prior Mean**: 3.0 (Neutral baseline).
  - **Confidence Threshold**: 2.0 (Determines how quickly the score deviates from the mean).
- **Result**: A user needs consistent positive feedback to achieve a high score, rather than just one lucky interaction.

### Trust Score Components (0 - 100 Scale)

- **Base Score**: All users start with a neutral base score of 50.0.
- **Booking Activity**: Points awarded for completed bookings (Max 20 pts).
- **Rating Quality**: Points derived from the Bayesian average of received ratings (Max 20 pts).
- **Account Age**: Points for account longevity, maxing out after approximately 1 year (Max 10 pts).
- **Recency Weight**: Higher impact for recent activity (Last 30 days > 90 days > 180 days).
- **Consistency Bonus**: Extra points for maintaining a high average rating (4.0+) over 5+ bookings.
- **Frequency Score**: Rewards for regular platform usage (bookings per month).

### Provider-Specific Logic

- **Service Completion Focus**: Providers receive higher rewards for completing jobs (Max 25 pts).
- **Experience Tiers**:
  - **Active**: 10+ bookings.
  - **Experienced**: 25+ bookings.
  - **Veteran**: 50+ bookings.
- **Strict Penalties**: Established providers face steeper deductions for low ratings compared to new users.

### Explicit Deductions & Penalties

- **Low Rating Penalty**: If the Bayesian average drops below 3.0, points are deducted rather than added.
- **Cancellation Penalty**: A fixed deduction (5.0 pts) applies for cancelling a booking.
- **Suspicious Activity Flags**:
  - **Review Bombing**: -15 pts (plus extra if multiple flags).
  - **Competitive Manipulation**: -15 pts (e.g., 5-star ratings with short/empty comments).
  - **Abusive Content**: -20 pts.
  - **Identity Fraud**: -15 pts.

## Review System & Sentiment Analysis

### Weighted Reviews

- **Reputation-Based Weight**: A review's impact depends on the _reviewer's_ own reputation.
  - **Multiplier**: Ranges from 0.5x to 1.5x based on the reviewer's Trust Score.
  - **Trust Level Bonus**: Additional weight for 'High' or 'Very High' trust reviewers.
- **Quality-Based Weight**: Longer, detailed reviews carry more weight than short, generic ones.
- **Time Decay**: The influence of a review on the reputation score decreases over time (Half-life of 180 days), ensuring scores reflect current performance.

### AI-Powered Sentiment Analysis

- **LLM Integration**: The system uses an on-chain Large Language Model (Llama3_1_8B) to analyze review comments.
- **Sentiment Scoring**: The LLM rates the sentiment from 0.0 (Very Negative) to 1.0 (Very Positive).
- **Consistency Verification**:
  - The system compares the **Numeric Rating** (1-5) with the **Sentiment Score**.
  - **Flagging**: If a user gives a high rating (4-5 stars) but writes a negative comment (Sentiment < 0.3), the review is flagged for inconsistency.
- **Abusive Content Detection**:
  - **Keyword Matching**: Immediate check for a predefined list of abusive terms.
  - **LLM Analysis**: Deeper contextual analysis to catch subtle abuse.

### Automated Monitoring

- **Consecutive Bad Reviews**:
  - **Trigger**: 5 consecutive reviews with a rating of 2 or lower.
  - **Action**: Automatically generates a support ticket for manual intervention.
  - **Scope**: Monitors both providers receiving bad service reviews and clients habitually giving bad reviews.

## Blockchain Integration: Benefits & Rationale

### Why Blockchain? (vs. Conventional Databases)

- **Immutable Trust History**:
  - _Conventional_: Database records can be updated or deleted by admins. A bad actor with access could wipe a negative history.
  - _Blockchain_: Once a reputation score or history entry is recorded on the canister, it is cryptographically secured. The history is permanent and tamper-proof, creating a "trust anchor" that no single entity can manipulate.
- **Verifiable Logic (Code is Law)**:
  - _Conventional_: Algorithms are hidden behind API endpoints. Users must trust that the platform isn't secretly boosting preferred providers or shadow-banning others.
  - _Blockchain_: The scoring logic resides in the open canister code. Anyone can verify that the rules (penalties, rewards, weighting) apply equally to everyone. The execution is deterministic and transparent.
- **Portable & Decentralized Identity**:
  - _Conventional_: Reputation is locked within the platform's siloed database.
  - _Blockchain_: The reputation is tied to a Principal ID. This creates a portable "Trust Identity" that could potentially be referenced by other services in the ecosystem, not just this specific application.
- **Resilience & Uptime**:
  - _Conventional_: Centralized servers are single points of failure.
  - _Blockchain_: The Internet Computer network is distributed. The reputation system continues to function even if specific nodes go offline, ensuring high availability.

### Why Internet Computer Protocol (ICP)? (vs. Other Blockchains)

- **Reverse Gas Model**:
  - _Others (ETH, SOL)_: Users need to pay "gas fees" for every transaction, requiring them to hold crypto wallets and buy tokens just to leave a review. This destroys User Experience (UX).
  - _ICP_: The "Canister" (smart contract) pays for the computation. Users interact with the application seamlessly using standard web interfaces (Passkeys/Internet Identity) without needing to buy tokens or pay gas.
- **On-Chain AI Integration**:
  - _Others_: Running an LLM on Ethereum is impossible due to gas costs and computation limits.
  - _ICP_: We utilize ICP's unique capability to run AI models (like Llama3) _directly inside the smart contract_. This allows for decentralized, tamper-proof sentiment analysis without relying on centralized APIs like OpenAI.
- **Web-Speed Performance**:
  - _Others_: Transactions can take minutes to finalize.
  - _ICP_: Offers web-speed finality (1-2 seconds), making the reputation updates feel instant to the user, similar to a traditional web app.
- **Low-Cost Storage**:
  - _Others_: Storing gigabytes of reputation history on-chain is prohibitively expensive.
  - _ICP_: Storage costs are comparable to traditional cloud hosting ($5/GB/year), allowing us to keep full, detailed history on-chain rather than just a hash.

### Comparison Summary

| Feature               | Traditional DB     | Ethereum/Solana | Internet Computer (ICP) |
| :-------------------- | :----------------- | :-------------- | :---------------------- |
| **Tamper Resistance** | Low (Admin access) | High            | **High**                |
| **User Cost (Gas)**   | Free               | High            | **Free (Reverse Gas)**  |
| **Speed**             | Instant            | Slow/Variable   | **Web Speed**           |
| **AI Capability**     | High (Centralized) | None            | **High (On-Chain)**     |
| **Transparency**      | Low (Black Box)    | High            | **High**                |

### Strategic Selection: Why Reputation on Blockchain? (vs. Payments)

A common question is why we chose to decentralize the **Reputation System** while keeping **Payments** on a traditional centralized provider (Xendit).

- **The "Trust" Asset Class**:
  - **Payments (Xendit)**: Money is a _commodity_. Whether you pay via Xendit, Stripe, or a Bank, $50 is always $50. The value is in the transaction speed and reliability, which centralized providers excel at. Storing every coffee purchase on a blockchain is inefficient and redundant.
  - **Reputation (ICP)**: Trust is a _unique asset_. A 5-star rating on a centralized server is just a number in a database that can be edited. A 5-star rating on the blockchain is a _verifiable credential_. By placing reputation on-chain, we turn "user feedback" into a permanent, portable digital asset that the user truly owns.

- **Conflict of Interest**:
  - **Payments**: Xendit has no incentive to steal your money or fake a transaction; their business model relies on processing volume.
  - **Reputation**: Platforms _do_ have incentives to manipulate reputation—to boost new features, hide negative PR, or favor high-paying merchants. Decentralizing reputation removes this conflict of interest, ensuring the "Score" is a mathematical truth, not a business decision.

- **Redundancy vs. Innovation**:
  - Putting Xendit payment logs on ICP would be **redundant**. Xendit already provides excellent ledgers and receipts.
  - Putting Reputation on ICP is **innovative**. It solves the "Cold Start" problem for the internet—allowing a user to take their hard-earned reputation from one app to another (e.g., "Login with Internet Identity" to prove you are a trustworthy person).

### Data Privacy & Efficiency Strategy

- **Hybrid Approach**: We use a "Best of Both Worlds" strategy.
  - **Firestore**: Handles large-scale text data, user profiles, and high-frequency reads for UI performance.
  - **ICP Canister**: Acts as the "Supreme Court" of trust. It holds the logic, the scores, and the cryptographic proof of reputation.
  - **The Bridge**: Secure Cloud Functions ensure that only verified events (completed bookings) trigger reputation updates, preventing spam while maintaining decentralization of the scoring logic.
