/**
 * Inject Authentication Token for Local Testing
 *
 * Usage in Browser Console:
 * injectAuthToken("your_jwt_token_here")
 */

export function injectAuthToken(token: string, userData?: any) {
  try {
    // Decode the JWT to get user info
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT token format');
      return false;
    }

    const payload = JSON.parse(atob(parts[1]));

    console.log('🔓 Decoded token payload:', payload);

    // Create user object from token or use provided userData
    const user = userData || {
      _id: payload.id,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      walletAddress: "",
      verified: true,
      selfVerification: {
        isVerified: false,
        sessionId: null,
        verificationDate: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Inject into localStorage
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));

    console.log('✅ Auth token injected successfully!');
    console.log('👤 User:', user);
    console.log('🔑 Token expires:', new Date(payload.exp * 1000).toISOString());
    console.log('');
    console.log('🔄 Reloading page to apply authentication...');

    // Reload page to apply auth
    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return true;
  } catch (error) {
    console.error('❌ Failed to inject auth token:', error);
    return false;
  }
}

// Expose to window for console access
declare global {
  interface Window {
    injectAuthToken: (token: string, userData?: any) => boolean;
    clearAuth: () => void;
  }
}

window.injectAuthToken = injectAuthToken;

window.clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  console.log('🗑️ Auth cleared. Reloading...');
  setTimeout(() => window.location.reload(), 500);
};

console.log('🔐 Auth Injection Tools Available:');
console.log('  injectAuthToken(token) - Inject JWT token for testing');
console.log('  clearAuth()            - Clear authentication');
