export function compareResults(
  userSql,
  solutionSql,
  { ignoreOrder = true } = {},
) {
  // Empty vs non-empty
  if (solutionSql.rows.length === 0 && userSql.rows.length !== 0) {
    return fail("EXPECTED_EMPTY_RESULT", "Expected empty result, but got rows");
  }

  if (solutionSql.rows.length !== 0 && userSql.rows.length === 0) {
    return fail(
      "UNEXPECTED_EMPTY_RESULT",
      "Your query returned no rows, but rows were expected",
    );
  }

  //  Columns mismatch
  if (!sameColumns(userSql.columns, solutionSql.columns)) {
    return fail("COLUMN_MISMATCH", "Returned columns do not match expected", {
      expected: solutionSql.columns,
      got: userSql.columns,
    });
  }

  //  Row count mismatch
  if (userSql.rows.length !== solutionSql.rows.length) {
    return fail(
      "ROW_COUNT_MISMATCH",
      `Expected ${solutionSql.rows.length} rows but got ${userSql.rows.length}`,
      {
        expected: solutionSql.rows.length,
        got: userSql.rows.length,
      },
    );
  }

  //  Order matters
  if (!ignoreOrder) {
    for (let i = 0; i < userSql.rows.length; i++) {
      if (!rowEqual(userSql.rows[i], solutionSql.rows[i])) {
        return fail(
          "ROW_ORDER_MISMATCH",
          "Rows are correct but order is incorrect",
        );
      }
    }
  }

  //  Value mismatch
  const userRows = ignoreOrder ? sortRows(userSql.rows) : userSql.rows;
  const solutionSqlRows = ignoreOrder
    ? sortRows(solutionSql.rows)
    : solutionSql.rows;

  for (let i = 0; i < userRows.length; i++) {
    if (!rowEqual(userRows[i], solutionSqlRows[i])) {
      return fail(
        "VALUE_MISMATCH",
        "Some row values do not match expected output",
        {
          rowIndex: i,
          expected: solutionSqlRows[i],
          got: userRows[i],
        },
      );
    }
  }

  return { isCorrect: true };
}

// helpers
function fail(type, message, details = null) {
  return { isCorrect: false, type, message, details };
}

function sameColumns(a, b) {
  return a.length === b.length && a.every((col, i) => col === b[i]);
}

function rowEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sortRows(rows) {
  return [...rows].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
}
