# This repository uses the ULTIMATE IC VIBE CODING TEMPLATE from the github repository link https://github.com/pt-icp-hub/IC-Vibe-Coding-Template-Motoko

# SRV A Local Service Marketplace

A decentralized service marketplace built on the Internet Computer Protocol (ICP) that connects users with local service providers through secure, transparent, and AI-enhanced booking experiences.

## What We're Building

Our platform revolutionizes local service booking by leveraging ICP's unique capabilities to create a trustworthy marketplace where users can discover, book, and rate local service providers with confidence.

### Unique Value Proposition

**AI-Powered Reputation System**

- Intelligent monitoring of user activities including booking patterns and review behaviors
- Advanced review sentiment analysis for authentic feedback verification
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

- **Service Discovery**: Browse and search local service providers by category and location
- **Advanced Booking System**: Multi-package bookings, instant booking, conflict detection, and GPS-based distance calculation
- **Ratings & Reviews**: Community-driven feedback system with AI-powered sentiment analysis
- **Progressive Web App (PWA)**: Native app-like experience with offline support and push notifications

#### **Payment & Financial System**

- **Multiple Payment Methods**: Cash-on-Hand
- **Hybrid Commission Model**: Dynamic tiered commission structure (3.5%-7%) based on service categories
- **Digital Wallet System**: Real-time balance tracking, transaction history, and automatic commission deduction

#### **Trust & Security**

- **AI-Enhanced Reputation System**: Machine learning algorithms for fraud detection and sentiment analysis
- **Service-Level Verification**: Certificate-based verification system with PDF/image uploads
- **Decentralized Identity**: Secure authentication using Internet Computer's tamper-proof infrastructure
- **Multi-Role Support**: Seamless switching between Client and Service Provider roles

#### **Real-Time Communication**

- **Encrypted Chat System**: Direct messaging between clients and providers after booking completion
- **Push Notifications**: Real-time notifications for bookings, payments, and system updates
- **Cross-Platform PWA**: Works seamlessly across desktop, mobile, and tablet devices

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
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Client PWA    │ │  Provider PWA   │ │   Admin PWA     │ │ Push Notification│   │
│  │  (React/Vite)   │ │  (React/Vite)   │ │  (React/Vite)   │ │   Service Worker │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          Internet Computer Protocol (ICP)                            │
│                               Backend Canister Layer                                 │
│                                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │    Auth     │ │   Service   │ │   Booking   │ │   Review    │ │ Reputation  │   │
│  │  Canister   │ │  Canister   │ │  Canister   │ │  Canister   │ │  Canister   │   │
│  │             │ │             │ │             │ │             │ │             │   │
│  │ • User Auth │ │ • Service   │ │ • Booking   │ │ • Reviews   │ │ • AI Score  │   │
│  │ • Identity  │ │   Management│ │   Lifecycle │ │ • Ratings   │ │ • Trust     │   │
│  │ • Roles     │ │ • Packages  │ │ • Payments  │ │ • Feedback  │ │   Levels    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ Commission  │ │   Wallet    │ │    Chat     │ │    Media    │ │ Notification│   │
│  │  Canister   │ │  Canister   │ │  Canister   │ │  Canister   │ │  Canister   │   │
│  │             │ │             │ │             │ │             │ │             │   │
│  │ • Dynamic   │ │ • Balance   │ │ • Encrypted │ │ • Image     │ │ • Push      │   │
│  │   Rates     │ │   Tracking  │ │   Messaging │ │   Storage   │ │   Messages  │   │
│  │ • Tiers     │ │ • Transactions│ │ • Real-time │ │ • Certificates│ │ • Events  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                                   │
│  │  Remittance │ │    Admin    │ │   Feedback  │              ┌─────────────┐     │
│  │  Canister   │ │  Canister   │ │  Canister   │              │     LLM     │     │
│  │             │ │             │ │             │              │  Canister   │     │
│  │ • Cash      │ │ • System    │ │ • Platform  │              │ (External)  │     │
│  │   Collection│ │   Management│ │   Feedback  │              │             │     │
│  │ • Settlement│ │ • User Roles│ │ • Analytics │              │ • Sentiment │     │
│  └─────────────┘ └─────────────┘ └─────────────┘              │   Analysis  │     │
│                                                                │ • AI Tasks  │     │
│                                                                └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          External Services Layer                                     │
│                                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Firebase  │ │   Xendit    │ │  Firestore  │ │   GCash     │ │   Cloud     │   │
│  │   Cloud     │ │   Payment   │ │  Database   │ │   Payments  │ │ Messaging   │   │
│  │  Functions  │ │   Gateway   │ │             │ │             │ │   (FCM)     │   │
│  │             │ │             │ │ • Payment   │ │ • Digital   │ │             │   │
│  │ • Payment   │ │ • Invoice   │ │   Tracking  │ │   Wallets   │ │ • Push      │   │
│  │   Processing│ │   Creation  │ │ • Provider  │ │ • Instant   │ │   Notifications│   │
│  │ • Webhooks  │ │ • Payout    │ │   Onboarding│ │   Transfers │ │ • Cross     │   │
│  │ • Integration│ │   Management│ │ • Audit     │ │             │ │   Platform  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
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

