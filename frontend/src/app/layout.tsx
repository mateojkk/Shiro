import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Shiro | Autonomous Intent-Driven DeFi on X Layer",
  description: "AI-powered DeFi copilot and DCA execution agent on X Layer zkEVM.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#080808]">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-[#080808] text-[#EDEDED] min-h-screen antialiased selection:bg-white/20 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
