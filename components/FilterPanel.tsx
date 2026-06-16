"use client";

import { allGenres } from "@/data/movies";
import type { RecommendationFilters } from "@/types/movie";

interface FilterPanelProps {
  filters: RecommendationFilters;
  onChange: (filters: RecommendationFilters) => void;
  availableCount: number;
}

const filterBaseClass =
  "glass-soft h-11 rounded-[16px] px-3 text-sm text-white outline-none transition focus:border-cyan-200";

export function FilterPanel({ filters, onChange, availableCount }: FilterPanelProps) {
  function updateFilter<Key extends keyof RecommendationFilters>(
    key: Key,
    value: RecommendationFilters[Key]
  ) {
    onChange({
      ...filters,
      [key]: value
    });
  }

  return (
    <section className="glass mx-auto w-full max-w-7xl rounded-[22px] p-3 sm:rounded-[28px] sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <label className="grid gap-1.5 text-xs text-white/60">
          作品类型
          <select
            className={filterBaseClass}
            value={filters.type}
            onChange={(event) =>
              updateFilter("type", event.target.value as RecommendationFilters["type"])
            }
          >
            <option value="all">全部</option>
            <option value="movie">电影</option>
            <option value="tv">电视剧</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-xs text-white/60">
          类型标签
          <select className={filterBaseClass} value={filters.genre} onChange={(event) => updateFilter("genre", event.target.value)}>
            <option value="all">全部</option>
            {allGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs text-white/60">
          年份范围
          <select
            className={filterBaseClass}
            value={filters.yearRange}
            onChange={(event) =>
              updateFilter("yearRange", event.target.value as RecommendationFilters["yearRange"])
            }
          >
            <option value="all">全部</option>
            <option value="recent5">近5年</option>
            <option value="recent10">近10年</option>
            <option value="classic">经典老片</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-xs text-white/60">
          最低评分
          <select
            className={filterBaseClass}
            value={filters.minRating}
            onChange={(event) =>
              updateFilter("minRating", event.target.value as RecommendationFilters["minRating"])
            }
          >
            <option value="all">不限</option>
            <option value="7">7分以上</option>
            <option value="8">8分以上</option>
            <option value="9">9分以上</option>
          </select>
        </label>
      </div>

      <div className="mt-3 text-right text-xs text-white/50">推荐池 {availableCount} 部</div>
    </section>
  );
}
