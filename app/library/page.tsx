"use client";

import { useMemo, useState } from "react";
import { DetailDialog, ReviewDialog } from "@/components/MovieDialogs";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { LibraryTabs } from "@/components/LibraryTabs";
import { useMovieStore } from "@/hooks/useMovieStore";
import type { Movie, MovieStatusKey } from "@/types/movie";

const titleByTab: Record<MovieStatusKey, string> = {
  watched: "看过",
  wantToWatch: "想看",
  skipped: "跳过"
};

export default function LibraryPage() {
  const store = useMovieStore();
  const [activeTab, setActiveTab] = useState<MovieStatusKey>("watched");
  const [query, setQuery] = useState("");
  const [listFilter, setListFilter] = useState("全部");
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [sortBy, setSortBy] = useState("added");
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [reviewMovie, setReviewMovie] = useState<Movie | null>(null);

  const customLists = useMemo(() => {
    const names = new Set<string>();
    Object.values(store.reviews).forEach((review) => {
      review.customLists
        ?.split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => names.add(item));
    });
    return ["全部", ...Array.from(names).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [store.reviews]);

  const currentMovies = useMemo(() => {
    const ids = new Set(store.status[activeTab]);
    const needle = query.trim().toLowerCase();
    const movies = store.allMovies.filter((movie) => {
      if (!ids.has(movie.id)) return false;
      if (sourceFilter !== "全部" && (movie.source ?? "本地库") !== sourceFilter) return false;
      if (listFilter !== "全部") {
        const review = store.reviews[movie.id];
        const lists = review?.customLists?.split(/[,，]/).map((item) => item.trim()) ?? [];
        if (!lists.includes(listFilter)) return false;
      }
      if (!needle) return true;
      const text = `${movie.title} ${movie.originalTitle ?? ""} ${movie.genres.join(" ")}`.toLowerCase();
      return text.includes(needle);
    });
    return movies.sort((a, b) => {
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "personalRating") return Number(store.reviews[b.id]?.personalRating || 0) - Number(store.reviews[a.id]?.personalRating || 0);
      if (sortBy === "year") return (b.year ?? 0) - (a.year ?? 0);
      if (sortBy === "title") return a.title.localeCompare(b.title, "zh-CN");
      return store.status[activeTab].indexOf(a.id) - store.status[activeTab].indexOf(b.id);
    });
  }, [activeTab, listFilter, query, sortBy, sourceFilter, store.allMovies, store.reviews, store.status]);

  const sources = useMemo(() => {
    const names = new Set<string>();
    store.allMovies.forEach((movie) => {
      if (store.status[activeTab].includes(movie.id)) names.add(movie.source ?? "本地库");
    });
    return ["全部", ...Array.from(names).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [activeTab, store.allMovies, store.status]);

  return (
    <main className="min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-8">
      <Header />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6">
        <section>
          <p className="text-sm text-white/55">我的片单</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">
            {titleByTab[activeTab]}作品
          </h1>
        </section>

        <LibraryTabs activeTab={activeTab} counts={store.counts} onChange={setActiveTab} />

        <section className="glass grid gap-3 rounded-[28px] p-4 md:grid-cols-[180px_180px_180px_1fr]">
          <label className="grid gap-1.5 text-sm text-white/70">
            自定义片单
            <select
              value={listFilter}
              onChange={(event) => setListFilter(event.target.value)}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
            >
              {customLists.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            来源
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
            >
              {sources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            排序
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
            >
              <option value="added">添加顺序</option>
              <option value="personalRating">我的评分</option>
              <option value="rating">官方评分</option>
              <option value="year">年份</option>
              <option value="title">标题</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            搜索已添加作品
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
              placeholder="只搜索当前片单里的作品"
            />
          </label>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
          <span>当前筛选 {currentMovies.length} 部</span>
          <div className="flex flex-wrap gap-2">
            {activeTab !== "watched" ? (
              <button
                type="button"
                onClick={() => currentMovies.forEach((movie) => store.markMovie(movie.id, "watched"))}
                className="rounded-[14px] bg-emerald-300 px-3 py-2 text-xs font-semibold text-[#06110d]"
              >
                全部标为看过
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => currentMovies.forEach((movie) => store.removeMovie(movie.id))}
              className="rounded-[14px] border border-white/20 bg-white/10 px-3 py-2 text-xs text-white"
            >
              移除当前筛选
            </button>
          </div>
        </section>

        {currentMovies.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currentMovies.map((movie) => {
              const review = store.reviews[movie.id];
              return (
                <article key={movie.id} className="glass overflow-hidden rounded-[28px]">
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={`${movie.title} 海报`} className="aspect-[2/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[2/3] place-items-center bg-white/10 text-white/45">无海报</div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold leading-snug">{movie.title}</h3>
                    <p className="mt-1 text-sm text-white/55">
                      {movie.year || "未知"} · {movie.rating || "无评分"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {movie.genres.slice(0, 3).map((genre) => (
                        <span key={genre} className="glass-soft rounded-full px-2 py-1 text-xs text-white/75">
                          {genre}
                        </span>
                      ))}
                    </div>
                    {activeTab === "watched" ? (
                      <div className="mt-3 rounded-[18px] bg-white/10 p-3 text-xs leading-5 text-white/70">
                        <p>我的评分：{review?.personalRating || "未评分"}</p>
                        <p>观看日期：{review?.watchDate || "未记录"}</p>
                        <p>标签：{review?.privateTags || "无"}</p>
                      </div>
                    ) : null}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDetailMovie(movie)}
                        className="glass-soft rounded-[14px] px-3 py-2 text-xs"
                      >
                        详情
                      </button>
                      {activeTab === "watched" ? (
                        <button
                          onClick={() => setReviewMovie(movie)}
                          className="rounded-[14px] bg-emerald-300 px-3 py-2 text-xs font-semibold text-[#06110d]"
                        >
                          评分影评
                        </button>
                      ) : (
                        <button
                          onClick={() => store.markMovie(movie.id, "watched")}
                          className="rounded-[14px] bg-emerald-300 px-3 py-2 text-xs font-semibold text-[#06110d]"
                        >
                          标为看过
                        </button>
                      )}
                      <button
                        onClick={() => store.removeMovie(movie.id)}
                        className="col-span-2 rounded-[14px] border border-white/20 bg-white/10 px-3 py-2 text-xs"
                      >
                        从片单移除
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState compact />
        )}
      </div>

      <DetailDialog
        movie={detailMovie}
        review={detailMovie ? store.reviews[detailMovie.id] : undefined}
        onClose={() => setDetailMovie(null)}
        onEditReview={() => {
          setReviewMovie(detailMovie);
          setDetailMovie(null);
        }}
        onMovieUpdate={store.saveMovie}
        onOpenMovie={setDetailMovie}
      />
      <ReviewDialog
        movie={reviewMovie}
        review={reviewMovie ? store.reviews[reviewMovie.id] : undefined}
        onClose={() => setReviewMovie(null)}
        onSave={(review) => {
          if (reviewMovie) store.saveReview(reviewMovie.id, review);
          setReviewMovie(null);
        }}
      />
    </main>
  );
}
