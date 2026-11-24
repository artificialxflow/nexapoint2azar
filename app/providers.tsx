'use client';

import { Suspense } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { BusinessProvider } from '@/src/context/BusinessContext';
import { AutomationProvider } from '@/src/context/AutomationContext';
import { QueryProvider } from '@/src/context/QueryProvider';
import AutomationToastStack from '@/src/components/automation/AutomationToastStack';
import MustChangePasswordGuard from '@/src/components/auth/MustChangePasswordGuard';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <MustChangePasswordGuard>
          <QueryProvider>
            <BusinessProvider>
              <AutomationProvider>
                {children}
                <AutomationToastStack />
              </AutomationProvider>
            </BusinessProvider>
          </QueryProvider>
        </MustChangePasswordGuard>
      </Suspense>
    </AuthProvider>
  );
}
