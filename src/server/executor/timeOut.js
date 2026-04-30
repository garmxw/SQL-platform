/**
 * @param {Function} executor - The function that executes the query and returns an object with a promise and process.
 * @param {number} ms - The timeout duration in milliseconds (default is 5000ms).
 * @return {Function} A wrapped function that executes the query with a timeout mechanism.
 * This function wraps the provided executor function to add a timeout mechanism. If the query execution exceeds the specified timeout duration, it will attempt to kill the associated process (if applicable) and reject with a timeout error. If the query completes successfully within the timeout, it resolves with the result.
 */

export function withTimeout(executor, ms = 5000) {
  return async function (...args) {
    const { promise, process } = executor(...args);

    let timeoutId;
    // Create a timeout promise that will reject after the specified duration
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        if (process && !process.killed) {
          process.kill("SIGKILL"); // force kill docker exec
        }
        reject(new Error(`Query timed out after ${ms}ms`));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };
}
