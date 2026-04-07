# This repository uses the ULTIMATE IC VIBE CODING TEMPLATE from the github repository link https://github.com/pt-icp-hub/IC-Vibe-Coding-Template-Motoko

# SRV A Local Service Marketplace

A decentralized service marketplace built on the Internet Computer Protocol (ICP) that connects users with local service providers through secure, transparent, and AI-enhanced booking experiences.

## What We're Building

Our platform revolutionizes local service booking by leveraging a hybrid architecture that combines Firebase's real-time database capabilities with ICP's AI-powered reputation intelligence, creating a trustworthy marketplace where users can discover, book, and rate local service providers with confidence.

### Unique Value Proposition

**AI-Powered Reputation System**

- Intelligent monitoring of user activities including booking patterns and review behaviors
- Advanced review sentiment analysis powered by LLM canisters for authentic feedback verification
- Machine learning algorithms that detect fraudulent reviews and suspicious activity patterns

**Smart Work Verification**

- AI-powered validation of completed work through document and media analysis
- Automated quality assessment of service provider deliverables
- Proof-of-work verification system ensuring service completion standards

**Decentralized Trust & Security**

- Leverages ICP's tamper-proof infrastructure for transparent reputation scoring
- Immutable booking history and review records
- Secure identity management without compromising user privacy

### Current Features

#### **Core Marketplace Features**

- **Real-Time Service Discovery**: Browse and search local service providers with live Firestore updates
- **Advanced Booking System**: Multi-package bookings, instant booking with real-time callbacks, conflict detection, and GPS-based distance calculation
- **AI-Enhanced Ratings & Reviews**: Community-driven feedback with ICP-powered sentiment analysis and fraud detection
- **Web Application**: Responsive web application optimized for desktop and mobile browsers

#### **Payment & Financial System**

- **Multiple Payment Methods**: Cash-on-Hand, GCash integration via Xendit
- **Hybrid Commission Model**: Dynamic tiered commission structure (3.5%-7%) based on service categories
- **Firebase-Managed Transactions**: Real-time payment tracking, balance updates, and transaction history stored in Firestore
- **Secure Payment Processing**: Firebase Cloud Functions integration with Xendit for payment gateway operations

#### **Trust & Security**

- **AI-Enhanced Reputation System (ICP)**: Decentralized machine learning algorithms for fraud detection and sentiment analysis
- **Firebase Authentication**: Secure OTP-based authentication with email/password support
- **Service-Level Verification**: Certificate-based verification with media uploads managed by Firebase Storage
- **Multi-Role Support**: Seamless role switching between Client and Service Provider with Firebase Auth custom claims
- **Real-Time Security Rules**: Firestore security rules protecting data access and modifications

#### **Real-Time Communication**

- **Firebase-Powered Chat System**: Real-time encrypted messaging with automatic conversation management
- **Live Updates**: Real-time booking status changes, service updates, and activity notifications

#### **Admin & Analytics**

- **Comprehensive Admin Dashboard**: User management, booking oversight, and commission tracking
- **Remittance System**: Cash collection and settlement management for service providers
- **Analytics & Reporting**: Real-time booking statistics, user analytics, and platform insights

---

## System Architecture

