"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { parseProxyLines } from "../../lib/validators";
import clsx from "clsx";

interface ProxyInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function ProxyInput({
  onSubmit,
  isLoading,
  initialValue,
}: ProxyInputProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const metrics = useMemo(() => parseProxyLines(value), [value]);

  useEffect(() => {
    if (!hasUserEdited && initialValue && initialValue !== value) {
      setValue(initialValue);
    }
  }, [hasUserEdited, initialValue, value]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setHasUserEdited(true);
      setValue(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/plain") {
      handleFileUpload(file);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setHasUserEdited(true);
      setValue(text);
    } catch (err) {
      // Clipboard API not available or permission denied
    }
  };

  const handleClear = () => {
    setHasUserEdited(true);
    setValue("");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-medium text-ink-muted transition-all hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-400 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30 dark:hover:text-ocean-400"
          aria-label="Upload file"
        >
          <UploadIcon />
          Upload
        </button>
        <button
          type="button"
          onClick={handlePaste}
          className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-medium text-ink-muted transition-all hover:border-ocean-300 hover:bg-ocean-50 hover:text-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-400 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30 dark:hover:text-ocean-400"
          aria-label="Paste from clipboard"
        >
          <ClipboardIcon />
          Paste
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-red-800 dark:hover:bg-red-900/20"
            aria-label="Clear input"
          >
            <TrashIcon />
            Clear
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Textarea with drag and drop */}
      <div
        className={clsx(
          "relative rounded-2xl border-2 border-dashed transition-all duration-200",
          isDragging
            ? "border-ocean-400 bg-ocean-50/50 dark:border-ocean-600 dark:bg-ocean-900/20"
            : "border-transparent",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          value={value}
          onChange={(event) => {
            setHasUserEdited(true);
            setValue(event.target.value);
          }}
          placeholder="Paste proxies here. One per line:
ip:port
socks5://user:pass@ip:port
http://ip:port

Or drag and drop a .txt file"
          className={clsx(
            "h-48 w-full resize-none rounded-2xl border bg-white/90 p-4 font-mono text-sm text-ink shadow-sm transition-all placeholder:text-ink-muted/60 focus:border-ocean-400 focus:outline-none focus:ring-4 focus:ring-ocean-400/10 dark:border-sand-700 dark:bg-sand-900/90 dark:text-sand-200 dark:placeholder:text-sand-500 dark:focus:border-ocean-600 dark:focus:ring-ocean-600/20",
            isDragging ? "border-transparent" : "border-sand-200",
          )}
          aria-label="Proxy input"
          aria-describedby="proxy-input-help"
        />
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ocean-50/80 backdrop-blur-sm dark:bg-ocean-900/80">
            <div className="flex flex-col items-center gap-2 text-ocean-600 dark:text-ocean-400">
              <UploadIcon />
              <span className="text-sm font-medium">Drop file here</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with metrics and submit */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          id="proxy-input-help"
          className="flex flex-wrap items-center gap-3 text-xs"
        >
          <span
            className={clsx(
              "rounded-full px-3 py-1 font-medium",
              metrics.valid.length > 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-sand-100 text-sand-600 dark:bg-sand-800 dark:text-sand-400",
            )}
          >
            {metrics.valid.length} / 500 valid
          </span>
          {metrics.invalid.length > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-600 dark:bg-red-900/40 dark:text-red-400">
              {metrics.invalid.length} invalid
            </span>
          )}
          {metrics.ignored.length > 0 && (
            <span className="rounded-full bg-sand-100 px-3 py-1 font-medium text-sand-600 dark:bg-sand-800 dark:text-sand-400">
              {metrics.ignored.length} over limit
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSubmit(value)}
          disabled={isLoading || metrics.valid.length === 0}
          className={clsx(
            "btn-glow inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2",
            isLoading
              ? "bg-ocean-400 text-white cursor-wait"
              : metrics.valid.length === 0
                ? "bg-sand-200 text-sand-500 cursor-not-allowed dark:bg-sand-700 dark:text-sand-500"
                : "bg-ocean-600 text-white shadow-ocean-600/30 hover:-translate-y-0.5 hover:bg-ocean-500 hover:shadow-xl",
          )}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner />
              Scanning...
            </>
          ) : (
            <>
              Start Scan
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
