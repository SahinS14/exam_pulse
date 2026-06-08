const { fieldError, sendValidationError } = require("./validation");

const stores = new Map();

const cleanupExpiredEntries = (bucket, now, windowMs) => {
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);
};

const createRateLimiter = ({
  keyPrefix,
  windowMs,
  maxRequests,
  message,
  keySelector,
}) => {
  if (!keyPrefix || !windowMs || !maxRequests) {
    throw new Error("Rate limiter requires keyPrefix, windowMs, and maxRequests");
  }

  return (req, res, next) => {
    const now = Date.now();
    const identity =
      (typeof keySelector === "function" && keySelector(req)) ||
      req.ip ||
      "anonymous";
    const bucketKey = `${keyPrefix}:${identity}`;
    const bucket = stores.get(bucketKey) || { timestamps: [] };

    cleanupExpiredEntries(bucket, now, windowMs);

    if (bucket.timestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowMs - (now - bucket.timestamps[0])) / 1000)
      );

      res.set("Retry-After", String(retryAfterSeconds));
      return sendValidationError(
        res,
        [fieldError("rateLimit", message || "Too many requests", "rate_limited")],
        429,
        "Too many requests"
      );
    }

    bucket.timestamps.push(now);
    stores.set(bucketKey, bucket);

    return next();
  };
};

module.exports = {
  createRateLimiter,
};