Our platform leverages a microservices architecture built on the Internet Computer Protocol (ICP), integrated with Firebase Cloud Functions for external payment processing.

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SRV Local Service Marketplace                           │
│                                    Frontend Layer                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                        │
│  │   Client Web    │ │  Provider Web   │ │   Admin Web     │                        │
│  │  (React/Vite)   │ │  (React/Vite)   │ │  (React/Vite)   │                        │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            Firebase Cloud Platform                                   │
│                         Primary Backend Infrastructure                               │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                          Firebase Cloud Functions                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │   Auth   │ │ Service  │ │ Booking  │ │  Review  │ │    Notification  │  │   │
│  │  │ Functions│ │ Functions│ │ Functions│ │ Functions│ │     Functions    │  │   │
│  │  │          │ │          │ │          │ │          │ │                  │  │   │
│  │  │ • OTP    │ │ • CRUD   │ │ • Create │ │ • Submit │ │ • Email/SMS      │  │   │
│  │  │ • Login  │ │ • Search │ │ • Update │ │ • List   │ │ • Real-time      │  │   │
│  │  │ • Signup │ │ • Filter │ │ • Cancel │ │ • Stats  │ │   Delivery       │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  │                                                                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │  Wallet  │ │   Chat   │ │  Media   │ │  Admin   │ │    Commission    │  │   │
│  │  │ Functions│ │ Functions│ │ Functions│ │ Functions│ │     Functions    │  │   │
│  │  │          │ │          │ │          │ │          │ │                  │  │   │
│  │  │ • Balance│ │ • Send   │ │ • Upload │ │ • User   │ │ • Calculate      │  │   │
│  │  │ • Topup  │ │ • Fetch  │ │ • Manage │ │   Mgmt   │ │ • Track          │  │   │
│  │  │ • History│ │ • Realtime│ │ • Delete │ │ • Stats  │ │ • Process        │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                           Firebase Firestore                                  │   │
│  │                        Real-Time NoSQL Database                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │  Users   │ │ Services │ │ Bookings │ │ Reviews  │ │    Wallets       │  │   │
│  │  │Collection│ │Collection│ │Collection│ │Collection│ │   Collection     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │   Chat   │ │  Media   │ │Notifications│ │Remittances│ │   Commission    │  │   │
│  │  │Collection│ │Collection│ │ Collection│ │Collection│ │   Collection     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │   │
│  │                                                                               │   │
│  │  • Real-time synchronization • Security Rules • Scalable queries              │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Firebase Authentication                                │   │
│  │  • Email/Password Auth  • OTP Verification  • Custom Claims  • Admin SDK     │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Firebase Storage                                      │   │
│  │  • Profile Images  • Service Media  • Certificates  • Document Uploads       │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      Internet Computer Protocol (ICP)                                │
│                     AI Intelligence & Reputation Layer                               │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         ICP Canisters (Smart Contracts)                      │    │
│  │                                                                               │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │    │
│  │  │   Reputation     │  │      Auth        │  │      LLM (External)      │  │    │
│  │  │    Canister      │  │    Canister      │  │       Canister           │  │    │
│  │  │                  │  │                  │  │                          │  │    │
│  │  │ • AI Reputation  │  │ • Identity Mgmt  │  │ • Sentiment Analysis     │  │    │
│  │  │   Scoring        │  │ • Principal Auth │  │ • Review Verification    │  │    │
│  │  │ • Trust Levels   │  │ • Role Validation│  │ • Fraud Detection        │  │    │
│  │  │ • Fraud Pattern  │  │ • Decentralized  │  │ • LLM Processing         │  │    │
│  │  │   Detection      │  │   Identity       │  │ • AI Insights            │  │    │
│  │  │ • Immutable      │  │                  │  │                          │  │    │
│  │  │   History        │  │                  │  │                          │  │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │    │
│  │                                                                               │    │
│  │  • Tamper-proof AI Analysis                                                  │    │
│  │  • Decentralized Intelligence                                                │    │
│  │  • Blockchain-backed Trust Scoring                                           │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          External Services Layer                                     │
│                                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │   Xendit    │ │    GCash    │ │ Google Maps │ │  Firebase   │                    │
│  │   Payment   │ │   Digital   │ │     API     │ │   Hosting   │                    │
│  │   Gateway   │ │   Wallet    │ │             │ │             │                    │
│  │             │ │             │ │ • Location  │ │ • Web       │                    │
│  │ • Invoices  │ │ • Instant   │ │   Services  │ │   Hosting   │                    │
│  │ • Payouts   │ │   Transfers │ │ • Distance  │ │ • SSL/TLS   │                    │
│  │ • Webhooks  │ │ • QR Codes  │ │   Matrix    │ │ • CDN       │                    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### **Inter-Canister Communication Flow**

