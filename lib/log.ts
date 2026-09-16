export function logApiError(route: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ level: 'error', route, message, timestamp: new Date().toISOString() }))
}
