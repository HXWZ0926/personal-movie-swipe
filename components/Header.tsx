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
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[18px] border border-white/40 bg-white/85 text-[#172033] shadow-[0_18px_45px_rgba(114,241,255,.2)]">
          <Clapperboard className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold leading-tight">刷片夹</span>
          <span className="block text-xs uppercase tracking-[0.24em] text-white/55">Movie Swipe</span>
        </span>
      </Link>

      <nav className="glass fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-[24px] p-1 sm:static sm:translate-x-0">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 rounded-[18px] px-3 py-2 text-sm transition sm:px-4 ${
                isActive
                  ? "bg-white/90 text-[#172033]"
                  : "text-white/75 hover:bg-white/15 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