The platform uses a sophisticated inter-canister communication pattern where each canister maintains references to others for seamless data flow:

1. **Authentication Flow**: `Auth` → `Service` → `Booking` → `Review` → `Reputation`
2. **Payment Processing**: `Booking` → `Commission` → `Wallet` → `Notification`
3. **Service Management**: `Service` → `Media` → `Review` → `Reputation`
4. **Chat System**: `Chat` → `Auth` → `Booking` (post-completion messaging)
5. **Admin Operations**: `Admin` → All Canisters (system-wide management)

### **Data Architecture**

- 🚀 **Best Performance**: Firebase's real-time capabilities for instant user experience
- 🔒 **Enhanced Trust**: ICP's blockchain-backed reputation system
- 💡 **Smart Intelligence**: AI-powered fraud detection and sentiment analysis
- 📊 **Comprehensive Analytics**: Real-time data from Firebase + immutable AI insights from ICP
- 🌐 **Global Scale**: Firebase CDN + ICP's distributed network

---

## Technical Challenges & Solutions

Throughout the development and global migration of this hybrid marketplace, we encountered and solved numerous complex technical challenges:

### **Challenge 1: Cross-Platform Payment Integration**

**Problem**: Migrating core business logic from ICP canisters to Firebase while retaining AI-powered reputation intelligence on ICP without service disruption.

**Solution**:

- Implemented Firebase Cloud Functions as a bridge between ICP canisters and external payment APIs
- Created a payment holding system where funds are escrowed until service completion
- Developed comprehensive webhook handling for real-time payment status synchronization
- Built fallback mechanisms using Firestore for payment tracking when APIs are unavailable

### **Challenge 2: Dynamic Commission Calculation**

**Problem**: Ensuring seamless real-time updates between Firebase Firestore and ICP canisters while maintaining data consistency.

**Solution**:

- Designed a hybrid commission model with base fees (₱25-₱50) plus percentage rates (3.5%-7%)
- Implemented tiered structures: Tier A (7%), Tier B (5%), Tier C (3.5%) based on service categories
- Pre-calculated commission fees during service creation for faster booking acceptance
- Integrated commission validation to prevent providers from accepting bookings without sufficient wallet balance

### **Challenge 3: Real-Time Canister Communication**

**Problem**: Transitioning from Internet Identity to Firebase Authentication while maintaining backward compatibility and security.

**Solution**:

- Implemented a centralized canister reference system with `setCanisterReferences()` functions
- Created singleton actor patterns to prevent multiple actor instantiations
- Designed async inter-canister calls with proper error handling and fallback mechanisms
- Established clear data flow patterns: Auth → Service → Booking → Payment → Notification

### **Challenge 4: Progressive Web App Implementation**

**Problem**: Migrating payment workflows from canister-based wallet system to Firebase while integrating external payment gateway (Xendit).

**Solution**:

- Redesigned payment architecture: Firebase Cloud Functions ↔ Xendit API ↔ Firestore
- Implemented secure webhook handling for real-time payment status updates
- Created Firestore-based wallet system with transaction history and balance tracking
- Developed payment holding mechanism: funds escrowed in Firestore until service completion
- Built comprehensive payment state machine: created → pending → paid → released/refunded
- Implemented automatic commission calculation and deduction using Firebase Functions
- Created fallback mechanisms with Firestore audit logs when Xendit API is unavailable

### **Challenge 5: AI-Powered Reputation System**

**Problem**: Maintaining AI-powered reputation intelligence on ICP while core data lives in Firebase.

**Solution**:

- Designed hybrid reputation pipeline: Firestore data → Firebase Functions → ICP Reputation Canister
- Implemented batch processing for reputation score updates to minimize canister calls
- Created caching layer in Firestore for frequently accessed reputation scores
- Developed sentiment analysis workflow: Reviews in Firestore → LLM Canister → Score back to Firestore
- Built fraud detection pattern recognition using historical data from both platforms
- Implemented immutable reputation history on ICP while displaying real-time scores from Firestore

### **Challenge 6: Multi-Payment Method Support**

