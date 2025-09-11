# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## Payment Integration Feature

### Added

- feature - 1.0: Created src/backend/function/commission.mo to house the Hybrid Commission Model logic with Tier A (7% base), Tier B (5% base), and Tier C (3.5% base) progressive commission structures
- feature - 1.1: Created src/backend/function/wallet.mo with persistent actor structure and stable Trie storage for user balances and transaction history
- feature - 1.2: Implemented core wallet functions including get_balance(), credit(), debit(), and transfer() with proper authorization controls and transaction recording
- feature - 1.3: Integrated commission and wallet canisters with booking system - providers must have sufficient wallet balance before accepting bookings, and commission is automatically deducted from wallet upon cash job completion
- feature - 1.4: Updating canister configurations in dfx.json by adding commission and wallet

### Changed

- feature - 1.0 improvement: Enhanced commission.mo with dynamic fee structure including base fees (₱25-₱50), more granular breakpoints, and realistic rates for Philippine market
- feature - 1.0 improvement: Updated commission.mo category mapping to use actual service categories from staticData.mo (Gadget Technicians, Automobile Repairs, Photographer, etc.)

### Fixed

- Fix duplicate push notifications by tracking sent notifications in localStorage and preventing spam on navigation
- Fix same-day booking slot availability display to correctly show booked slots as unavailable
- Fix service media images not loading in ServiceListItem and provider services page

### Added

- Add active service call-to-action reminder components for quick access to in-progress bookings
- Add report submission functionality for users to report platform issues
- Add validation to disable service deactivation and deletion when active bookings exist
- Make review comments optional for booking submissions, allowing users to submit star ratings without requiring text feedback
- Add booking completion tracking with payment amount and service duration calculation
- Add enhanced booking completion with automatic service time calculation and payment tracking
- Add feedback system for users to submit ratings and reviews on app experience
- Add AdminFeedback component to display feedback statistics and individual feedback items in admin dashboard
- Enhanced PWA and push notification cross-browser compatibility with comprehensive browser detection
- Improved VAPID key handling with Safari-specific compatibility fixes
- Browser-specific installation instructions and troubleshooting guides
- Enhanced service worker with browser-specific caching and push notification handling
- Comprehensive logging and error handling for debugging PWA issues across browsers
- Mobile PWA installation detection and improved support for iOS Safari
- Edge browser PWA installation support with manual installation instructions
- Brave browser push notification compatibility improvements
- Real-time browser capability detection and limitation warnings
- Enhanced PWA state management with browser information integration
- Time validation for same-day booking slots to prevent booking past time slots

### Fixed

- Safari InvalidAccessError with VAPID key conversion using improved base64 handling
- Brave browser push service errors with enhanced notification permission handling
- Edge browser PWA installation issues with manual installation fallbacks
- Mobile browser PWA installation unavailability with proper device detection
- Cross-browser service worker compatibility issues with browser-specific handling

### Improved

- Connect existing notification hooks to PWA push notification system for real-time notifications
- Add notification integration service to handle push notifications for both clients and providers
- Add enhanced notification hooks with automatic push notification triggering when new notifications are detected
- Add Progressive Web App (PWA) infrastructure with service worker, web app manifest, and offline support
- Add push notification system with Firebase Cloud Messaging integration for real-time notifications
- Add PWA install prompt component for native app-like installation on mobile and desktop devices
- Add notification settings component for managing push notification preferences
- Convert Next.js client components to React Router DOM for improved navigation and routing
- Replace Next.js Head component with native document.title manipulation in search results page
- Replace Next.js Head component with native document.title manipulation in chat page
- Replace Next.js Head component with native document.title manipulation in service pages (view-all, service detail, service reviews)
- Replace Next.js router with React Router DOM in booking review page
- Replace Next.js router with React Router DOM in category pages and AuthContext integration
- Replace Next.js router with React Router DOM in all booking-related pages (index, details, confirmation, book)
- Add full-screen image modal for viewing payment proof media in admin dashboard with download functionality
- Add getAllServiceProvidersWithCommissionData function to remittance canister with auth canister integration for provider details
- Add comprehensive useAdmin React hook with granular loading states and error handling for admin dashboard functionality

