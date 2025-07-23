/**
 * Pauses execution for the specified duration.
 * @param ms The time to sleep in milliseconds
 * @returns A promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage example:
// async function example() {
//   console.log('Before sleeping');
//   await sleep(1000); // Sleep for 1 second
//   console.log('After sleeping');
// }