- **Stable Memory**: Critical data persistence across canister upgrades
- **Trie Data Structures**: Efficient key-value storage for scalable operations
- **Principal-Based Security**: Decentralized identity and authorization
- **Event-Driven Updates**: Real-time synchronization across canisters

---

## Technical Challenges & Solutions

Throughout the development of this decentralized marketplace, we encountered and solved numerous complex technical challenges:

### **Challenge 1: Cross-Platform Payment Integration**

**Problem**: Integrating traditional payment systems (Xendit) with decentralized ICP infrastructure while maintaining security and reliability.

**Solution**:

- Implemented Firebase Cloud Functions as a bridge between ICP canisters and external payment APIs
- Created a payment holding system where funds are escrowed until service completion
- Developed comprehensive webhook handling for real-time payment status synchronization
- Built fallback mechanisms using Firestore for payment tracking when APIs are unavailable

### **Challenge 2: Dynamic Commission Calculation**

**Problem**: Creating a fair, transparent commission system that adapts to different service categories and price ranges.

**Solution**:

- Designed a hybrid commission model with base fees (₱25-₱50) plus percentage rates (3.5%-7%)
- Implemented tiered structures: Tier A (7%), Tier B (5%), Tier C (3.5%) based on service categories
- Pre-calculated commission fees during service creation for faster booking acceptance
- Integrated commission validation to prevent providers from accepting bookings without sufficient wallet balance

### **Challenge 3: Real-Time Canister Communication**

**Problem**: Ensuring seamless data flow between 13+ independent canisters without creating circular dependencies.

**Solution**:

- Implemented a centralized canister reference system with `setCanisterReferences()` functions
- Created singleton actor patterns to prevent multiple actor instantiations
- Designed async inter-canister calls with proper error handling and fallback mechanisms
- Established clear data flow patterns: Auth → Service → Booking → Payment → Notification

### **Challenge 4: Progressive Web App Implementation**

**Problem**: Creating a native app-like experience while maintaining cross-platform compatibility and offline functionality.

**Solution**:

- Implemented comprehensive service worker with browser-specific handling
- Created custom PWA installation prompts with manual fallbacks for unsupported browsers
- Integrated Firebase Cloud Messaging for cross-platform push notifications
- Developed browser capability detection with limitation warnings for optimal UX

### **Challenge 5: AI-Powered Reputation System**

**Problem**: Implementing trustworthy reputation scoring while preventing gaming and fraud.

**Solution**:

- Integrated external LLM canister for sentiment analysis of reviews
- Developed composite scoring algorithms combining completion rates, review sentiment, and user behavior
- Implemented fraud detection patterns for suspicious review activities
- Created transparent trust level badges with explanatory descriptions

### **Challenge 6: Multi-Payment Method Support**

**Problem**: Supporting Cash-on-Hand, digital payments (GCash), and platform wallets with different validation requirements.

**Solution**:

- Created flexible payment method enums with variant types in Motoko
- Implemented payment-specific validation logic (commission checks for cash, balance verification for wallets)
- Developed payment holding and release mechanisms for digital payments
- Built automatic commission deduction systems with detailed transaction logging

### **Challenge 7: Development Environment Consistency**

**Problem**: Ensuring consistent development experience across different environments (local, emulator, production).

**Solution**:

- Implemented comprehensive devcontainer setup with all required dependencies
- Created environment-aware configuration systems for canister communication
- Developed mock payment systems for development when API access is restricted
- Built automated testing infrastructure with PocketIC for canister integration testing

### **Challenge 8: State Management & Data Persistence**

**Problem**: Managing complex application state across multiple canisters while ensuring data consistency and persistence.

**Solution**:

- Implemented stable Trie data structures for efficient key-value storage
- Created comprehensive upgrade-safe data persistence patterns
- Developed event-driven state synchronization between frontend and canisters
- Built robust error handling with proper transaction rollback mechanisms

---

## Advanced Features & Improvements

### **Recent Major Enhancements**

#### **Payment Integration System (Features 1.0 - 3.4)**

- **Hybrid Commission Model**: Dynamic tiered commission structure with Tier A (7%), Tier B (5%), and Tier C (3.5%) based on service categories
- **Integrated Wallet System**: Persistent actor structure with stable Trie storage for user balances and transaction history
- **Payment Holding Mechanism**: Secure escrow system where digital payments are held until service completion, then released to providers
- **Multi-Environment Support**: Seamless operation across local, emulator, and production environments with automatic API fallbacks

#### **Frontend Migration & Optimization**