### Added

- Add Progressive Web App (PWA) infrastructure with service worker, web app manifest, and offline support
- Add push notification system with Firebase Cloud Messaging integration for real-time notifications
- Add PWA install prompt component for native app-like installation on mobile and desktop devices
- Add dedicated modals for PWA installation and notification settings accessible from home pages and settings
- Add notification settings component for managing push notification preferences
- Add full-screen image modal for viewing payment proof media in admin dashboard with download functionality
- Add getAllServiceProvidersWithCommissionData function to remittance canister with auth canister integration for provider details
- Add comprehensive useAdmin React hook with granular loading states and error handling for admin dashboard functionality
- Add comprehensive admin service canister interface with commission rules, user roles, and system settings management
- Add comprehensive remittance management hook with provider dashboard and analytics functionality
- Simplify remittance system by removing FINOPS/COLLECTOR roles with direct service provider to admin workflow
- Add intercanister communication between admin and remittance canisters for commission validation
- Add admin canister for remittance system role management and commission rule administration
- Add remittance system for service provider cash collection and settlement management
- Add GPS-based service distance calculation using Haversine formula with real-time location detection
- Add service-level certificate verification system with PDF and image certificate uploads replacing user-level verification
- Add frontend service image management hooks and utilities with support for galleries
- Add separate reputation scoring system for service providers with completion-based rewards
- Integrate image processing utilities in service creation workflow with support for optional image uploads

### Fixed

- Fix location persistence across browser sessions and page reloads in client header
- Fix location state synchronization between context and component in header component
- Add immediate UI feedback for service image upload and removal operations with proper Save/Cancel workflow

### Changed

- Remove user-level verification system in favor of service-level verification
- Replace user isVerified field with service-level certificate verification system

### Fixed

- Fix media canister ID generation to prevent duplicate IDs when uploading multiple images simultaneously
- Replace placeholder images with actual service images in ServiceDetailPage gallery using useImageLoader hook
- Enhance chat pages with profile picture loading using useImageLoader hook with loading skeletons and fallback support

### Added

- Add frontend service image management hooks and utilities with support for galleries
- Add service image upload and management with support for up to 5 images per service
- Add HTTP interface for serving images with proper URLs in media canister
- Add media storage canister for handling user profile image uploads with 450KB size limit
- Add provider reputation score display in service detail pages with real-time fetching
- Add multi-role state system with activeRole field while preserving original user roles
- Add optional notes field to booking creation for client-provider communication

## [Unreleased]

### Added

- Add self-booking prevention validation on service detail page with tooltip feedback
- Add user role switching functionality allowing users to toggle between Client and ServiceProvider roles while preserving all data
- Add separate provider notifications hook with dedicated notification types and localStorage storage
- Add provider-specific notification types including booking requests, payment completion, and service reminders
- Update frontend updateService function to support location, weeklySchedule, instantBookingEnabled, and maxBookingsPerDay parameters

- Add service creation functionality with step-by-step form validation and backend error handling
- Add form validation for service details, availability, and location with proper field highlighting
- Add backend integration for service creation with comprehensive error handling and success navigation
- Add validation to prevent service editing/deletion when provider has active bookings
- Add disabled state with tooltips for edit/delete buttons when active bookings exist
- Integrate useProviderBookingManagement hook for real-time booking status validation
- Add enhanced location tracking with GPS detection and comprehensive Philippine address forms to service creation and editing
- Convert service edit page to multi-step wizard matching add page UI pattern while preserving existing functionality
- Convert service edit page to multi-step wizard with improved UI components

### Fixed

