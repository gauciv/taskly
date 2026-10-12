/**
 * Centralized logger — the ONLY place console.* is allowed (behind __DEV__ guard).
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, error);
  }
}
