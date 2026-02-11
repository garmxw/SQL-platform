/**
 * Wrap any async function and reject if it takes longer than `ms` milliseconds
 * @param {Function} fn - The async executor function
 * @param {number} ms - Timeout in milliseconds
 * @returns {Function} Wrapped function
 */
export function withTimeout(fn, ms = 5000) {
  return async function (...args) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Query timed out after ${ms}ms`));
      }, ms);

      fn(...args)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };
}