- Fix multiple re-rendering issue in client home page causing components to flicker and load multiple times
- Optimize ServiceListItem component by removing individual review loading and using service rating data directly
- Add React.memo optimization to ServiceListItem and Categories components to prevent unnecessary re-renders
- Fix useAllServicesWithProviders hook to prevent rapid appearing/disappearing of components during data loading
- Add improved loading skeletons to ServiceList component that match actual service card layout
- Remove artificial delays in useCategories hook that were causing timing-related flickering issues

### Added

- Add frontend chat integration with real-time messaging, conversation management, and notification system
- Add encrypted chat system enabling direct messaging between clients and service providers after booking completion
- Add automatic canister references initialization upon successful user login for improved system connectivity
- Add smart conversation management to service detail chat feature with automatic conversation creation and existing conversation detection

### Fixed

- Fix font loading issue where pages reverted to Times New Roman on reload by centralizing font definitions globally
- Fix chat loading state flickering by implementing separate loading states for initial load vs background updates
- Add provider-specific trust level descriptions in service provider profile page
- Standardize chat routing structure between client and provider interfaces for consistent navigation
- Add client analytics system with real booking data integration for profile statistics display
- Add AI-powered sentiment analysis integration in reputation canister using LLM for enhanced review quality assessment
- Add real-time reputation score display with trust level badges and explanatory text in user profile pages
- Add AI-powered sentiment analysis for review processing using LLM integration
- Add real-time reputation score display in user profiles with separate data fetching
- Optimize setCanisterReferences functions to use singleton actors and direct canister ID imports
- Implement comprehensive router navigation with nested layouts and protected routes for client and provider sections

### Fixed

- Fix infinite loading bug in provider service details page caused by callback dependency issue
- Fix authentication bug preventing authenticated canister calls by implementing identity-aware auth service
- Convert Next.js client components to React Router DOM for improved navigation and routing
- Replace Next.js Head component with native document.title manipulation in search results page
- Replace Next.js Head component with native document.title manipulation in chat page
- Replace Next.js Head component with native document.title manipulation in service pages (view-all, service detail, service reviews)
- Replace Next.js router with React Router DOM in booking review page
- Replace Next.js components with React Router DOM in category pages
- Replace bundly/ares-react with custom AuthContext in service management for better authentication control
- Convert Next.js provider components to React Router DOM for services and bookings pages
- Replace bundly/ares-react with custom AuthContext in provider service forms (add/edit)
- Convert provider workflow pages (active-service, complete-service, receipt, review) from Next.js to React Router DOM
- Add set_count update method to allow setting the counter to a specific value
- Add frontend development server scripts (`npm run start`)
- Add LLM canister implementation
- Decouple service canister with dedicated type system and interface definitions
- Add profile switching functionality for seamless client/provider role transitions
- Add enhanced security measures with user suspension, verification management, and activity tracking
- Refactor canister services with consistent actor creation and authentication handling

### Changed

- Refactor profile creation page to use centralized AuthContext and authCanisterService
- Refactor logout hook to use centralized AuthContext and React Router navigation
- Replace @bundly/ares-react with local AuthContext in chat page for better authentication control
- Replace @bundly/ares-react with local AuthContext in category pages for better authentication control

- Refactor frontend from Next.js to React with react-router-dom for improved performance and simplified architecture
- Update dependencies to latest versions
- Switched the template to Motoko for writing the backend canister
- Rewrote the devcontainer setup
- Rewrote the tests
- Rewrote the npm scripts
- Rewrote the e2e workflow
- Fix mops installation in CI workflow by using npx

## [0.1.0] - 2025-04-24

### Added

- Basic canister structure with Rust
- Counter functionality with increment and get_count methods
- Greeting functionality
- PocketIC testing infrastructure
- Vitest test runner configuration
- GitHub CI workflow for automated end-to-end tests for all methods
- Project documentation
- Add custom instructions for github copilot
