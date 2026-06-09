import { Eye, Heart, X } from "lucide-react";

interface StatsBarProps {
  watched: number;
  wantToWatch: number;
  skipped: number;
}

const stats = [
  { key: "watched", label: "已看", icon: Eye, color: "text-emerald-200" },
  { key: "wantToWatch", label: "想看", icon: Heart, color: "text-rose-200" },
  { key: "skipped", label: "跳过", icon: X, color: "text-white/70" }
] as const;

export function StatsBar({ watched, wantToWatch, skipped }: StatsBarProps) {
  const values = { watched, wantToWatch, skipped };

  return (
    <section className="mx-auto grid w-full max-w-xl grid-cols-3 gap-2 px-4 sm:px-0">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="glass rounded-[22px] px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/60">
              <Icon className={`h-4 w-4 ${item.color}`} />
              {item.label}
            </div>
            <div className="mt-1 text-2xl font-semibold">{values[item.key]}</div>
          </div>
        );
      })}
    </section>
  );
}
