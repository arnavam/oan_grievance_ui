'use client';

import { useState } from 'react';
import { AuthBootstrapGate } from '@/features/auth/components/AuthBootstrapGate';
import { makeStore } from '@/store';
import { Provider as ReduxProvider } from 'react-redux';

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => makeStore());

  return (
    <ReduxProvider store={store}>
      <AuthBootstrapGate>{children}</AuthBootstrapGate>
    </ReduxProvider>
  );
}
