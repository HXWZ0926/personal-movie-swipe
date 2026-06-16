"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clapperboard, Library, Settings, Sparkles } from "lucide-react";

const links = [
  { href: "/", label: "刷卡", icon: Sparkles },
  { href: "/library", label: "我的片单", icon: Library },
  { href: "/stats", label: "统计", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings }
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[18px] border border-white/40 bg-white/85 text-[#172033] shadow-[0_18px_45px_rgba(114,241,255,.2)]">
          <Clapperboard className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold leading-tight">刷片夹</span>
          <span className="block text-xs uppercase tracking-[0.24em] text-white/55">Movie Swipe</span>
        </span>
      </Link>

      <nav className="glass fixed bottom-[calc(.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[calc(100%-1.5rem)] max-w-[390px] -translate-x-1/2 justify-around gap-1 rounded-[26px] p-1.5 sm:static sm:w-auto sm:max-w-none sm:translate-x-0 sm:justify-start sm:rounded-[24px] sm:p-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] leading-none transition sm:flex-none sm:flex-row sm:gap-2 sm:rounded-[18px] sm:px-4 sm:text-sm ${
                isActive
                  ? "bg-white/90 text-[#172033]"
                  : "text-white/75 hover:bg-white/15 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
