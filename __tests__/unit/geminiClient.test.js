const {
  getGeminiConfig,
  isCacheValid,
  resetCache,
} = require("../../functions/src/utils/geminiClient");

describe("geminiClient", () => {
  beforeEach(() => {
    resetCache();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_ANALYSIS_ENABLED;
    delete process.env.GEMINI_CONFIDENCE_THRESHOLD;
    delete process.env.GEMINI_CACHE_TTL_HOURS;
  });

  describe("getGeminiConfig", () => {
    test("returns default values when no env vars set", () => {
      const config = getGeminiConfig();

      expect(config.apiKey).toBe("");
      expect(config.model).toBe("gemini-2.5-flash");
      expect(config.analysisEnabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.cacheTtlHours).toBe(24);
    });

    test("returns custom values when env vars are set", () => {
      process.env.GEMINI_API_KEY = "test-api-key-123";
      process.env.GEMINI_MODEL = "gemini-2.0-flash";
      process.env.GEMINI_ANALYSIS_ENABLED = "false";
      process.env.GEMINI_CONFIDENCE_THRESHOLD = "0.8";
      process.env.GEMINI_CACHE_TTL_HOURS = "48";

      const config = getGeminiConfig();

      expect(config.apiKey).toBe("test-api-key-123");
      expect(config.model).toBe("gemini-2.0-flash");
      expect(config.analysisEnabled).toBe(false);
      expect(config.confidenceThreshold).toBe(0.8);
      expect(config.cacheTtlHours).toBe(48);
    });

    test("handles partial env vars correctly", () => {
      process.env.GEMINI_API_KEY = "partial-key";
      process.env.GEMINI_MODEL = "custom-model";

      const config = getGeminiConfig();

      expect(config.apiKey).toBe("partial-key");
      expect(config.model).toBe("custom-model");
      expect(config.analysisEnabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.7);
      expect(config.cacheTtlHours).toBe(24);
    });

    test("parses invalid confidence threshold to default", () => {
      process.env.GEMINI_CONFIDENCE_THRESHOLD = "invalid";

      const config = getGeminiConfig();

      expect(config.confidenceThreshold).toBe(0.7);
    });

    test("parses invalid cache TTL to default", () => {
      process.env.GEMINI_CACHE_TTL_HOURS = "not-a-number";

      const config = getGeminiConfig();

      expect(config.cacheTtlHours).toBe(24);
    });
  });

  describe("isCacheValid", () => {
    test("returns false when cachedAt is null", () => {
      expect(isCacheValid(null)).toBe(false);
    });

    test("returns false when cachedAt is undefined", () => {
      expect(isCacheValid(undefined)).toBe(false);
    });

    test("returns false when cachedAt is empty string", () => {
      expect(isCacheValid("")).toBe(false);
    });

    test("returns false when cachedAt is missing (no second arg)", () => {
      expect(isCacheValid()).toBe(false);
    });

    test("returns true for cache within TTL", () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

      expect(isCacheValid(fiveMinutesAgo, 24)).toBe(true);
    });

    test("returns true for cache at exactly TTL boundary", () => {
      const now = new Date();
      const ttlHours = 24;
      const exactlyAtBoundary = new Date(now.getTime() - (ttlHours * 60 * 60 * 1000 - 1)).toISOString();

      expect(isCacheValid(exactlyAtBoundary, ttlHours)).toBe(true);
    });

    test("returns false for expired cache", () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

      expect(isCacheValid(twentyFiveHoursAgo, 24)).toBe(false);
    });

    test("returns false for future date (invalid cache)", () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      expect(isCacheValid(future, 24)).toBe(false);
    });

    test("uses config default TTL when ttlHours not provided", () => {
      process.env.GEMINI_CACHE_TTL_HOURS = "1";
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

      const config = getGeminiConfig();
      expect(isCacheValid(thirtyMinutesAgo)).toBe(true);
    });

    test("handles different TTL values correctly", () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

      expect(isCacheValid(twoHoursAgo, 24)).toBe(true);
      expect(isCacheValid(twoHoursAgo, 1)).toBe(false);
    });

    test("handles very small TTL values", () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
      const oneSecondAgo = new Date(now.getTime() - 1000).toISOString();

      expect(isCacheValid(oneMinuteAgo, 0)).toBe(false);
      expect(isCacheValid(oneSecondAgo, 0.001)).toBe(true);
      expect(isCacheValid(oneMinuteAgo, 0.001)).toBe(false);
    });
  });

  describe("resetCache", () => {
    test("resetCache is a function", () => {
      expect(typeof resetCache).toBe("function");
    });

    test("resetCache executes without error", () => {
      expect(() => resetCache()).not.toThrow();
    });
  });
});