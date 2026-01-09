"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

export function FingerprintCheck() {
  const [webRTCIP, setWebRTCIP] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsLoading(true);
    const rtc = new RTCPeerConnection({ iceServers: [] });
    rtc.createDataChannel("");
    rtc
      .createOffer()
      .then((offer) => rtc.setLocalDescription(offer))
      .catch(() => undefined);

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    rtc.onicecandidate = (event) => {
      if (!event || !event.candidate || !event.candidate.candidate) return;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = event.candidate.candidate.match(ipRegex);
      if (match) {
        setWebRTCIP(match[1]);
        setIsLoading(false);
        clearTimeout(timeout);
        rtc.onicecandidate = null;
      }
    };

    return () => {
      clearTimeout(timeout);
      rtc.close();
    };
  }, []);

  const isLeaked = webRTCIP !== null;

  return (
    <div className="card-hover rounded-2xl border border-sand-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isLoading
                ? "bg-sand-100 text-sand-500 dark:bg-sand-800 dark:text-sand-400"
                : isLeaked
                  ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
            )}
          >
            <ShieldIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">WebRTC Leak Test</h3>
            <p className="text-xs text-ink-muted dark:text-sand-400">
              Checks for local IP exposure
            </p>
          </div>
        </div>
        {!isLoading && (
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isLeaked
                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
            )}
          >
            {isLeaked ? "Leak Detected" : "Protected"}
          </span>
        )}
      </div>

      {/* Result */}
      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sand-300 border-t-ocean-500"></div>
            <p className="text-sm text-ink-muted dark:text-sand-400">
              Checking for WebRTC leaks...
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {isLeaked ? (
              <AlertIcon className="h-5 w-5 text-red-500" />
            ) : (
              <CheckIcon className="h-5 w-5 text-emerald-500" />
            )}
            <p className="text-sm">
              <span className="font-medium">Detected Local IP:</span>{" "}
              <span
                className={clsx(
                  "font-mono",
                  isLeaked
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {webRTCIP || "None (Safe)"}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Warning Banner */}
      {!isLoading && isLeaked && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                WebRTC leak detected
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
                Your real IP address may be exposed even when using a proxy.
                Consider using an anti-detect browser to prevent this leak.
              </p>
              <a
                href="https://adspower.net/?ref=socksproxies"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Fix with AdsPower Browser
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Safe State */}
      {!isLoading && !isLeaked && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-start gap-3">
            <CheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                No WebRTC leak detected
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/80">
                Your browser is not exposing your local IP address through
                WebRTC. Your proxy connection appears to be secure.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
