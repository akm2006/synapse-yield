// src/app/layout.tsx
import type { Metadata } from 'next';
import { AppProvider } from '@/providers/AppProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import Header from '@/components/Header';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { ApolloProviderWrapper } from '@/providers/ApolloProviderWrapper';
import { LoggerProvider } from '@/providers/LoggerProvider';
import GlobalLogger from '@/components/layout/GlobalLogger';
import { ToastProvider } from '@/providers/ToastProvider';
import { BalanceProvider } from '@/providers/BalanceProvider';
import LiquidBackground from '@/components/layout/LiquidBackground'; // Import the new component

export const metadata: Metadata = {
  title: 'Synapse Yield - MetaMask Smart Accounts',
  description:
    'Automated DeFi yield optimization secured by MetaMask Delegation Toolkit on Monad Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body> {/* Basic body tag, styles applied in globals.css */}
        <ApolloProviderWrapper>
          <AppProvider>
            <AuthProvider>
             <BalanceProvider>
                <ToastProvider>
                  <LoggerProvider>
                    {/* Wrap the main structure with the background component */}
                    <LiquidBackground>
                      <div className="min-h-screen flex flex-col">
                        <Header />
                        <main className="flex-1">{children}</main>
                      </div>
                    </LiquidBackground>
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