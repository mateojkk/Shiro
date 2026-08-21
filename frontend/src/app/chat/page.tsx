"use client";

import React, { useState } from "react";
import { AppHeader, ActiveTab } from "@/components/AppHeader";
import { NetworkGuard } from "@/components/NetworkGuard";
import { TerminalChat } from "@/components/TerminalChat";
import { SwapTab } from "@/components/SwapTab";
import { WrapTab } from "@/components/WrapTab";
import { PortfolioTab } from "@/components/PortfolioTab";

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");

  return (
    <div className="h-screen bg-[#080808] flex flex-col w-full overflow-hidden selection:bg-white/20 selection:text-white">
      {/* App Navigation Header */}
      <AppHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Network Switch Prompt Guard */}
      <NetworkGuard />

      {/* Main Full-Screen Workspace Area */}
      <main className="flex-1 w-full p-2 sm:p-4 overflow-y-auto">
        {/* Tab 1: AI Copilot */}
        {activeTab === "chat" && <TerminalChat />}

        {/* Tab 2: Instant DEX Swap */}
        {activeTab === "swap" && <SwapTab />}

        {/* Tab 3: 1:1 OKB Wrapper */}
        {activeTab === "wrap" && <WrapTab />}

        {/* Tab 4: Portfolio Holdings */}
        {activeTab === "portfolio" && <PortfolioTab />}
      </main>
    </div>
  );
}