**Problem**: Building comprehensive admin dashboard with real-time analytics from Firebase data sources.

**Solution**:

- Created flexible payment method enums with variant types in Motoko
- Implemented payment-specific validation logic (commission checks for cash, balance verification for wallets)
- Developed payment holding and release mechanisms for digital payments
- Built automatic commission deduction systems with detailed transaction logging

### **Challenge 7: Development Environment Consistency**

**Problem**: Migrating encrypted chat from ICP canister to Firebase Realtime Database while maintaining security.

**Solution**:

- Implemented comprehensive devcontainer setup with all required dependencies
- Created environment-aware configuration systems for canister communication
- Developed mock payment systems for development when API access is restricted
- Built automated testing infrastructure with PocketIC for canister integration testing

### **Challenge 8: State Management & Data Persistence**

**Problem**: Managing different configurations for local development, staging, and production across Firebase and ICP.

**Solution**:

- Created environment-aware configuration system with automatic detection
- Implemented separate Firebase projects for development and production
- Developed canister ID management system for multi-network deployments
- Built mock services for development when external APIs unavailable
- Created comprehensive .env file structure with validation
- Implemented feature flags for controlled feature rollouts
- Developed automated deployment scripts with environment verification

---

## Advanced Features & Improvements

### **Recent Major Enhancements**

#### **Payment Integration System (Features 1.0 - 3.4)**

- **Hybrid Commission Model**: Dynamic tiered commission structure with Tier A (7%), Tier B (5%), and Tier C (3.5%) based on service categories
- **Integrated Wallet System**: Balance tracking and transaction history
- **Payment Holding Mechanism**: Secure escrow system where digital payments are held until service completion
- **Multi-Environment Support**: Seamless operation across local, emulator, and production environments

#### **AI & Intelligence Features**

- **Sentiment Analysis Integration**: LLM-powered review analysis for authentic feedback verification
- **Fraud Detection**: Advanced algorithms for detecting suspicious review patterns and user behaviors
- **Smart Booking Validation**: GPS-based distance calculation, conflict detection, and commission balance verification
- **Automated Quality Assessment**: AI-powered validation of completed work through document and media analysis

#### **Admin & Analytics System**

- **Comprehensive Dashboard**: Real-time booking statistics, user analytics, and platform insights
- **Remittance Management**: Cash collection and settlement system for service providers
- **Role-Based Access Control**: Granular permissions with multi-role user support
- **Audit Trail System**: Complete tracking of payments, commissions, and platform activities

### **Performance Optimizations**

#### **Canister Architecture Improvements**

- **Singleton Actor Patterns**: Prevents multiple actor instantiations and improves performance
- **Pre-calculated Commission Fees**: Eliminates redundant calculations during booking acceptance
- **Optimized Inter-Canister Calls**: Reduced network overhead with batched operations
- **Stable Memory Utilization**: Efficient data persistence across canister upgrades

#### **Frontend Performance**

- **Component Optimization**: React.memo implementations to prevent unnecessary re-renders
- **Lazy Loading**: Dynamic imports and code splitting for faster initial load times
- **Caching Strategies**: Intelligent service worker caching for offline functionality
- **Bundle Optimization**: Vite-based build system with optimized dependency bundling

### **Security Enhancements**

#### **Authentication & Authorization**

- **Principal-Based Security**: Leverages ICP's decentralized identity system
- **Role-Based Access Control**: Granular permissions for clients, providers, and administrators
- **Session Management**: Secure authentication state persistence across browser sessions
- **API Security**: Proper validation and sanitization for all external API integrations

#### **Payment Security**

- **Escrow System**: Payments held securely until service completion verification
- **Commission Validation**: Prevents booking acceptance without sufficient provider wallet balance
- **Audit Logging**: Comprehensive transaction tracking for financial transparency
- **Fraud Prevention**: AI-powered detection of suspicious activities and patterns

### **Cross-Platform Compatibility**

#### **Progressive Web App Features**

