// This file runs before all tests (configured in bunfig.toml)
// It uses Bun's mock.module() to mock firebase-admin and other dependencies

import { mock } from "bun:test";

// Create shared mock Firestore instance
const mockFirestore = {
  collection: mock(() => ({
    doc: mock(() => ({
      get: mock(() => Promise.resolve({ exists: false })),
      set: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
    })),
    where: mock(() => ({
      where: mock(() => ({
        get: mock(() => Promise.resolve({ size: 0, forEach: mock() })),
      })),
      get: mock(() => Promise.resolve({ size: 0, forEach: mock() })),
    })),
  })),
};

// Mock the firebase-admin npm package
mock.module("firebase-admin", () => ({
  apps: [],
  app: mock(() => ({})),
  initializeApp: mock(),
  firestore: mock(() => mockFirestore),
  auth: mock(() => ({})),
}));

// Mock firebase-admin/firestore subpath
mock.module("firebase-admin/firestore", () => ({
  getFirestore: mock(() => mockFirestore),
}));

// Export the mock for use in tests
export { mockFirestore };
