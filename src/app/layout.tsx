import type { Metadata } from 'next';
import { AppProvider } from '@/providers/AppProvider';
import Header from '@/components/Header';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { ApolloProviderWrapper } from '@/providers/ApolloProviderWrapper';
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
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </AppProvider>
        </ApolloProviderWrapper>
      </body>
    </html>
  );
}