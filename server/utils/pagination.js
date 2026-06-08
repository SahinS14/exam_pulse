const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getPaginationParams(query = {}) {
  const page = parsePositiveInteger(query.page);
  const limit = parsePositiveInteger(query.limit);

  if (!page && !limit) {
    return null;
  }

  const normalizedPage = page || DEFAULT_PAGE;
  const normalizedLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
  };
}

function buildPaginatedResponse({ items, total, page, limit, key = "items" }) {
  return {
    [key]: items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = {
  getPaginationParams,
  buildPaginatedResponse,
};
