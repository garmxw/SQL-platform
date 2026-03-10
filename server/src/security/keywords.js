export const allowedKeywords = ["select", "with", "explain"];

export const bannedKeywords = [
  // data modification
  "insert",
  "update",
  "delete",
  "drop",
  "truncate",
  "alter",
  "create",
  "replace",
  "merge",

  // database / schema
  "database",
  "schema",

  // execution / procedures
  "call",
  "exec",
  "execute",
  "prepare",
  "deallocate",
  "do",

  // permissions
  "grant",
  "revoke",
  "role",
  "user",
  "password",

  // filesystem / escape
  "attach",
  "detach",
  "copy",
  "load",
  "outfile",
  "dumpfile",

  // transactions
  "begin",
  "commit",
  "rollback",
  "savepoint",

  // dangerous functions
  "sleep",
  "pg_sleep",
  "benchmark",
  "randomblob",
];
