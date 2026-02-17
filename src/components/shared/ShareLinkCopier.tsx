"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ShareLinkCopierProps {
  shareToken: string;
}

export function ShareLinkCopier({ shareToken }: ShareLinkCopierProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={shareUrl}
        readOnly
        className="flex-1 px-3 py-2 border border-gray-500 rounded-lg text-sm bg-gray-50 text-gray-600"
      />
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            복사
          </>
        )}
      </button>
    </div>
  );
}