- **Universal Installation**: Works across desktop, mobile, and tablet devices
- **Offline Functionality**: Core features available without internet connection
- **Push Notifications**: Real-time updates via Firebase Cloud Messaging
- **Browser Compatibility**: Comprehensive support for Chrome, Safari, Firefox, Edge, and Brave

#### **Responsive Design**

- **Mobile-First Approach**: Optimized for mobile devices with desktop enhancements
- **Touch-Friendly Interface**: Gesture support and touch-optimized interactions
- **Adaptive Layouts**: Dynamic layouts that adjust to different screen sizes and orientations
- **Accessibility Features**: ARIA compliance and keyboard navigation support

---

## Getting Started

### 1. Development Environment Setup

This project uses a **devcontainer** for consistent development environments:

- Clone this repository
- Open in VS Code and reopen in container when prompted
- Or use GitHub Codespaces with 4-core 16GB RAM configuration

### 2. Install Dependencies

```bash
npm install
cd functions && npm install && cd ..  # Install Firebase Functions dependencies
```

### 3. Firebase Setup

Configure Firebase for the project:

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy Firebase Functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

Set up environment variables for Firebase Functions in `functions/.env`:

```bash
# Xendit API Configuration
XENDIT_API_KEY=your_xendit_api_key
XENDIT_WEBHOOK_TOKEN=your_webhook_token

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id

# ICP Canister IDs (for hybrid integration)
AUTH_CANISTER_ID=your_auth_canister_id
REPUTATION_CANISTER_ID=your_reputation_canister_id
```

### 4. Running Ollama (For ICP AI Features)

To enable AI-powered reputation features, you'll need Ollama for LLM processing:

```bash
ollama serve
# Expected to start listening on port 11434
```

In a separate terminal, download the required model:

```bash
ollama run llama3.1:8b
```

Once loaded, you can terminate with `/bye`. This step only needs to be done once.

### 5. ICP Canister Deployment (AI Features Only)

Deploy only the AI-related canisters for reputation intelligence:

```bash
# Start the local Internet Computer replica
dfx start --clean

# Deploy reputation and auth canisters
dfx deploy auth
dfx deploy reputation

# Deploy LLM dependencies
dfx deps pull
dfx deps deploy  # deploys the llm canister
```

### 6. Start Development Server

```bash
npm start
```

The frontend will be available at `http://localhost:5173`

### 7. Run Tests

```bash
npm test
```

For specific test files:

```bash
npm test tests/src/backend.test.ts    # individual test
```

### 8. Deploy to Production

#### Firebase Deployment

```bash
# Deploy all Firebase services
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
```

#### ICP Canister Deployment

```bash
# Deploy to mainnet (reputation canisters only)
dfx deploy --network ic auth
dfx deploy --network ic reputation
```

---

## Project Structure

