"use client";

import { AuthProvider } from "./contexts/AuthContext";
import { CryptoProvider } from "./contexts/CryptoContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CryptoProvider>
        {children}
      </CryptoProvider>
    </AuthProvider>
  );
}
