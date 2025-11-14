/**
 * Get CORS headers with allowlist-based origin validation
 *
 * Security: Only allows origins in the ALLOWED_ORIGINS environment variable.
 * Falls back to '*' for backward compatibility when no allowlist is configured.
 *
 * @param request - The incoming request to extract Origin header from
 * @param allowedOrigins - Array of allowed origins (from env.ALLOWED_ORIGINS)
 * @returns HeadersInit object with appropriate CORS headers
 */
export function getCorsHeaders(request: Request, allowedOrigins: string[] = []): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  const origin = request.headers.get('Origin');

  // If allowlist is configured and origin is present
  if (allowedOrigins.length > 0 && origin) {
    // Only echo back origin if it's in the allowlist
    if (allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin'; // Important for cache safety
    } else {
      // Origin not in allowlist - fall back to wildcard
      headers['Access-Control-Allow-Origin'] = '*';
    }
  } else {
    // No allowlist configured or no origin header - fall back to wildcard
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

/**
 * Handle CORS preflight OPTIONS requests
 *
 * @param request - The incoming OPTIONS request
 * @param allowedOrigins - Array of allowed origins
 * @returns Response with 204 status and CORS headers
 */
export function handleOptions(request: Request, allowedOrigins: string[] = []): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, allowedOrigins),
  });
}