"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, RotateCcw, Search, Undo2 } from "lucide-react";
import { DetailDialog, ReviewDialog } from "@/components/MovieDialogs";
import { EmptyState } from "@/components/EmptyState";
import { FilterPanel } from "@/components/FilterPanel";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { StatsBar } from "@/components/StatsBar";
import { SwipeActions } from "@/components/SwipeActions";
import { buildPreferenceProfile, filterMovies, getRecommendationReason, pickWeightedRandomMovie } from "@/lib/recommendation";
import { useMovieStore } from "@/hooks/useMovieStore";
import type { Movie, MovieSearchResult, MovieStatusKey, RecommendationFilters, RecommendationMode } from "@/types/movie";

const defaultFilters: RecommendationFilters = {
  type: "all",
  genre: "all",
  yearRange: "all",
  minRating: "all"
};

const animationByStatus: Record<MovieStatusKey, "left" | "right" | "up"> = {
  skipped: "left",
  wantToWatch: "right",
  watched: "up"
};

export default function HomePage() {
  const store = useMovieStore();
  const [filters, setFilters] = useState<RecommendationFilters>(defaultFilters);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [animation, setAnimation] = useState<"idle" | "left" | "right" | "up">("idle");
  const [isMoving, setIsMoving] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [reviewMovie, setReviewMovie] = useState<Movie | null>(null);
  const [recommendationMode, setRecommendationMode] = useState<RecommendationMode>("balanced");

  const preferenceProfile = useMemo(
    () => buildPreferenceProfile(store.allMovies, store.status, store.reviews),
    [store.allMovies, store.reviews, store.status]
  );

  const recommendationPool = useMemo(
    () => filterMovies(store.allMovies, filters, store.status, store.settings),
    [filters, store.allMovies, store.settings, store.status]
  );

  useEffect(() => {
    if (!store.ready) return;
    store.loadOnlineRecommendations({
      type: filters.type,
      genre: filters.genre,
      yearRange: filters.yearRange,
      minRating: filters.minRating,
      mode: recommendationMode
    });
  }, [filters, recommendationMode, store.ready, store.loadOnlineRecommendations]);

  const chooseNextMovie = useCallback(() => {
    const nextMovie = pickWeightedRandomMovie(recommendationPool, store.settings, preferenceProfile);
    setCurrentMovie(nextMovie);
    setAnimation("idle");
  }, [preferenceProfile, recommendationPool, store.settings]);

  useEffect(() => {
    if (isMoving) return;
    if (!currentMovie || !recommendationPool.some((movie) => movie.id === currentMovie.id)) {
      chooseNextMovie();
    }
  }, [chooseNextMovie, currentMovie, isMoving, recommendationPool]);

  const handleAction = useCallback(
    (nextStatus: MovieStatusKey) => {
      if (!currentMovie || isMoving) return;
      setIsMoving(true);
      setAnimation(animationByStatus[nextStatus]);
      store.markMovie(currentMovie.id, nextStatus);
      window.setTimeout(() => {
        setCurrentMovie((previous) => {
          const poolWithoutCurrent = recommendationPool.filter((movie) => movie.id !== previous?.id);
          return pickWeightedRandomMovie(poolWithoutCurrent, store.settings, preferenceProfile);
        });
        setAnimation("idle");
        setIsMoving(false);
      }, 260);
    },
    [currentMovie, isMoving, preferenceProfile, recommendationPool, store]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") handleAction("skipped");
      if (event.key === "ArrowRight") handleAction("wantToWatch");
      if (event.key === "ArrowUp") handleAction("watched");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction]);

  async function runSearch() {
    const text = query.trim();
    if (!text) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const local = store.searchLocal(text);
    const online = await store.searchOnline(text);
    const seen = new Set<string>();
    setSearchResults(
      [...local, ...online].filter((movie) => {
        if (seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
      })
    );
    setSearching(false);
  }

  function showDaily() {
    const pool = [...recommendationPool];
    const selected: Movie[] = [];
    for (let index = 0; index < 10 && pool.length > 0; index += 1) {
      const picked = pickWeightedRandomMovie(pool, store.settings, preferenceProfile);
      if (!picked) break;
      selected.push(picked);
      const nextIndex = pool.findIndex((movie) => movie.id === picked.id);
      if (nextIndex >= 0) pool.splice(nextIndex, 1);
    }
    setSearchResults(selected.map((movie) => ({ ...movie, source: movie.source ?? "今日推荐" })));
  }

  const currentReview = detailMovie ? store.reviews[detailMovie.id] : undefined;

  return (
    <main className="min-h-screen pb-28 sm:pb-8">
      <Header />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 sm:px-6">
        <StatsBar {...store.counts} />

        <FilterPanel filters={filters} onChange={setFilters} availableCount={recommendationPool.length} />

        <section className="grid items-start gap-5 lg:grid-cols-[320px_430px_1fr]">
          <aside className="glass rounded-[28px] p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={store.undo}
                disabled={!store.canUndo}
                className="glass-soft inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-sm disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
                撤销
              </button>
              <button
                type="button"
                onClick={showDaily}
                className="glass-soft inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-2 text-sm"
              >
                <CalendarDays className="h-4 w-4" />
                今日10张
              </button>
            </div>
            <div className="mt-3 rounded-[18px] border border-cyan-200/20 bg-cyan-200/10 p-3 text-sm text-white/75">
              <div className="flex items-center justify-between gap-3">
                <span>
                  在线片源 <strong className="text-white">{store.onlineMovies.length}</strong> 部
                </span>
                <button
                  type="button"
                  onClick={() =>
                    store.loadOnlineRecommendations({
                      type: filters.type,
                      genre: filters.genre,
                      yearRange: filters.yearRange,
                      minRating: filters.minRating,
                      mode: recommendationMode
                    })
                  }
                  disabled={store.onlineLoading}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${store.onlineLoading ? "animate-spin" : ""}`} />
                  {store.onlineLoading ? "加载中" : "刷新"}
                </button>
              </div>
              {store.onlineError ? <p className="mt-2 text-xs text-rose-100">{store.onlineError}</p> : null}
              {!store.onlineError ? <p className="mt-2 text-xs text-white/55">刷卡池会自动混入 TMDb 热门和高分作品。</p> : null}
            </div>

            <label className="mt-4 grid gap-1.5 text-sm text-white/70">
              在线推荐模式
              <select
                value={recommendationMode}
                onChange={(event) => setRecommendationMode(event.target.value as RecommendationMode)}
                className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
              >
                <option value="balanced">均衡探索</option>
                <option value="popular">今日热门</option>
                <option value="highRated">高分佳作</option>
                <option value="hiddenGem">高分冷门</option>
                <option value="recent">近年新片</option>
                <option value="classic">经典补课</option>
                <option value="chinese">华语作品</option>
              </select>
            </label>

            <div className="mt-5">
              <label className="text-sm font-semibold text-white/85">搜索添加看过</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runSearch();
                  }}
                  className="glass-soft h-11 min-w-0 flex-1 rounded-[16px] px-3 text-white outline-none"
                  placeholder="搜索电影、剧集、类型"
                />
                <button
                  onClick={runSearch}
                  className="grid h-11 w-11 place-items-center rounded-[16px] bg-white text-[#172033]"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => store.addCustomWatched(query)}
                className="mt-2 w-full rounded-[16px] border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80"
              >
                搜不到时，添加为自定义看过
              </button>
            </div>

            <div className="mt-4 max-h-[410px] space-y-3 overflow-auto pr-1">
              {searching ? <p className="text-sm text-white/60">正在搜索在线片库...</p> : null}
              {!searching && searchResults.length === 0 ? (
                <p className="text-sm leading-6 text-white/55">
                  TVMaze 与服务端 TMDb 已可用。OMDb / Trakt / Watchmode 可在设置页填写 Key 后启用。
                </p>
              ) : null}
              {searchResults.map((movie) => (
                <article key={movie.id} className="glass-soft rounded-[18px] p-3">
                  <p className="text-xs text-cyan-100/70">{movie.source}</p>
                  <h3 className="font-semibold">{movie.title}</h3>
                  <p className="mt-1 text-xs text-white/55">
                    {movie.year || "未知"} · {movie.type === "tv" ? "电视剧" : "电影"} · {movie.rating || "无评分"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => store.addMovieAsWatched(movie)}
                      className="rounded-[14px] bg-emerald-300 px-3 py-2 text-xs font-semibold text-[#06110d]"
                    >
                      加入看过
                    </button>
                    <button
                      onClick={() => setDetailMovie(movie)}
                      className="glass-soft rounded-[14px] px-3 py-2 text-xs"
                    >
                      详情
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            {currentMovie ? (
              <MovieCard
                movie={currentMovie}
                animation={animation}
                reason={getRecommendationReason(currentMovie, preferenceProfile)}
                onSwipe={(direction) =>
                  handleAction(direction === "left" ? "skipped" : direction === "right" ? "wantToWatch" : "watched")
                }
              />
            ) : (
              <EmptyState onReset={store.resetStatus} />
            )}
            <SwipeActions onAction={handleAction} disabled={!currentMovie || isMoving} />
            <button
              type="button"
              disabled={!currentMovie}
              onClick={() => setDetailMovie(currentMovie)}
              className="glass-soft h-12 w-full rounded-[18px] text-sm disabled:opacity-40"
            >
              查看详情 / 写影评
            </button>
            <section className="glass-soft rounded-[22px] p-4 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">最近刷过</span>
                <button disabled={!store.canUndo} onClick={store.undo} className="text-xs text-cyan-100 disabled:opacity-40">
                  撤销一步
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {store.actionHistory.slice(0, 5).map((item) => {
                  const movie = store.movieMap.get(item.movieId);
                  return (
                    <div key={`${item.movieId}-${item.at}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-white/10 px-3 py-2 text-xs">
                      <span className="line-clamp-1">{movie?.title ?? item.movieId}</span>
                      <span className="shrink-0 text-white/50">
                        {item.status === "watched" ? "看过" : item.status === "wantToWatch" ? "想看" : "跳过"}
                      </span>
                    </div>
                  );
                })}
                {store.actionHistory.length === 0 ? <p className="text-xs text-white/45">还没有刷卡记录。</p> : null}
              </div>
            </section>
          </div>

          <aside className="glass rounded-[28px] p-5 text-sm leading-7 text-white/75">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">推荐算法</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs">rating x 0.6 + popularity x 0.4</span>
            </div>
            <p className="mt-3">
              高评分和高热度更容易出现，但仍保留随机性。已标记作品默认退出推荐池；可以在设置页允许重复推荐。
            </p>
            <button
              type="button"
              onClick={store.resetStatus}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-white transition hover:bg-white/15"
            >
              <RotateCcw className="h-4 w-4" />
              重置推荐池
            </button>
          </aside>
        </section>
      </div>

      <DetailDialog
        movie={detailMovie}
        review={currentReview}
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
