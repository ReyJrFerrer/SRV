# SRV Agent Context

This repository contains a decentralized service marketplace built on the Internet Computer Protocol (ICP) and Firebase.

## Mobile App Recreation (Primary Goal)
Our **main task** is to recreate the mobile app designs from the web frontend (`src/frontend/`) into the new React Native Expo app at `SRV-Mobile/srv-mobile/`.

### Directory Boundaries & Tooling
- **Frontend App**: `src/frontend/`
  - **Framework**: React + Vite + TailwindCSS v4.
  - **Package Manager**: npm (`package-lock.json`).
  - **Purpose**: This is the **source of truth** for the designs you need to recreate.

- **Mobile App**: `SRV-Mobile/srv-mobile/` 
  - **Framework**: React Native with Expo SDK 56 + Expo Router.
  - **Package Manager**: Bun (`bun.lock`). 
  - **Path Aliases**: `@/*` points to `./src/*`.
  - **Styling**: Currently uses standard `StyleSheet.create` and themed components from `@/components/`.
  - **Important**: *Expo SDK 56 has significantly changed. Always refer to the exact versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing any routing or native code.*

### Workflows
1. **Running the Mobile App**:
   The root `package.json` workspaces do NOT include the mobile app. Work directly inside the mobile directory:
   ```bash
   cd SRV-Mobile/srv-mobile
   bun install
   bun run start  # or expo start
   ```

2. **Viewing Original Designs**: 
   To view the original UI that needs to be recreated, run the frontend:
   ```bash
   cd src/frontend
   npm install
   npm run start
   ```
   Inspect the React implementations and Tailwind classes in `src/frontend/src/` to translate them to React Native components.

### Implementation Guidelines
- **Translation**: `src/frontend/` uses Tailwind v4. You must accurately translate web-based Tailwind classes into React Native `StyleSheet` styling. Look for and reuse theme constants in `SRV-Mobile/srv-mobile/src/constants/theme.ts`.
- **Project Setup**: Rely on `SRV-Mobile/srv-mobile/app.json` for Expo configuration. Do not look for or create standard React Native config files (`babel.config.js` or `metro.config.js`) unless absolutely necessary.
- **Strict TypeScript**: Both projects use strict TypeScript. Ensure you maintain type safety when migrating models, contexts, and props from the web to the mobile app.
