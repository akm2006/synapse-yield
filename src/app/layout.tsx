import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Import RainbowKit CSS and your new Providers component
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synapse Yield",
  description: "Autonomous Yield Optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Wrap your children with the Providers component */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}