- **Next.js to React Router Migration**: Improved performance and simplified architecture with centralized state management
- **PWA Infrastructure**: Native app-like experience with offline support, push notifications, and cross-browser installation prompts
- **Real-Time Communication**: Encrypted chat system with automatic conversation management post-booking completion
- **Enhanced UI/UX**: Optimized loading states, React.memo optimizations, and comprehensive error handling

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

This project uses a **devcontainer** for consistent development environthements:

- Clone this repository
- Open in VS Code and reopen in container when prompted
- Or use GitHub Codespaces with 4-core 16GB RAM configuration

### 2. Install Dependencies

```bash
npm install
mops install
```

### 3. Running Ollama (For AI Features)

To enable AI-powered features locally, you'll need Ollama for LLM processing:

```bash
ollama serve
# Expected to start listening on port 11434
```

In a separate terminal, download the required model:

```bash
ollama run llama3.1:8b
```

Once loaded, you can terminate with `/bye`. This step only needs to be done once.

### 4. Deployment

Start the local Internet Computer replica:

```bash
dfx start --clean
```

Deploy the canisters:

```bash
dfx deploy # deploys the backend and frontend canisters
```

Deploy LLM dependencies:

```bash
dfx deps pull
dfx deps deploy  # deploys the llm canister
```

### 5. Start Development Server

```bash
npm start
```

The frontend will be available at `http://localhost:5173`

### 6. Run Tests

```bash
npm test
```

For specific test files:

```bash
npm test tests/src/backend.test.ts    # individual test
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
│   ├── dfx.json                              # ICP canister configuration
│   ├── mops.toml                             # Motoko package configuration
│   ├── firebase.json                         # Firebase services configuration
│   └── firestore.rules                       # Firestore security rules
│
├── Frontend Applications
│   ├── src/frontend/                         # Main React + TypeScript PWA
│   │   ├── src/
│   │   │   ├── App.tsx                       # Main application component
│   │   │   ├── components/                   # Reusable UI components
│   │   │   ├── services/                     # Canister service integrations
│   │   │   ├── pages/                        # Page-level components
│   │   │   ├── hooks/                        # Custom React hooks
│   │   │   └── context/                      # React context providers
│   │   └── vite.config.ts                    # Build configuration
│   └── src/admin/                            # Admin dashboard PWA
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
│       ├── onboardProvider.js                # Xendit customer creation
│       ├── createDirectPayment.js            # Payment invoice generation
│       ├── createTopupInvoice.js             # Wallet top-up processing
│       ├── xenditWebhook.js                  # Payment status webhooks
│       ├── releaseHeldPayment.js             # Escrow payment release
│       ├── checkInvoiceStatus.js             # Payment status verification
│       ├── checkProviderOnboarding.js        # Provider validation
│       ├── getPaymentData.js                 # Payment data retrieval
│       └── utils/canisterConfig.js           # Multi-environment canister communication
│
├── Generated Interfaces
│   └── src/declarations/                     # Auto-generated canister interfaces
│       ├── auth/                            # Authentication canister types
│       ├── booking/                         # Booking canister types
│       ├── service/                         # Service canister types
│       └── [other-canisters]/               # Additional canister type definitions
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
    └── docs/                                # Additional documentation
        └── phone-verification-setup.md      # Setup guides
```

### **Architecture Highlights**

#### **Frontend Layer**

- **Multi-App Structure**: Separate PWAs for client, provider, and admin interfaces
- **Shared Components**: Reusable UI components across all applications
- **Service Integration**: Dedicated service layers for each canister interaction
- **State Management**: Centralized context providers with React hooks

#### **Backend Layer**

- **Microservices Architecture**: 13 specialized canisters for different domain functions
- **Inter-Canister Communication**: Sophisticated reference system for data flow
- **Stable Storage**: Upgrade-safe data persistence using Trie structures
- **Type Safety**: Comprehensive Motoko type definitions for all data structures

#### **Integration Layer**

- **Firebase Cloud Functions**: Bridge between ICP and external payment systems
- **Webhook Handling**: Real-time payment status synchronization
- **Multi-Environment Support**: Seamless operation across development and production
- **API Abstraction**: Clean interfaces for external service integration

---

## Testing Patterns

The project uses a comprehensive testing approach:

- **Backend Tests**: PocketIC for canister integration testing
- **Frontend Tests**: Vitest for React component and service testing
- **End-to-End**: Automated workflows testing critical user paths

Run tests during development:

```bash
npm test                                   # All tests
npm test tests/src/backend.test.ts        # Backend only
npm test src/frontend/tests/              # Frontend only
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
- [Vitest Testing Guide](https://vitest.dev/)
- [GitHub Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization)

---

## Contributing

We welcome contributions to improve the marketplace! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

For bugs or feature requests, please open an issue with detailed information.

---

**Build the future of local services with decentralized trust**
