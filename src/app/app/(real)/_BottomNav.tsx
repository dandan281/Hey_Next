"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "me",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    href: "/app/friends",
    label: "friends",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="9" cy="8" r="3.5" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
        <path d="M17 14c2.5 0 4.5 1.5 4.5 4" />
      </svg>
    ),
  },
  {
    href: "/app/add",
    label: "add",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: "/app/activity",
    label: "activity",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 1.6 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.65-9.5 9-9.5 9z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  // Hide on onboarding
  if (pathname === "/app/onboarding") return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/85 backdrop-blur-xl">
      <div className="flex">
        {NAV_ITEMS.map((it) => {
          const active =
            it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-wider transition ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <span>{it.icon(active)}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
