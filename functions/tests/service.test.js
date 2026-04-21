import { test, expect, mock, describe, beforeEach } from "bun:test";

// --- Mocking ---
mock.module("firebase-functions", () => ({
  default: {},
}));

mock.module("firebase-functions/v2/https", () => {
  return {
    onCall: (fn) => fn,
    HttpsError: class HttpsError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    }
  };
});

mock.module("firebase-functions/v2/scheduler", () => {
  return {
    onSchedule: (schedule, fn) => fn
  };
});

mock.module("firebase-admin", () => {
  return {
    firestore: {
      FieldValue: {
        delete: () => "FIRESTORE_DELETE"
      }
    }
  };
});

// Mock firestore DB
const mockGet = mock();
const mockUpdate = mock();
const mockDelete = mock();
const mockSet = mock();
const mockWhere = mock();

const mockDoc = mock((id) => ({
  get: mockGet,
  update: mockUpdate,
  delete: mockDelete,
  set: mockSet,
  ref: { delete: mockDelete }
}));

const mockCollection = mock((name) => {
  const coll = {
    doc: mockDoc,
    where: mockWhere,
    get: mockGet,
  };
  mockWhere.mockReturnValue(coll);
  return coll;
});

const mockDb = {
  collection: mockCollection,
  batch: () => ({
    delete: mock(),
    set: mock(),
    update: mock(),
    commit: mock().mockResolvedValue()
  })
};

mock.module("../firebase-admin", () => {
  return {
    getFirestore: () => mockDb
  };
});

mock.module("../src/media", () => {
  return {
    uploadMediaInternal: async () => ({ id: "m1", url: "http://url" }),
    deleteMediaInternal: async () => {}
  };
});

// --- Import the module after mocking ---
const serviceModule = require("../src/service");

describe("Service Archiving & Deletion", () => {
  beforeEach(() => {
    mockGet.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockSet.mockClear();
    mockWhere.mockClear();
  });

  test("archiveService updates status to Archived and sets dates", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ providerId: "provider1", status: "Available" })
    });

    const request = {
      data: { serviceId: "srv1" },
      auth: { uid: "provider1" }
    };

    const response = await serviceModule.archiveService(request);

    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    
    const updateCallArgs = mockUpdate.mock.calls[0][0];
    expect(updateCallArgs.status).toBe("Archived");
    expect(updateCallArgs.previousStatus).toBe("Available");
    expect(updateCallArgs.archivedAt).toBeDefined();
    expect(updateCallArgs.deletionScheduledAt).toBeDefined();
  });

  test("restoreService sets status back to Available and removes dates", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ 
        providerId: "provider1", 
        status: "Archived", 
        previousStatus: "Available" 
      })
    });

    const request = {
      data: { serviceId: "srv1" },
      auth: { uid: "provider1" }
    };

    const response = await serviceModule.restoreService(request);

    expect(response.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    
    const updateCallArgs = mockUpdate.mock.calls[0][0];
    expect(updateCallArgs.status).toBe("Available");
    expect(updateCallArgs.archivedAt).toBe("FIRESTORE_DELETE");
    expect(updateCallArgs.deletionScheduledAt).toBe("FIRESTORE_DELETE");
  });

  test("permanentDeleteService deletes service and sub-resources", async () => {
    // Service doc GET
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ providerId: "provider1", imageMedia: [], certificateMedia: [] })
    });
    
    // Bookings GET
    mockGet.mockResolvedValueOnce({ empty: true });
    // Reviews GET
    mockGet.mockResolvedValueOnce({ empty: true });
    // ProviderReviews GET
    mockGet.mockResolvedValueOnce({ empty: true });

    const request = {
      data: { serviceId: "srv1" },
      auth: { uid: "provider1" }
    };

    const response = await serviceModule.permanentDeleteService(request);

    expect(response.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
