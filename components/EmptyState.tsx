import { RotateCcw, SlidersHorizontal } from "lucide-react";

interface EmptyStateProps {
  onReset?: () => void;
  compact?: boolean;
}

export function EmptyState({ onReset, compact }: EmptyStateProps) {
  return (
    <div
      className={`glass mx-auto grid w-full place-items-center rounded-[28px] px-6 text-center ${
        compact ? "min-h-[260px]" : "min-h-[460px] max-w-[430px]"
      }`}
    >
      <div>
        <SlidersHorizontal className="mx-auto h-10 w-10 text-cyan-200" />
        <h2 className="mt-4 text-xl font-semibold">当前条件下没有更多作品了</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">可以调整筛选、搜索添加，或重置推荐池。</p>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex items-center gap-2 rounded-[16px] bg-white px-4 py-2 text-sm font-medium text-[#172033] transition hover:bg-white/80"
          >
            <RotateCcw className="h-4 w-4" />
            重置推荐池
          </button>
        ) : null}
      </div>
    </div>
  );
}
