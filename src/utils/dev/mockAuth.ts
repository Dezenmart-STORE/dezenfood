/**
 * DEVELOPMENT ONLY: Mock Authentication Utility
 *
 * This utility allows you to bypass OAuth login in development
 * by injecting a mock JWT token and user data into localStorage.
 *
 * Usage in Browser Console:
 * 1. Open DevTools Console (F12)
 * 2. Run: localStorage.setItem('DEV_MOCK_AUTH', 'true')
 * 3. Refresh the page
 * 4. You'll be "logged in" as a test user
 *
 * To disable:
 * localStorage.removeItem('DEV_MOCK_AUTH')
 */

const MOCK_USER = {
  _id: "dev_user_123",
  email: "developer@dezenmart.local",
  name: "Dev User",
  walletAddress: "", // Will be filled by wallet connection
  profileImage: "",
  phoneNumber: "",
  location: "",
  verified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Generate a mock JWT token (valid for 24 hours)
function generateMockToken(): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));

  const payload = btoa(JSON.stringify({
    sub: MOCK_USER._id,
    email: MOCK_USER.email,
    name: MOCK_USER.name,
    id: MOCK_USER._id,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
  }));

  // Mock signature (not cryptographically valid, but passes decode check)
  const signature = btoa("mock_signature_for_development");

  return `${header}.${payload}.${signature}`;
}

/**
 * Initialize mock authentication for development
 * This runs automatically if DEV_MOCK_AUTH is set in localStorage
 */
export function initMockAuth(): boolean {
  // Only run in development
  if (import.meta.env.MODE !== 'development') {
    console.warn('🔒 Mock auth is only available in development mode');
    return false;
  }

  // Check if mock auth is enabled
  const mockAuthEnabled = localStorage.getItem('DEV_MOCK_AUTH') === 'true';

  if (!mockAuthEnabled) {
    return false;
  }

  // Check if already authenticated (don't override real auth)
  const existingToken = localStorage.getItem('auth_token');
  const existingUser = localStorage.getItem('auth_user');

  if (existingToken && existingUser && !existingToken.includes('mock_signature')) {
    console.log('✅ Real authentication found, skipping mock auth');
    return false;
  }

  // Inject mock token and user data
  const mockToken = generateMockToken();
  localStorage.setItem('auth_token', mockToken);
  localStorage.setItem('auth_user', JSON.stringify(MOCK_USER));

  console.log('🎭 Mock authentication injected!');
  console.log('📧 Logged in as:', MOCK_USER.email);
  console.log('🔑 Token expires in: 24 hours');
  console.log('');
  console.log('To disable mock auth:');
  console.log('localStorage.removeItem("DEV_MOCK_AUTH")');

  return true;
}

/**
 * Enable mock authentication and reload page
 * Call this from browser console: enableMockAuth()
 */
(window as any).enableMockAuth = () => {
  localStorage.setItem('DEV_MOCK_AUTH', 'true');
  console.log('✅ Mock auth enabled! Reloading page...');
  setTimeout(() => window.location.reload(), 500);
};

/**
 * Disable mock authentication and reload page
 * Call this from browser console: disableMockAuth()
 */
(window as any).disableMockAuth = () => {
  localStorage.removeItem('DEV_MOCK_AUTH');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  console.log('❌ Mock auth disabled! Reloading page...');
  setTimeout(() => window.location.reload(), 500);
};

// Show available commands in development
if (import.meta.env.MODE === 'development') {
  console.log('🛠️ Development Auth Utilities Available:');
  console.log('  enableMockAuth()  - Enable mock authentication');
  console.log('  disableMockAuth() - Disable mock authentication');
}
