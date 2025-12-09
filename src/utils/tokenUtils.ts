/**
 * Token utility functions for JWT handling
 */

export interface TokenPayload {
  aud: string;
  exp: number; // Expiry time (Unix timestamp)
  iat: number; // Issued at (Unix timestamp)
  sub: string; // User ID
  email?: string;
  role?: string;
}

/**
 * Decode a JWT token to extract its payload
 * Does NOT validate the signature - only extracts data
 */
export const decodeJWT = (token: string): TokenPayload | null => {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (base64url encoded)
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Get the expiry time of a JWT token
 * @returns Expiry time as a Date object, or null if invalid
 */
export const getTokenExpiry = (token: string): Date | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  return new Date(payload.exp * 1000);
};

/**
 * Get the time until a token expires (in milliseconds)
 * @returns Milliseconds until expiry, or 0 if already expired, or null if invalid
 */
export const getTimeUntilExpiry = (token: string): number | null => {
  const expiryDate = getTokenExpiry(token);
  if (!expiryDate) {
    return null;
  }
  
  const now = Date.now();
  const timeUntilExpiry = expiryDate.getTime() - now;
  return Math.max(0, timeUntilExpiry);
};

/**
 * Check if a token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const timeUntilExpiry = getTimeUntilExpiry(token);
  if (timeUntilExpiry === null) {
    return true; // Invalid token is considered expired
  }
  return timeUntilExpiry <= 0;
};

/**
 * Check if a token will expire soon (within the specified threshold)
 * @param token - JWT token to check
 * @param thresholdMs - Time threshold in milliseconds (default: 5 minutes)
 * @returns true if token will expire within the threshold
 */
export const isTokenExpiringSoon = (token: string, thresholdMs: number = 5 * 60 * 1000): boolean => {
  const timeUntilExpiry = getTimeUntilExpiry(token);
  if (timeUntilExpiry === null) {
    return true;
  }
  return timeUntilExpiry <= thresholdMs && timeUntilExpiry > 0;
};

/**
 * Get a human-readable string of time until expiry
 */
export const getTimeUntilExpiryString = (token: string): string => {
  const timeUntilExpiry = getTimeUntilExpiry(token);
  
  if (timeUntilExpiry === null) {
    return 'Invalid token';
  }
  
  if (timeUntilExpiry <= 0) {
    return 'Expired';
  }
  
  const minutes = Math.floor(timeUntilExpiry / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

/**
 * Get token duration (how long the token is valid for, from issue to expiry)
 * @returns Duration in milliseconds, or null if invalid
 */
export const getTokenDuration = (token: string): number | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp || !payload.iat) {
    return null;
  }
  
  return (payload.exp - payload.iat) * 1000;
};

/**
 * Get token duration in a human-readable format
 */
export const getTokenDurationString = (token: string): string => {
  const duration = getTokenDuration(token);
  
  if (duration === null) {
    return 'Unknown';
  }
  
  const minutes = Math.floor(duration / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

/**
 * Log token information to console (useful for debugging)
 */
export const logTokenInfo = (token: string, label: string = 'Token'): void => {
  const payload = decodeJWT(token);
  
  if (!payload) {
    console.log(`❌ ${label}: Invalid or malformed`);
    return;
  }
  
  const issuedAt = new Date(payload.iat * 1000);
  const expiresAt = new Date(payload.exp * 1000);
  const timeUntilExpiry = getTimeUntilExpiryString(token);
  const duration = getTokenDurationString(token);
  
  console.group(`🔑 ${label} Information`);
  console.log('📧 Email:', payload.email || 'N/A');
  console.log('👤 User ID:', payload.sub);
  console.log('🎭 Role:', payload.role || 'N/A');
  console.log('🕐 Issued:', issuedAt.toLocaleString());
  console.log('⏰ Expires:', expiresAt.toLocaleString());
  console.log('⏱️  Duration:', duration);
  console.log('⏳ Time Remaining:', timeUntilExpiry);
  console.log('🔴 Expired:', isTokenExpired(token));
  console.groupEnd();
};

/**
 * Format timestamp for display
 */
export const formatTokenTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};
