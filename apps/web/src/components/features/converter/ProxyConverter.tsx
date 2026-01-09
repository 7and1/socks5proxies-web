"use client";

import { useMemo, useState } from "react";
import { convertProxies, ProxyFormat } from "../../../lib/converter";
import clsx from "clsx";

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

const formatDescriptions: Record<ProxyFormat, string> = {
  json: "JSON array format for programmatic use",
  clash: "Clash proxy configuration format",
  curl: "cURL command line format",
};

const formatExtensions: Record<ProxyFormat, string> = {
  json: ".json",
  clash: ".yaml",
  curl: ".sh",
};

export function ProxyConverter() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<ProxyFormat>("json");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => convertProxies(input, format), [input, format]);
  const lineCount = input.split("\n").filter((line) => line.trim()).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proxies${formatExtensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div
        className="flex flex-wrap items-center justify-center gap-2"
        role="group"
        aria-label="Output format selection"
      >
        {(["json", "clash", "curl"] as ProxyFormat[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={clsx(
              "rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2",
              format === f
                ? "bg-ocean-600 text-white shadow-lg shadow-ocean-600/30"
                : "border border-sand-200 bg-white text-ink-muted hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600 dark:border-sand-700 dark:bg-sand-800 dark:text-sand-400 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30",
            )}
            aria-pressed={format === f}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-ink-muted dark:text-sand-400">
        {formatDescriptions[format]}
      </p>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="proxy-input"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ocean-100 text-xs font-bold text-ocean-600 dark:bg-ocean-900/50 dark:text-ocean-400">
                1
              </span>
              Input
            </label>
            <div className="flex items-center gap-2">
              {lineCount > 0 && (
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-sand-600 dark:bg-sand-800 dark:text-sand-400">
                  {lineCount} {lineCount === 1 ? "proxy" : "proxies"}
                </span>
              )}
              {input && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
                  aria-label="Clear input"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea
            id="proxy-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-64 w-full resize-none rounded-2xl border border-sand-200 bg-white/90 p-4 font-mono text-sm shadow-sm transition-all placeholder:text-ink-muted/60 focus:border-ocean-400 focus:outline-none focus:ring-4 focus:ring-ocean-400/10 dark:border-sand-700 dark:bg-sand-900/90 dark:text-sand-200 dark:placeholder:text-sand-500 dark:focus:border-ocean-600"
            placeholder="Paste your proxies here. One per line:

ip:port
ip:port:user:pass
socks5://ip:port
http://user:pass@ip:port"
            aria-describedby="input-help"
          />
          <p
            id="input-help"
            className="text-xs text-ink-muted dark:text-sand-400"
          >
            Supports IP:Port, URL formats, and authenticated proxies
          </p>
        </div>

        {/* Swap Button (visible on larger screens) */}
        <div className="hidden items-center justify-center lg:flex lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sand-200 bg-white text-sand-400 shadow-sm dark:border-sand-700 dark:bg-sand-800">
            <SwapIcon />
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="proxy-output"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                2
              </span>
              Output
              <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sand-500 dark:bg-sand-800 dark:text-sand-400">
                {format}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!output}
                className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:border-sand-700 dark:bg-sand-800 dark:text-sand-400 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
                aria-label="Download output file"
              >
                <DownloadIcon />
                Download
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!output}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2",
                  copied
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    : "border border-sand-200 bg-white text-ink-muted hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sand-700 dark:bg-sand-800 dark:text-sand-400 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30",
                )}
                aria-label={
                  copied ? "Copied to clipboard" : "Copy to clipboard"
                }
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              id="proxy-output"
              readOnly
              value={output}
              className="h-64 w-full resize-none rounded-2xl border border-sand-200 bg-sand-50/80 p-4 font-mono text-xs text-ink shadow-sm dark:border-sand-700 dark:bg-sand-800/80 dark:text-sand-300"
              aria-label="Converted output"
            />
            {!output && input && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-sand-50/90 dark:bg-sand-800/90">
                <p className="text-sm text-ink-muted dark:text-sand-400">
                  Processing...
                </p>
              </div>
            )}
            {!output && !input && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                <p className="text-sm text-ink-muted dark:text-sand-400">
                  Output will appear here
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-ink-muted dark:text-sand-400">
            100% client-side conversion - your data never leaves your browser
          </p>
        </div>
      </div>
    </div>
  );
}
