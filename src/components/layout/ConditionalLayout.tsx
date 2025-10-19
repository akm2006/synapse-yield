// src/components/layout/ConditionalLayout.tsx
'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import LiquidBackground from '@/components/layout/LiquidBackground';

// List of routes that should NOT use the standard layout (Header + LiquidBackground)
const EXCLUDED_ROUTES = ['/', '/activity'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if the current route is one of the excluded ones
  const useStandardLayout = !EXCLUDED_ROUTES.includes(pathname);

  if (useStandardLayout) {
    return (
      <LiquidBackground>
        <div className="min-h-screen flex flex-col">
          <Header />
          {/* Add padding top to main content area to avoid overlap with fixed header */}
          {/* Adjust pt-20 (or similar value) based on your header height */}
          <main className="flex-1 pt-24 md:pt-28">{children}</main>
        </div>
      </LiquidBackground>
    );
  } else {
    // Render only the children for excluded routes (Home, Activity)
    return <>{children}</>;
  }
}