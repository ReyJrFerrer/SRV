const { describe, test, expect, beforeEach, mock } = require("bun:test");

const {
  analyzeReviewContent,
  shouldTriggerReport,
} = require("../../functions/src/utils/reviewAnalyzer");

describe("queueReviewAnalysis integration", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  describe("analyzeReviewContent with mocked Firestore", () => {
    test("returns error for review without ID", async () => {
      const result = await analyzeReviewContent({ comment: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review object with ID is required");
    });

    test("returns error for null review", async () => {
      const result = await analyzeReviewContent(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review object with ID is required");
    });

    test("returns error for undefined review", async () => {
      const result = await analyzeReviewContent(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review object with ID is required");
    });
  });

  describe("shouldTriggerReport integration", () => {
    test("combines AI and rating analysis correctly", () => {
      const aiHighConfidence = {
        analyzed: true,
        threatLevel: "high",
        confidence: 0.9,
      };
      expect(shouldTriggerReport(aiHighConfidence)).toBe(true);

      const aiLow = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.5,
      };
      const ratingSuspicious = {
        isSuspicious: true,
        confidence: 0.9,
      };
      expect(shouldTriggerReport(aiLow, ratingSuspicious)).toBe(true);

      const aiLowLowConfidence = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.5,
      };
      const ratingNotSuspicious = {
        isSuspicious: false,
        confidence: 0.9,
      };
      expect(shouldTriggerReport(aiLowLowConfidence, ratingNotSuspicious)).toBe(false);
    });
  });
});
