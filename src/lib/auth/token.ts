import { auth } from '../../firebase/config';

/**
 * Get the current Firebase ID token
 * Returns null in development if no user is authenticated
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      // In development, allow unauthenticated requests
      if (import.meta.env.DEV) {
        console.warn('No authenticated user - proceeding without token (dev mode)');
        return null;
      }
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    // In development, allow requests to proceed
    if (import.meta.env.DEV) {
      return null;
    }
    throw error;
  }
}

/**
 * Add authorization header to request options
 */
export async function withAuthHeader(
  options: RequestInit = {}
): Promise<RequestInit> {
  const token = await getIdToken();
  
  if (!token) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}