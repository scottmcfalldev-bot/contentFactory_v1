import React, { useState } from 'react';

interface AssetCardProps {
  title: string;
  content: string | React.ReactNode;
  copyValue?: string;
  type?: 'text' | 'markdown' | 'custom';
}

export const AssetCard: React.FC<AssetCardProps> = ({ title, content, copyValue, type = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = copyValue || (typeof content === 'string' ? content : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg mb-6">
      <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-emerald-400 tracking-wide uppercase text-sm font-mono">
          {title}
        </h3>
        {copyValue && (
          <button
            onClick={handleCopy}
            className={`text-xs px-3 py-1 rounded transition-colors duration-200 ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            {copied ? 'COPIED' : 'COPY ASSET'}
          </button>
        )}
      </div>
      <div className="p-6 text-slate-300 leading-relaxed text-sm md:text-base">
        {type === 'markdown' && typeof content === 'string' ? (
           <div className="whitespace-pre-wrap font-mono text-xs md:text-sm">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};