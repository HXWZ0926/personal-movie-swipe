import { ArrowUp, Heart, X } from "lucide-react";
import type { MovieStatusKey } from "@/types/movie";

interface SwipeActionsProps {
  onAction: (status: MovieStatusKey) => void;
  disabled?: boolean;
}

export function SwipeActions({ onAction, disabled }: SwipeActionsProps) {
  return (
    <div className="mx-auto grid w-full max-w-[430px] grid-cols-3 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("skipped")}
        className="glass-soft flex h-16 items-center justify-center rounded-[22px] text-white transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        title="不感兴趣 / 跳过（左方向键）"
      >
        <X className="h-7 w-7" />
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("wantToWatch")}
        className="flex h-16 items-center justify-center rounded-[22px] bg-rose-400 text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
        title="想看（右方向键）"
      >
        <Heart className="h-7 w-7 fill-current" />
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction("watched")}
        className="flex h-16 items-center justify-center rounded-[22px] bg-emerald-300 text-[#06110d] shadow-lg shadow-emerald-400/20 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
        title="看过（上方向键）"
      >
        <ArrowUp className="h-7 w-7" />
      </button>
    </div>
  );
}
