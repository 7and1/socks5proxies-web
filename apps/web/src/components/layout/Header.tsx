"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { site } from "../../config/site";
import { useTheme } from "../../hooks/useTheme";
import clsx from "clsx";

function MenuIcon() {
  return (
    <svg
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();

  // Handle scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-sand-200/80 bg-sand-50/95 shadow-sm backdrop-blur-md dark:border-sand-700/80 dark:bg-sand-900/95"
          : "border-transparent bg-transparent",
      )}
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 text-xl font-semibold tracking-tight transition-colors hover:text-ocean-600 dark:hover:text-ocean-400"
          aria-label={`${site.name} - Home`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-600 text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105">
            SP
          </span>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>

        <nav
          className="hidden items-center gap-1 text-sm md:flex"
          role="navigation"
          aria-label="Main navigation"
        >
          {site.primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative rounded-lg px-4 py-2 font-medium transition-colors",
                item.highlight
                  ? "bg-ocean-600 text-white shadow-sm hover:bg-ocean-500 dark:bg-ocean-500 dark:text-white"
                  : "text-ink-muted hover:bg-sand-100 hover:text-ink dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-200",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2.5 text-ink-muted transition-all hover:bg-sand-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-200"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <span className="transition-transform duration-300 ease-in-out block">
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </span>
            </button>
          )}
          <Link
            href="/tools"
            className="hidden rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ocean-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-ocean-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 sm:inline-flex sm:items-center sm:gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            Launch Tools
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full p-2.5 text-ink-muted transition-colors hover:bg-sand-200 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:text-sand-400 dark:hover:bg-sand-800 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu with animation */}
      <div
        id="mobile-menu"
        className={clsx(
          "fixed inset-x-0 top-[65px] z-40 border-t border-sand-200 bg-sand-50/98 backdrop-blur-lg transition-all duration-300 ease-in-out dark:border-sand-700 dark:bg-sand-900/98 md:hidden",
          mobileMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-4 opacity-0",
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <nav
          className="flex flex-col px-6 py-6 space-y-2"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {site.primaryNav.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-xl px-4 py-3 text-base font-medium transition-all",
                item.highlight
                  ? "bg-ocean-600 text-white hover:bg-ocean-500 dark:bg-ocean-500"
                  : "text-ink-muted hover:bg-sand-100 hover:text-ink dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-200",
              )}
              onClick={() => setMobileMenuOpen(false)}
              style={{ animationDelay: `${idx * 50}ms` }}
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4">
            <Link
              href="/tools"
              className="flex items-center justify-center gap-2 rounded-full bg-ocean-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ocean-600/25 transition-all hover:-translate-y-0.5 hover:bg-ocean-500"
              onClick={() => setMobileMenuOpen(false)}
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
              </span>
              Launch Tools
            </Link>
          </div>
        </nav>
      </div>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[65px] z-30 bg-ink/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
