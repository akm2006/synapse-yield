// src/app/layout.tsx
import type { Metadata } from 'next';
import { AppProvider } from '@/providers/AppProvider';
import { AuthProvider } from '@/providers/AuthProvider';

import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { ApolloProviderWrapper } from '@/providers/ApolloProviderWrapper';
import { LoggerProvider } from '@/providers/LoggerProvider';
import GlobalLogger from '@/components/layout/GlobalLogger';
import { ToastProvider } from '@/providers/ToastProvider';
import { BalanceProvider } from '@/providers/BalanceProvider';
import ConditionalLayout from '@/components/layout/ConditionalLayout'; // Import the new conditional layout

export const metadata: Metadata = {
  title: 'Synapse Yield | Automated DeFi Yield on Monad',
  description: 'Optimize DeFi yields on Monad Testnet using Account Abstraction and secure MetaMask Delegation. Manage staking with automated rebalancing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApolloProviderWrapper>
          <AppProvider>
            <AuthProvider>
              <BalanceProvider>
                <ToastProvider>
                  <LoggerProvider>

        {/* Wrap children with the conditional layout */}
                    <ConditionalLayout>{children}</ConditionalLayout>
                     <GlobalLogger />
                  </LoggerProvider>
                </ToastProvider>
              </BalanceProvider>
            </AuthProvider>
          </AppProvider>
        </ApolloProviderWrapper>
      </body>
    </html>
  );
}