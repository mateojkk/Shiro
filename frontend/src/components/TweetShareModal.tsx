"use client";

import React from "react";
import { Share2, X, ExternalLink } from "lucide-react";

interface TweetShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  intentSummary?: string;
  txHash?: string;
}

export const TweetShareModal: React.FC<TweetShareModalProps> = ({
  isOpen,
  onClose,
  intentSummary = "Executed autonomous DeFi intent on X Layer with Shiro",
  txHash,
}) => {
  if (!isOpen) return null;

  const defaultTweet = `🚀 Testing @ShiroAgent on @XLayerOfficial zkEVM!

🤖 Just executed an autonomous AI DeFi intent:
"${intentSummary}"

Built for the X Layer Build XHackathon AI Season! 🔥 #XLayer #DeFAI #OKX #OKXDEX`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    defaultTweet
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-shiro-card border border-shiro-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-shiro-muted hover:text-white p-1 rounded-lg hover:bg-shiro-cardHover"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-okx-dark border border-okx/30 text-okx">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Share on X (Twitter)</h3>
            <p className="text-xs text-shiro-muted font-light">
              Official Hackathon Submission Requirement
            </p>
          </div>
        </div>

        <div className="my-4 p-4 rounded-xl bg-black border border-shiro-border font-mono text-xs text-slate-300 whitespace-pre-line leading-relaxed">
          {defaultTweet}
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-light text-shiro-muted hover:text-white"
          >
            Cancel
          </button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-okx hover:bg-okx-hover text-black font-medium text-xs transition-all shadow-md glow-okx-subtle"
          >
            <span>Post to @XLayerOfficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
