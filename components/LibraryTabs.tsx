"use client";

import { Eye, Heart, X } from "lucide-react";
import type { MovieStatusKey } from "@/types/movie";

interface LibraryTabsProps {
  activeTab: MovieStatusKey;
  counts: Record<MovieStatusKey, number>;
  onChange: (tab: MovieStatusKey) => void;
}

const tabs = [
  { key: "watched", label: "看过", icon: Eye },
  { key: "wantToWatch", label: "想看", icon: Heart },
  { key: "skipped", label: "跳过", icon: X }
] as const;

export function LibraryTabs({ activeTab, counts, onChange }: LibraryTabsProps) {
  return (
    <div className="glass mx-auto grid w-full max-w-2xl grid-cols-3 rounded-[24px] p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center justify-center gap-2 rounded-[20px] px-3 py-3 text-sm transition ${
              isActive ? "bg-white/90 text-[#172033]" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            <span className="text-xs opacity-70">{counts[tab.key]}</span>
          </button>
        );
      })}
    </div>
  );
}
