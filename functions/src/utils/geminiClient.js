let genAI = null;
let cachedModel = null;

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_CACHE_TTL_HOURS = 24;

/**
 * Get Gemini configuration from environment variables (Secret Manager)
 * @return {Object} Configuration object
 */
function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    analysisEnabled: true,
    confidenceThreshold: parseFloat(process.env.GEMINI_CONFIDENCE_THRESHOLD) ||
      DEFAULT_CONFIDENCE_THRESHOLD,
    cacheTtlHours: parseInt(process.env.GEMINI_CACHE_TTL_HOURS) ||
      DEFAULT_CACHE_TTL_HOURS,
  };
}

/**
 * Initialize Gemini AI client
 * @return {Object|null} Gemini AI instance or null if failed
 */
async function initializeGemini() {
  if (genAI) return genAI;

  const config = getGeminiConfig();

  if (!config.apiKey) {
    console.warn("[GeminiClient] GEMINI_API_KEY not set. AI analysis will be disabled.");
    return null;
  }

  try {
    const {GoogleGenerativeAI} = require("@google/generative-ai");
    genAI = new GoogleGenerativeAI(config.apiKey);
    console.log("[GeminiClient] Initialized with model:", config.model);
    return genAI;
  } catch (error) {
    console.error("[GeminiClient] Failed to initialize:", error);
    return null;
  }
}

/**
 * Get or create cached Gemini model instance
 * @return {Object|null} Gemini model instance or null
 */
async function getModel() {
  if (cachedModel) return cachedModel;

  const genAIInstance = await initializeGemini();
  if (!genAIInstance) return null;

  const config = getGeminiConfig();
  cachedModel = genAIInstance.getGenerativeModel({model: config.model});
  return cachedModel;
}

/**
 * Reset cached Gemini instances
 */
function resetCache() {
  genAI = null;
  cachedModel = null;
}

/**
 * Generate content using Gemini AI
 * @param {string} prompt - Prompt to send to Gemini
 * @param {Object} options - Generation options
 * @return {Promise<Object>} Generation result
 */
async function generateContent(prompt, options = {}) {
  const config = getGeminiConfig();

  if (!config.analysisEnabled) {
    return {success: false, error: "AI analysis is disabled"};
  }

  if (!config.apiKey) {
    return {success: false, error: "GEMINI_API_KEY not configured"};
  }

  const model = await getModel();
  if (!model) {
    return {success: false, error: "Failed to initialize Gemini model"};
  }

  const maxRetries = options.retries || 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const generationConfig = {
        temperature: options.temperature || 0.3,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || 2048,
      };

      const result = await model.generateContent(prompt, generationConfig);
      const response = await result.response;
      const text = response.text();

      return {success: true, text, response};
    } catch (error) {
      lastError = error;
      console.error(`[GeminiClient] Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (error.message?.includes("rate limit") || error.message?.includes("429")) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {success: false, error: lastError?.message || "All retries failed"};
}

/**
 * Generate content and parse response as JSON
 * @param {string} prompt - Prompt to send to Gemini
 * @param {Object} options - Generation options
 * @return {Promise<Object>} Generation result with parsed JSON
 */
async function generateContentWithJSON(prompt, options = {}) {
  const result = await generateContent(prompt, {
    ...options,
    temperature: options.temperature || 0.1,
  });

  if (!result.success) {
    return result;
  }

  try {
    const cleanedText = result.text.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleanedText);
    return {...result, parsed};
  } catch (parseError) {
    console.error("[GeminiClient] Failed to parse JSON response:", parseError);
    return {
      success: false,
      error: "Failed to parse AI response as JSON",
      rawText: result.text,
    };
  }
}

/**
 * Check if cache entry is still valid
 * @param {string} cachedAt - ISO timestamp of cache entry
 * @param {number} ttlHours - TTL in hours
 * @return {boolean} True if cache is valid
 */
function isCacheValid(cachedAt, ttlHours) {
  if (!cachedAt) return false;
  const config = getGeminiConfig();
  const ttlMs = (ttlHours ?? config.cacheTtlHours) * 60 * 60 * 1000;
  if (ttlMs <= 0) return false;
  const elapsed = Date.now() - new Date(cachedAt).getTime();
  return elapsed > 0 && elapsed < ttlMs;
}

module.exports = {
  initializeGemini,
  getModel,
  resetCache,
  generateContent,
  generateContentWithJSON,
  isCacheValid,
  getGeminiConfig,
};
