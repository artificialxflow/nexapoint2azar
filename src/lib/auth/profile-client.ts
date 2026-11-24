import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import type { AuthUserPayload } from '@/src/lib/auth/auth-user';
import { createDemoAuthUser } from '@/src/lib/auth/auth-user';
import { MOCK_USER_STORAGE_KEY } from '@/src/lib/frontend-config';
import { parseApiJson } from '@/src/lib/http/parse-api-response';
import { attachmentUrlFromFileKey } from '@/src/lib/media/attachment-url';

export async function patchAuthAvatar(
  avatarFileKey: string | null,
  previewUrl?: string | null
): Promise<AuthUserPayload> {
  if (FRONTEND_ONLY) {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(MOCK_USER_STORAGE_KEY) : null;
    const base = stored ? (JSON.parse(stored) as AuthUserPayload) : createDemoAuthUser();
    const next: AuthUserPayload = {
      ...base,
      avatarFileKey,
      avatarUrl: previewUrl ?? (avatarFileKey ? attachmentUrlFromFileKey(avatarFileKey) : null),
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  }

  const data = await parseApiJson<{ user: AuthUserPayload }>(
    await fetch('/api/auth/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarFileKey }),
    })
  );
  return data.user;
}