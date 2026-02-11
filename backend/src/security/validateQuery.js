import { allowedKeywords, bannedKeywords } from "./keywords.js";

export function validateQuery(query) {
  if (!query || typeof query !== "string") {
    return { valid: false, error: "Query must be a non-empty string" };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { valid: false, error: "Query is empty" };
  }

  const lowerCaseQuery = trimmed.toLowerCase();

  //check for single statement
  const semiColons = (lowerCaseQuery.match(/;/g) || []).length;
  if (semiColons > 1) {
    return {
      valid: false,
      error: "Multiple statements detected; only one statement is allowed",
    };
  }
  if (semiColons === 1 && !lowerCaseQuery.endsWith(";")) {
    return {
      valid: false,
      error: "Semicolon detected; only allowed at the end of the query",
    };
  }

  // Remove trailing semicolon for further checks
  const normalizedQuery = lowerCaseQuery.endsWith(";")
    ? lowerCaseQuery.slice(0, -1)
    : lowerCaseQuery;
  // Check for allowed keywords
  const hasAllowed = allowedKeywords.some((keyword) => {
    return normalizedQuery.startsWith(keyword + " ");
  });

  if (!hasAllowed) {
    return {
      valid: false,
      error: "Only SELECT, WITH, or EXPLAIN queries are allowed.",
    };
  }

  // Check for banned keywords anywhere in the query
  for (const keyword of bannedKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalizedQuery)) {
      return {
        valid: false,
        error: `The keyword "${keyword.toUpperCase()}" is not allowed in queries.`,
      };
    }
  }
  return { valid: true };
}
