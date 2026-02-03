/**
 * Supported platforms (India focused)
 */
export const PLATFORMS = {
  GOOGLE: "google",
  META: "meta",
  AMAZON: "amazon",
  FLIPKART: "flipkart",
  LINKEDIN: "linkedin",
  TWITTER: "twitter",
  UNKNOWN: "unknown",
};

/**
 * Platform detection signatures with scoring criteria
 * Order matters - more specific platforms first
 */
const PLATFORM_SIGNATURES = {
  // Most specific platforms first
  [PLATFORMS.FLIPKART]: {
    required: ["seller"],
    strong: ["campaign", "listing", "product_id", "fassured", "orders"],
    identifiers: ["flipkart", "seller_id", "fassured"],
    excludes: ["amazon", "asin"],
    priority: 1,
  },
  [PLATFORMS.META]: {
    required: ["campaign"],
    strong: ["adset", "ad_id", "ad_name", "reach", "frequency"],
    identifiers: [
      "facebook",
      "instagram",
      "fb_pixel",
      "meta",
      "link_clicks",
      "link clicks",
      "purchases",
      "date_start",
      "datestart",
    ],
    excludes: ["google", "amazon", "flipkart", "cost"],
    priority: 1,
  },
  [PLATFORMS.AMAZON]: {
    required: ["campaign"],
    strong: ["asin", "sku", "sponsored", "orders"],
    identifiers: ["amazon", "sponsored products", "sponsored brands", "asin"],
    excludes: ["flipkart", "seller", "cost"],
    priority: 2,
  },
  [PLATFORMS.LINKEDIN]: {
    required: ["campaign"],
    strong: ["leads", "start_at", "startat"],
    identifiers: [
      "linkedin",
      "li_",
      "cost_in_local_currency",
      "costinlocalcurrency",
      "start_at",
      "startat",
    ],
    excludes: ["facebook", "google", "twitter"],
    priority: 2,
  },
  [PLATFORMS.TWITTER]: {
    required: ["campaign"],
    strong: ["tweet_id", "engagements", "retweets"],
    identifiers: [
      "twitter",
      "x ads",
      "promoted tweet",
      "tweet",
      "url_clicks",
      "urlclicks",
    ],
    excludes: ["facebook", "google", "linkedin"],
    priority: 2,
  },
  // Least specific platform last (fallback)
  [PLATFORMS.GOOGLE]: {
    required: ["campaign", "cost"],
    strong: ["impressions", "conversions", "ctr"],
    identifiers: ["google ads", "adwords", "gclid", "cost"],
    excludes: [
      "facebook",
      "meta",
      "instagram",
      "adset",
      "seller",
      "link_clicks",
      "link clicks",
      "purchases",
      "orders",
      "spend",
    ],
    priority: 3,
  },
};

/**
 * Normalize text for comparison (removes spaces, underscores, hyphens, case)
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/[_\s-]/g, "");
}

/**
 * Extract field names from sample data
 */
function extractFieldNames(sample) {
  if (typeof sample === "string") {
    // CSV header row
    return sample.split(",").map((field) => field.trim().toLowerCase());
  }
  // API object
  return Object.keys(sample).map((key) => key.toLowerCase());
}

/**
 * Check if a field exists in the field list (fuzzy matching)
 */
function hasField(fieldNames, targetField) {
  const normalizedTarget = normalizeText(targetField);
  return fieldNames.some((field) => {
    const normalizedField = normalizeText(field);
    return (
      normalizedField.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedField)
    );
  });
}

/**
 * Calculate match score for a platform
 */
function calculatePlatformScore(fieldNames, signature) {
  let score = 0;
  const fieldString = fieldNames.map(normalizeText).join(" ");

  // Check excludes first (disqualifies platform)
  for (const exclude of signature.excludes) {
    const normalizedExclude = normalizeText(exclude);
    if (fieldString.includes(normalizedExclude)) {
      return -1; // Disqualified
    }
  }

  // Check required fields (must have ALL)
  let requiredCount = 0;
  for (const required of signature.required) {
    if (hasField(fieldNames, required)) {
      requiredCount++;
      score += 30; // Very high weight for required fields
    }
  }

  // If missing any required fields, platform doesn't match
  if (requiredCount < signature.required.length) {
    return 0;
  }

  // Check strong indicators (bonus points)
  for (const strong of signature.strong) {
    if (hasField(fieldNames, strong)) {
      score += 10;
    }
  }

  // Check platform identifiers (strong bonus)
  for (const identifier of signature.identifiers) {
    if (fieldString.includes(normalizeText(identifier))) {
      score += 20;
    }
  }

  // Apply priority multiplier (lower priority = lower score)
  const priorityMultiplier = 1 / (signature.priority || 1);
  score = score * priorityMultiplier;

  return score;
}

/**
 * Detect platform from raw rows (CSV headers or API objects)
 * @param {string[]|Object[]} rawRows - Array of CSV strings or API objects
 * @returns {string} Platform identifier
 */
export function detectPlatform(rawRows) {
  if (!rawRows || rawRows.length === 0) return PLATFORMS.UNKNOWN;

  // Extract field names from first row
  const sample = rawRows[0];
  const fieldNames = extractFieldNames(sample);

  if (fieldNames.length === 0) return PLATFORMS.UNKNOWN;

  // Score each platform
  const scores = [];

  for (const [platform, signature] of Object.entries(PLATFORM_SIGNATURES)) {
    const score = calculatePlatformScore(fieldNames, signature);
    if (score > 0) {
      scores.push({
        platform,
        score,
        priority: signature.priority || 999,
      });
    }
  }

  // Sort by score (descending), then by priority (ascending - lower is better)
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.priority - b.priority;
  });

  // Require minimum score threshold to avoid false positives
  const MIN_SCORE_THRESHOLD = 30; // At least one required field must match

  if (scores.length === 0 || scores[0].score < MIN_SCORE_THRESHOLD) {
    return PLATFORMS.UNKNOWN;
  }

  return scores[0].platform;
}

/**
 * Legacy function - kept for backward compatibility
 * Use detectPlatform() instead
 */
export function adaptRows(rawRows, platform) {
  const detectedPlatform = detectPlatform(rawRows);
  return {
    rows: rawRows,
    warnings: { low: 0, medium: 0 },
    platform: detectedPlatform || platform || PLATFORMS.UNKNOWN,
  };
}
