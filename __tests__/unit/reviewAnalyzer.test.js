const { describe, test, expect, beforeEach, mock } = require("bun:test");

const {
  analyzeReviewContent,
  analyzeReviewBatch,
  updateReviewWithAnalysis,
  fetchReviewerStats,
  fetchServiceAndProvider,
  shouldTriggerReport,
  SUSPICIOUS_PATTERNS,
} = require("../../functions/src/utils/reviewAnalyzer");

const {
  generateContentWithJSON,
  isCacheValid,
  getGeminiConfig,
} = require("../../functions/src/utils/geminiClient");

describe("reviewAnalyzer", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  describe("SUSPICIOUS_PATTERNS", () => {
    test("contains expected pattern types", () => {
      expect(SUSPICIOUS_PATTERNS).toContain("template_language");
      expect(SUSPICIOUS_PATTERNS).toContain("generic_content");
      expect(SUSPICIOUS_PATTERNS).toContain("fake_review_characteristics");
      expect(SUSPICIOUS_PATTERNS).toContain("rating_mismatch");
      expect(SUSPICIOUS_PATTERNS).toContain("competitive_sabotage");
      expect(SUSPICIOUS_PATTERNS).toContain("repeated_structure");
      expect(SUSPICIOUS_PATTERNS).toContain("suspicious_timing");
      expect(SUSPICIOUS_PATTERNS).toContain("coordinated_pattern");
    });

    test("is an array with 8 patterns", () => {
      expect(Array.isArray(SUSPICIOUS_PATTERNS)).toBe(true);
      expect(SUSPICIOUS_PATTERNS.length).toBe(8);
    });
  });

  describe("shouldTriggerReport", () => {
    test("returns false when aiAnalysis is null", () => {
      expect(shouldTriggerReport(null)).toBe(false);
    });

    test("returns false when aiAnalysis is undefined", () => {
      expect(shouldTriggerReport(undefined)).toBe(false);
    });

    test("returns false when aiAnalysis.analyzed is false", () => {
      expect(shouldTriggerReport({ analyzed: false })).toBe(false);
    });

    test("returns true for high threat with confidence >= 0.7", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "high",
        confidence: 0.75,
      };

      expect(shouldTriggerReport(aiAnalysis)).toBe(true);
    });

    test("returns false for high threat with confidence < 0.7", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "high",
        confidence: 0.65,
      };

      expect(shouldTriggerReport(aiAnalysis)).toBe(false);
    });

    test("returns true for medium threat with confidence >= 0.85", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "medium",
        confidence: 0.9,
      };

      expect(shouldTriggerReport(aiAnalysis)).toBe(true);
    });

    test("returns false for medium threat with confidence < 0.85", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "medium",
        confidence: 0.8,
      };

      expect(shouldTriggerReport(aiAnalysis)).toBe(false);
    });

    test("returns false for low threat regardless of confidence", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.95,
      };

      expect(shouldTriggerReport(aiAnalysis)).toBe(false);
    });

    test("returns true when rating analysis is suspicious with high confidence", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.5,
      };
      const ratingAnalysis = {
        isSuspicious: true,
        confidence: 0.85,
      };

      expect(shouldTriggerReport(aiAnalysis, ratingAnalysis)).toBe(true);
    });

    test("returns false when rating analysis is not suspicious", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.5,
      };
      const ratingAnalysis = {
        isSuspicious: false,
        confidence: 0.9,
      };

      expect(shouldTriggerReport(aiAnalysis, ratingAnalysis)).toBe(false);
    });

    test("returns false when rating analysis confidence < 0.8", () => {
      const aiAnalysis = {
        analyzed: true,
        threatLevel: "low",
        confidence: 0.5,
      };
      const ratingAnalysis = {
        isSuspicious: true,
        confidence: 0.7,
      };

      expect(shouldTriggerReport(aiAnalysis, ratingAnalysis)).toBe(false);
    });

    test("handles boundary confidence values correctly", () => {
      const highThreatLowConfidence = {
        analyzed: true,
        threatLevel: "high",
        confidence: 0.7,
      };
      expect(shouldTriggerReport(highThreatLowConfidence)).toBe(true);

      const mediumThreatBoundary = {
        analyzed: true,
        threatLevel: "medium",
        confidence: 0.85,
      };
      expect(shouldTriggerReport(mediumThreatBoundary)).toBe(true);
    });
  });

  describe("analyzeReviewContent", () => {
    test("returns error for review without ID", async () => {
      const result = await analyzeReviewContent({ comment: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Review object with ID is required");
    });

    test("returns error when analysis is disabled", async () => {
      const original = process.env.GEMINI_ANALYSIS_ENABLED;
      process.env.GEMINI_ANALYSIS_ENABLED = "false";

      const result = await analyzeReviewContent({ id: "review-123", comment: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("AI analysis is disabled");

      process.env.GEMINI_ANALYSIS_ENABLED = original;
    });
  });
});