```
SRV-WCHL/
├── Configuration & Setup
│   ├── .devcontainer/devcontainer.json       # Container config for development
│   ├── .github/
│   │   ├── instructions/                     # AI Copilot context and guidance
│   │   ├── prompts/                          # AI workflow prompts
│   │   └── workflows/                        # GitHub CI/CD pipelines
│   ├── firebase.json                         # Firebase services configuration
│   ├── firestore.rules                       # Firestore security rules
│   ├── firestore.indexes.json                # Firestore composite indexes
│   ├── dfx.json                              # ICP canister configuration (AI only)
│   └── mops.toml                             # Motoko package configuration
│
├── Frontend Applications
│   ├── src/frontend/                         # Main React + TypeScript PWA
│   │   ├── src/
│   │   │   ├── App.tsx                       # Main application component
│   │   │   ├── components/                   # Reusable UI components
│   │   │   ├── services/                     # Firebase & ICP service integrations
│   │   │   ├── pages/                        # Page-level components
│   │   │   ├── hooks/                        # Custom React hooks
│   │   │   └── context/                      # React context providers
│   │   ├── public/
│   │   │   └── manifest.json                 # Web app manifest
│   │   └── vite.config.ts                    # Build configuration
│   └── src/admin/                            # Admin dashboard Web App
│       └── src/                              # Admin-specific components and services
│
├── Backend Canisters (Motoko)
│   └── src/backend/function/
│       ├── auth.mo                           # Authentication & user management
│       ├── service.mo                        # Service catalog & provider management
│       ├── booking.mo                        # Booking lifecycle & scheduling
│       ├── review.mo                         # Reviews & ratings system
│       ├── reputation.mo                     # AI-powered reputation scoring
│       ├── commission.mo                     # Dynamic commission calculation
│       ├── wallet.mo                         # Digital wallet & transactions
│       ├── chat.mo                           # Encrypted messaging system
│       ├── media.mo                          # Image & document storage
│       ├── notification.mo                   # Push notification management
│       ├── remittance.mo                     # Cash collection & settlement
│       ├── admin.mo                          # System administration
│       └── feedback.mo                       # Platform feedback system
│
├── External Services Integration
│   └── functions/                            # Firebase Cloud Functions
│       ├── index.js                          # Function exports and routing
│       ├── firebase-admin.js                 # Firebase Admin SDK setup
│       ├── src/
│       │   ├── auth.js                       # Authentication (OTP, login, signup)
│       │   ├── service.js                    # Service management (CRUD, search)
│       │   ├── booking.js                    # Booking lifecycle management
│       │   ├── review.js                     # Review submission and retrieval
│       │   ├── wallet.js                     # Wallet and transaction management
│       │   ├── chat.js                       # Real-time messaging
│       │   ├── media.js                      # Media upload and management
│       │   ├── notification.js               # Notification system
│       │   ├── commission.js                 # Commission calculation
│       │   ├── commission-utils.js           # Commission utilities
│       │   ├── admin.js                      # Admin operations
│       │   ├── adminAuth.js                  # Admin authentication
│       │   ├── feedback.js                   # Platform feedback
│       │   ├── account.js                    # User account management
│       │   └── reputation.js                 # Reputation integration with ICP
│       ├── utils/
│       │   └── canisterConfig.js             # ICP canister communication
│       ├── onboardProvider.js                # Xendit customer onboarding
│       ├── createDirectPayment.js            # Payment invoice creation
│       ├── createTopupInvoice.js             # Wallet top-up processing
│       ├── xenditWebhook.js                  # Payment webhook handler
│       ├── releaseHeldPayment.js             # Payment release logic
│       ├── checkInvoiceStatus.js             # Payment status checking
│       ├── checkProviderOnboarding.js        # Provider validation
│       └── getPaymentData.js                 # Payment data retrieval
│
├── ⚙️ ICP Canisters (AI Intelligence Layer - Limited Scope)
│   └── src/backend/function/
│       ├── auth.mo                           # Decentralized identity verification
│       ├── reputation.mo                     # AI-powered reputation scoring
│       └── feedback.mo                       # Platform feedback (legacy)
│
├── Generated Interfaces
│   └── src/declarations/                     # Auto-generated canister interfaces
│       ├── auth/                            # Authentication canister types
│       ├── reputation/                      # Reputation canister types
│       └── llm/                             # LLM canister types (external)
│
├── Testing Infrastructure
│   ├── tests/
│   │   ├── src/                             # Backend integration tests (PocketIC)
│   │   └── vitest.config.ts                 # Test configuration
│   └── src/frontend/tests/                  # Frontend unit tests (Vitest)
│
└── Documentation
    ├── README.md                            # This comprehensive guide
    ├── CHANGELOG.md                         # Detailed version history
    ├── MIGRATION_LOG.md                     # Migration documentation
    └── docs/                                # Additional documentation
```

### **Architecture Highlights**

#### **Frontend Layer**

- **Multi-App Structure**: Separate web applications for client, provider, and admin interfaces
- **Shared Components**: Reusable UI components across all applications
- **Service Integration**: Dedicated service layers for Firebase and ICP interactions
- **State Management**: Centralized context providers with React hooks
- **Responsive Design**: Mobile-first approach optimized for all screen sizes

