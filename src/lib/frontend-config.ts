/** Mock auth only when explicitly 'true'; real API + PostgreSQL by default. */
export const FRONTEND_ONLY = process.env.NEXT_PUBLIC_FRONTEND_ONLY === 'true';

export const MOCK_SESSION_COOKIE = 'nexa_mock_session';

export const MOCK_DEMO_USERNAME = 'demo';
export const MOCK_DEMO_PASSWORD = 'demo1234';

export const MOCK_USER_STORAGE_KEY = 'nexa-mock-auth-user';
