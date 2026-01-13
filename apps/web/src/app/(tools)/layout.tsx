"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnalytics } from "../../components/analytics";
import { useEffect, useRef, useState } from "react";
import { toolsConfig } from "../../config/tools";
import clsx from "clsx";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

function MenuIcon() {
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
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function XIcon() {
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
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { trackToolSwitch } = useAnalytics();
  const previousPath = useRef<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (previousPath.current && previousPath.current !== pathname) {
      const fromTool = previousPath.current.split("/").pop() || "unknown";
      const toTool = pathname.split("/").pop() || "unknown";
      trackToolSwitch({ from_tool: fromTool, to_tool: toTool });
    }
    previousPath.current = pathname;
  }, [pathname, trackToolSwitch]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 bg-sand-50 text-ink dark:bg-sand-950 dark:text-sand-100">
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-sand-200 bg-white/70 p-5 transition-transform duration-300 ease-in-out dark:border-sand-800 dark:bg-sand-900/70 md:relative md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between md:hidden">
            <div className="text-xl font-semibold">Proxy Tools</div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 hover:bg-sand-100 dark:hover:bg-sand-800"
            >
              <XIcon />
            </button>
          </div>
          <div className="mb-8 hidden text-xl font-semibold md:block">
            Proxy Tools
          </div>
          <nav className="space-y-1 text-sm">
            {toolsConfig.map((tool) => {
              const isActive = pathname === tool.href;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition",
                    isActive
                      ? "bg-ocean-100 text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400"
                      : "text-ink-muted hover:bg-sand-100 hover:text-ink dark:hover:bg-sand-800 dark:hover:text-sand-200",
                  )}
                >
                  <tool.icon
                    className={clsx(
                      "h-4 w-4",
                      isActive
                        ? "text-ocean-600 dark:text-ocean-400"
                        : "text-ocean-600",
                    )}
                  />
                  <span>{tool.title}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 rounded-xl border border-ocean-200 bg-ocean-50 p-4 dark:border-ocean-800 dark:bg-ocean-950">
            <p className="text-xs font-mono text-ocean-700 dark:text-ocean-400">
              SPONSORED
            </p>
            <p className="mt-2 text-sm font-semibold">Need 100% Clean IPs?</p>
            <a
              href="#"
              className="text-xs text-ocean-700 hover:underline dark:text-ocean-400"
            >
              Try Smartproxy
            </a>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-ink/20 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 px-6 py-10 md:px-12">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mb-4 flex items-center gap-2 rounded-lg border border-sand-200 bg-white/90 px-3 py-2 text-sm hover:bg-sand-50 md:hidden dark:border-sand-700 dark:bg-sand-900 dark:hover:bg-sand-800"
            >
              <MenuIcon />
              <span>Tools Menu</span>
            </button>
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