#### **Firebase Backend Layer (Primary)**

- **Cloud Functions**: 15+ serverless functions handling core business logic
- **Firestore Database**: Real-time NoSQL database with 10+ collections
- **Authentication**: Firebase Auth with OTP verification and custom claims
- **Storage**: Firebase Storage for media and document management
- **Hosting**: Firebase Hosting with global CDN

#### **ICP Intelligence Layer (AI Features)**

- **Reputation Canister**: Blockchain-based AI reputation scoring
- **Auth Canister**: Decentralized identity verification
- **LLM Integration**: External LLM canister for sentiment analysis
- **Tamper-Proof**: Immutable reputation history on blockchain

#### **Integration Layer**

- **Firebase-ICP Bridge**: Cloud Functions communicating with ICP canisters
- **Webhook Handling**: Real-time payment status updates
- **Multi-Environment Support**: Seamless operation across dev and production
- **API Abstraction**: Clean interfaces for external service integration

---

## Testing Patterns

The project uses a comprehensive testing approach across both Firebase and ICP components:

- **Frontend Tests**: Vitest for React component and service testing
- **Firebase Functions Tests**: Jest-based unit and integration tests for Cloud Functions
- **ICP Canister Tests**: PocketIC for reputation and auth canister testing
- **End-to-End**: Automated workflows testing critical user paths

Run tests during development:

```bash
npm test                                   # All frontend tests
npm test tests/src/backend.test.ts        # ICP canister tests
cd functions && npm test                   # Firebase Functions tests
```

### Firebase Emulator Suite

For local Firebase testing:

```bash
# Start Firebase emulators
firebase emulators:start

# Run tests against emulators
npm run test:firebase
```

---

## CI/CD Workflow

Automated workflows in `.github/workflows/` include:

- **Test Automation**: Full test suite execution on pull requests
- **Build Verification**: Ensures deployable builds
- **Code Quality**: Linting and formatting checks

Future enhancements:

- Security audits and dependency scanning
- Test coverage reporting
- Performance benchmarking

---

## GitHub Copilot Integration

This project includes AI-assisted development through customized instructions and prompts:

### Instructions (`.github/instructions/`)

Provide context for AI assistance:

- **general.instructions.md**: Project-wide context and conventions
- **motoko.instructions.md**: Motoko-specific coding standards
- **test.instructions.md**: Testing patterns and practices

### Prompts (`.github/prompts/`)

Structured workflows for common tasks:

#### Add Feature Prompt

```markdown
/add-feature Add service provider verification system
```

Follows a structured approach:

1. **Specification**: Updates changelog and clarifies requirements
2. **Test-First**: Creates failing tests for new functionality
3. **Implementation**: Builds feature with proper error handling
4. **Validation**: Runs tests and performs code quality checks

#### Changes Review Prompt

```markdown
/changes-review
```

Analyzes git diffs and provides comprehensive code review covering:

- **Business Logic**: Edge cases and side effects
- **Code Quality**: Refactoring opportunities
- **Security & Performance**: Vulnerabilities and optimizations

---

## Learning Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs)
- [Motoko Programming Language](https://internetcomputer.org/docs/motoko/home)
- [PocketIC Testing Framework](https://dfinity.github.io/pic-js/)

### Development Tools

- [Vitest Testing Framework](https://vitest.dev/)
- [Vite Build Tool](https://vitejs.dev/)
- [GitHub Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization)

### Payment Integration

- [Xendit API Documentation](https://developers.xendit.co/)
- [GCash Integration Guide](https://developers.xendit.co/api-reference/#gcash)

---

## Contributing

We welcome contributions to improve the marketplace! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

For bugs or feature requests, please open an issue with detailed information.

### Development Guidelines

- Follow Firebase Cloud Functions best practices
- Maintain ICP canister compatibility for AI features
- Write tests for both Firebase and ICP components
- Update documentation for significant changes
- Follow the code style guidelines in `.github/instructions/`

---

**Build the future of local services with decentralized trust**
