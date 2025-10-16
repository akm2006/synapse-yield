import type { Metadata } from 'next';
import { AppProvider } from '@/providers/AppProvider';
import { AuthProvider } from '@/providers/AuthProvider'; // Import AuthProvider
import Header from '@/components/Header';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { ApolloProviderWrapper } from '@/providers/ApolloProviderWrapper';
import { LoggerProvider } from '@/providers/LoggerProvider';
import GlobalLogger from '@/components/layout/GlobalLogger';
import { ToastProvider } from '@/providers/ToastProvider'; // 1. Import ToastProvider
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
      <body className="bg-gray-900 text-white">
      <ApolloProviderWrapper>
          <AppProvider>
            <AuthProvider>
              <ToastProvider> {/* 2. Wrap LoggerProvider */}
                <LoggerProvider>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">{children}</main>
                  </div>
                  <GlobalLogger />
                </LoggerProvider>
              </ToastProvider>
            </AuthProvider>
          </AppProvider>
        </ApolloProviderWrapper>
      </body>
    </html>
  );
}