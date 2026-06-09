"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { movies as baseMovies } from "@/data/movies";
import type {
  AppSettings,
  Movie,
  MovieAppState,
  MovieReview,
  MovieSearchResult,
  MovieStatusKey,
  MovieStatusState
} from "@/types/movie";

const storageKey = "movie-swipe-web-state-v2";

const emptyStatus: MovieStatusState = {
  watched: [],
  wantToWatch: [],
  skipped: []
};

export const defaultSettings: AppSettings = {
  allowRepeatRecommendations: false,
  onlyHighRated: false,
  boostUnwatchedGenres: true,
  useSmartRecommendation: true,
  tmdbApiKey: "",
  tmdbBearerToken: "",
  omdbApiKey: "",
  traktClientId: "",
  watchmodeApiKey: ""
};

const defaultState: MovieAppState = {
  status: emptyStatus,
  customMovies: [],
  onlineMovies: [],
  reviews: {},
  actionHistory: [],
  settings: defaultSettings
};

function uniqueWithout(ids: string[], targetId: string) {
  return ids.filter((id) => id !== targetId);
}

function normalizeState(value: Partial<MovieAppState> | null): MovieAppState {
  return {
    status: {
      watched: Array.isArray(value?.status?.watched) ? value.status.watched : [],
      wantToWatch: Array.isArray(value?.status?.wantToWatch) ? value.status.wantToWatch : [],
      skipped: Array.isArray(value?.status?.skipped) ? value.status.skipped : []
    },
    customMovies: Array.isArray(value?.customMovies) ? value.customMovies : [],
    onlineMovies: Array.isArray(value?.onlineMovies) ? value.onlineMovies : [],
    reviews: value?.reviews && typeof value.reviews === "object" ? value.reviews : {},
    actionHistory: Array.isArray(value?.actionHistory) ? value.actionHistory : [],
    settings: {
      ...defaultSettings,
      ...(value?.settings ?? {})
    }
  };
}

function readState() {
  if (typeof window === "undefined") {
    return defaultState;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultState;
    return normalizeState(JSON.parse(raw) as Partial<MovieAppState>);
  } catch {
    return defaultState;
  }
}

function getYear(value: unknown) {
  const match = String(value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeImportedTitle(value: string) {
  return value.replace(/^["']|["']$/g, "").trim();
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function uniqueMovies(items: Movie[]) {
  const seen = new Set<string>();
  const seenExternal = new Set<string>();
  const seenTitleYear = new Set<string>();
  return items.filter((movie) => {
    if (!movie.id || seen.has(movie.id)) return false;
    const external = movie.externalIds?.tmdb ? `tmdb-${movie.type}-${movie.externalIds.tmdb}` : "";
    const titleYear = `${movie.type}-${movie.year}-${movie.title}`.toLowerCase();
    if (external && seenExternal.has(external)) return false;
    if (movie.year && movie.title && seenTitleYear.has(titleYear)) return false;
    seen.add(movie.id);
    if (external) seenExternal.add(external);
    if (movie.year && movie.title) seenTitleYear.add(titleYear);
    return true;
  });
}

export function useMovieStore() {
  const [state, setState] = useState<MovieAppState>(defaultState);
  const [ready, setReady] = useState(false);
  const [undoStack, setUndoStack] = useState<MovieAppState[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");

  useEffect(() => {
    setState(readState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [ready, state]);

  const allMovies = useMemo(
    () => uniqueMovies([...baseMovies, ...state.onlineMovies, ...state.customMovies]),
    [state.customMovies, state.onlineMovies]
  );

  const movieMap = useMemo(() => {
    return new Map(allMovies.map((movie) => [movie.id, movie]));
  }, [allMovies]);

  const counts = useMemo(
    () => ({
      watched: state.status.watched.length,
      wantToWatch: state.status.wantToWatch.length,
      skipped: state.status.skipped.length
    }),
    [state.status]
  );

  const pushUndo = useCallback(() => {
    setUndoStack((current) => [...current.slice(-19), state]);
  }, [state]);

  const markMovie = useCallback(
    (id: string, nextStatus: MovieStatusKey) => {
      pushUndo();
      setState((current) => ({
        ...current,
        status: {
          watched:
            nextStatus === "watched"
              ? [id, ...uniqueWithout(current.status.watched, id)]
              : uniqueWithout(current.status.watched, id),
          wantToWatch:
            nextStatus === "wantToWatch"
              ? [id, ...uniqueWithout(current.status.wantToWatch, id)]
              : uniqueWithout(current.status.wantToWatch, id),
          skipped:
            nextStatus === "skipped"
              ? [id, ...uniqueWithout(current.status.skipped, id)]
              : uniqueWithout(current.status.skipped, id)
        },
        actionHistory: [{ movieId: id, status: nextStatus, at: new Date().toISOString() }, ...(current.actionHistory ?? [])].slice(
          0,
          80
        )
      }));
    },
    [pushUndo]
  );

  const removeMovie = useCallback(
    (id: string) => {
      pushUndo();
      setState((current) => ({
        ...current,
        status: {
          watched: uniqueWithout(current.status.watched, id),
          wantToWatch: uniqueWithout(current.status.wantToWatch, id),
          skipped: uniqueWithout(current.status.skipped, id)
        }
      }));
    },
    [pushUndo]
  );

  const resetStatus = useCallback(() => {
    pushUndo();
    setState((current) => ({
      ...current,
      status: emptyStatus
    }));
  }, [pushUndo]);

  const undo = useCallback(() => {
    setUndoStack((current) => {
      const previous = current.at(-1);
      if (!previous) return current;
      setState(previous);
      return current.slice(0, -1);
    });
  }, []);

  const saveReview = useCallback(
    (movieId: string, review: MovieReview) => {
      pushUndo();
      setState((current) => ({
        ...current,
        reviews: {
          ...current.reviews,
          [movieId]: review
        }
      }));
    },
    [pushUndo]
  );

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...settings
      }
    }));
  }, []);

  const saveMovie = useCallback((movie: Movie) => {
    setState((current) => {
      const inBase = baseMovies.some((item) => item.id === movie.id);
      const merge = (item: Movie) => (item.id === movie.id ? { ...item, ...movie } : item);
      return {
        ...current,
        onlineMovies: inBase ? current.onlineMovies : uniqueMovies([movie, ...current.onlineMovies.map(merge)]).slice(0, 600),
        customMovies: current.customMovies.map(merge)
      };
    });
  }, []);

  const addMovieAsWatched = useCallback(
    (movie: Movie) => {
      pushUndo();
      setState((current) => {
        const exists = [...baseMovies, ...current.customMovies].some((item) => item.id === movie.id);
        const customMovies = exists ? current.customMovies : [movie, ...current.customMovies];
        return {
          ...current,
          customMovies,
          status: {
            watched: [movie.id, ...uniqueWithout(current.status.watched, movie.id)],
            wantToWatch: uniqueWithout(current.status.wantToWatch, movie.id),
            skipped: uniqueWithout(current.status.skipped, movie.id)
          },
          actionHistory: [
            { movieId: movie.id, status: "watched" as MovieStatusKey, at: new Date().toISOString() },
            ...(current.actionHistory ?? [])
          ].slice(0, 80)
        };
      });
    },
    [pushUndo]
  );

  const addCustomWatched = useCallback(
    (title: string) => {
      const cleaned = title.trim();
      if (!cleaned) return;
      addMovieAsWatched({
        id: `custom-${crypto.randomUUID()}`,
        title: cleaned,
        originalTitle: "",
        year: new Date().getFullYear(),
        type: "movie",
        rating: 0,
        popularity: 1,
        genres: ["自定义"],
        posterUrl: "",
        description: "手动添加的看过作品。",
        source: "自定义"
      });
    },
    [addMovieAsWatched]
  );

  const importWatchedTitles = useCallback(
    (entries: Array<{ title: string; year?: number; type?: "movie" | "tv"; rating?: number }>) => {
      const movies = entries
        .map((entry) => ({
          ...entry,
          title: normalizeImportedTitle(entry.title)
        }))
        .filter((entry) => entry.title)
        .map((entry): Movie => {
          const year = entry.year || getYear(entry.title) || new Date().getFullYear();
          return {
            id: `import-${entry.type ?? "movie"}-${year}-${entry.title}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-"),
            title: entry.title.replace(/\(\d{4}\)/, "").trim(),
            originalTitle: "",
            year,
            type: entry.type ?? "movie",
            rating: entry.rating ?? 0,
            popularity: 2,
            genres: ["导入"],
            posterUrl: "",
            description: "从外部片单导入的作品，可通过首页搜索补全资料。",
            source: "导入片单"
          };
        });

      pushUndo();
      setState((current) => ({
        ...current,
        customMovies: uniqueMovies([...movies, ...current.customMovies]),
        status: {
          ...current.status,
          watched: movies.map((movie) => movie.id).reduce(
            (ids, id) => (ids.includes(id) ? ids : [id, ...ids]),
            current.status.watched
          )
        }
      }));
      return movies.length;
    },
    [pushUndo]
  );

  const importDoubanText = useCallback(
    (text: string) => {
      const entries = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const year = getYear(line);
          const ratingMatch = line.match(/([0-9](?:\.[0-9])?)\s*分?/);
          const title = line
            .replace(/\s*\(?\d{4}\)?\s*/g, " ")
            .replace(/看过|想看|在看|评价|推荐|力荐|较差|很差/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          return { title, year, rating: ratingMatch ? Number(ratingMatch[1]) : undefined };
        });
      return importWatchedTitles(entries);
    },
    [importWatchedTitles]
  );

  const importImdbCsv = useCallback(
    (text: string) => {
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = parseCsvLine(lines.shift() ?? "").map((cell) => cell.toLowerCase());
      const titleIndex = header.findIndex((cell) => ["title", "const", "name"].includes(cell) || cell.includes("title"));
      const yearIndex = header.findIndex((cell) => cell.includes("year") || cell.includes("release"));
      const ratingIndex = header.findIndex((cell) => cell.includes("rating"));
      const entries = lines.map((line) => {
        const cells = parseCsvLine(line);
        return {
          title: cells[titleIndex >= 0 ? titleIndex : 1] ?? cells[0] ?? "",
          year: getYear(cells[yearIndex]),
          rating: ratingIndex >= 0 ? Number(cells[ratingIndex]) : undefined
        };
      });
      return importWatchedTitles(entries);
    },
    [importWatchedTitles]
  );

  const importState = useCallback(
    (nextState: Partial<MovieAppState>) => {
      pushUndo();
      setState(normalizeState(nextState));
    },
    [pushUndo]
  );

  const exportState = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        ...state
      },
      null,
      2
    );
  }, [state]);

  const exportWatchedCsv = useCallback(() => {
    const rows = state.status.watched.map((id) => {
      const movie = movieMap.get(id);
      const review = state.reviews[id];
      return [
        movie?.title ?? id,
        movie?.originalTitle ?? "",
        movie?.year ?? "",
        movie?.type === "tv" ? "电视剧" : "电影",
        movie?.rating ?? "",
        review?.personalRating ?? "",
        review?.watchDate ?? "",
        review?.platform ?? "",
        review?.rewatchCount ?? "",
        review?.privateTags ?? "",
        review?.customLists ?? "",
        (review?.review ?? "").replace(/\n/g, " ")
      ];
    });
    return [
      ["标题", "原名", "年份", "类型", "官方评分", "我的评分", "观看日期", "平台", "重看次数", "标签", "自定义片单", "影评"],
      ...rows
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }, [movieMap, state.reviews, state.status.watched]);

  const exportMarkdownReport = useCallback(() => {
    const year = new Date().getFullYear();
    const watched = state.status.watched
      .map((id) => movieMap.get(id))
      .filter(Boolean) as Movie[];
    const top = [...watched]
      .sort((a, b) => Number(state.reviews[b.id]?.personalRating || b.rating || 0) - Number(state.reviews[a.id]?.personalRating || a.rating || 0))
      .slice(0, 10);
    return [
      `# ${year} 我的影视报告`,
      "",
      `- 看过：${state.status.watched.length} 部`,
      `- 想看：${state.status.wantToWatch.length} 部`,
      `- 跳过：${state.status.skipped.length} 部`,
      "",
      "## 年度高分",
      ...top.map((movie, index) => `${index + 1}. ${movie.title} (${movie.year || "未知"}) - 我的评分 ${state.reviews[movie.id]?.personalRating || "未评分"}`),
      "",
      "## 私人片单标签",
      ...Object.values(state.reviews)
        .flatMap((review) => review.customLists.split(/[,，]/).map((item) => item.trim()).filter(Boolean))
        .reduce<string[]>((list, item) => (list.includes(item) ? list : [...list, item]), [])
        .map((item) => `- ${item}`)
    ].join("\n");
  }, [movieMap, state.reviews, state.status]);

  const searchLocal = useCallback(
    (query: string) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return [];
      return allMovies
        .filter((movie) => {
          const text = `${movie.title} ${movie.originalTitle ?? ""} ${movie.genres.join(" ")}`.toLowerCase();
          return text.includes(needle);
        })
        .slice(0, 10)
        .map((movie) => ({ ...movie, source: movie.source ?? "本地库" }));
    },
    [allMovies]
  );

  const loadOnlineRecommendations = useCallback(
    async (filters: Record<string, string>) => {
      setOnlineLoading(true);
      setOnlineError("");
      try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/discover?${params.toString()}`);
        if (!response.ok) {
          throw new Error("online source unavailable");
        }
        const data = await response.json();
        const movies = Array.isArray(data.movies) ? (data.movies as Movie[]) : [];
        setState((current) => ({
          ...current,
          onlineMovies: uniqueMovies([...movies, ...current.onlineMovies]).slice(0, 600)
        }));
      } catch {
        setOnlineError("在线片源暂时不可用，请稍后重试。");
      } finally {
        setOnlineLoading(false);
      }
    },
    []
  );

  const searchOnline = useCallback(
    async (query: string): Promise<MovieSearchResult[]> => {
      const settings = state.settings;
      const results: MovieSearchResult[] = [];
      const encoded = encodeURIComponent(query);

      try {
        const response = await fetch(`/api/search?q=${encoded}`).then((res) => res.json());
        if (Array.isArray(response.results) && response.results.length > 0) {
          const seen = new Set<string>();
          return response.results.filter((movie: MovieSearchResult) => {
            if (!movie.title || seen.has(movie.id)) return false;
            seen.add(movie.id);
            return true;
          });
        }
      } catch {
        // Fall back to client-side providers below.
      }

      try {
        const tvMaze = await fetch(`https://api.tvmaze.com/search/shows?q=${encoded}`).then((res) => res.json());
        for (const entry of tvMaze.slice(0, 6)) {
          const show = entry.show;
          results.push({
            id: `tvmaze-tv-${show.id}`,
            title: show.name,
            originalTitle: show.name,
            year: getYear(show.premiered),
            type: "tv",
            rating: show.rating?.average ?? 0,
            popularity: Math.min(10, Math.round((entry.score ?? 0) * 10)),
            genres: show.genres?.length ? show.genres : ["TVMaze"],
            posterUrl: show.image?.medium ?? "",
            description: show.summary ? stripHtml(show.summary) : "来自 TVMaze 的在线剧集搜索结果。",
            source: "TVMaze"
          });
        }
      } catch {
        // Keep search resilient when a provider is unavailable.
      }

      if (settings.tmdbApiKey || settings.tmdbBearerToken) {
        const headers: HeadersInit = settings.tmdbBearerToken
          ? { Authorization: `Bearer ${settings.tmdbBearerToken}` }
          : {};
        const auth = settings.tmdbBearerToken ? "" : `&api_key=${encodeURIComponent(settings.tmdbApiKey)}`;
        for (const [kind, type] of [
          ["movie", "movie"],
          ["tv", "tv"]
        ] as const) {
          try {
            const response = await fetch(
              `https://api.themoviedb.org/3/search/${kind}?query=${encoded}&include_adult=false&language=zh-CN&page=1${auth}`,
              { headers }
            ).then((res) => res.json());
            for (const item of (response.results ?? []).slice(0, 5)) {
              results.push({
                id: `tmdb-${type}-${item.id}`,
                title: type === "movie" ? item.title : item.name,
                originalTitle: type === "movie" ? item.original_title : item.original_name,
                year: getYear(type === "movie" ? item.release_date : item.first_air_date),
                type,
                rating: Number(item.vote_average ?? 0),
                popularity: Math.min(10, Math.round((Number(item.popularity ?? 0) / 20) * 10) / 10),
                genres: ["TMDb"],
                posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
                description: item.overview || "来自 TMDb 的在线搜索结果。",
                source: "TMDb"
              });
            }
          } catch {}
        }
      }

      if (settings.omdbApiKey) {
        try {
          const response = await fetch(
            `https://www.omdbapi.com/?apikey=${encodeURIComponent(settings.omdbApiKey)}&s=${encoded}&r=json`
          ).then((res) => res.json());
          for (const item of (response.Search ?? []).slice(0, 6)) {
            results.push({
              id: `omdb-${item.imdbID}`,
              title: item.Title,
              originalTitle: item.Title,
              year: getYear(item.Year),
              type: item.Type === "series" ? "tv" : "movie",
              rating: 0,
              popularity: 5,
              genres: ["OMDb"],
              posterUrl: item.Poster === "N/A" ? "" : item.Poster,
              description: `来自 OMDb / IMDb 的在线搜索结果。IMDb ID: ${item.imdbID}`,
              source: "OMDb / IMDb"
            });
          }
        } catch {}
      }

      if (settings.traktClientId) {
        try {
          const response = await fetch(`https://api.trakt.tv/search/movie,show?query=${encoded}`, {
            headers: {
              "trakt-api-version": "2",
              "trakt-api-key": settings.traktClientId
            }
          }).then((res) => res.json());
          for (const entry of response.slice(0, 8)) {
            const item = entry.show ?? entry.movie;
            const type = entry.show ? "tv" : "movie";
            results.push({
              id: `trakt-${entry.type}-${item.ids.trakt}`,
              title: item.title,
              originalTitle: item.title,
              year: item.year ?? 0,
              type,
              rating: 0,
              popularity: Math.min(10, Math.round((entry.score ?? 0) * 10)),
              genres: ["Trakt"],
              posterUrl: "",
              description: `来自 Trakt 的在线搜索结果。IMDb: ${item.ids.imdb ?? ""}`,
              source: "Trakt"
            });
          }
        } catch {}
      }

      if (settings.watchmodeApiKey) {
        try {
          const response = await fetch(
            `https://api.watchmode.com/v1/autocomplete-search/?apiKey=${encodeURIComponent(
              settings.watchmodeApiKey
            )}&search_value=${encoded}&search_type=2`
          ).then((res) => res.json());
          for (const item of (response.results ?? []).slice(0, 8)) {
            results.push({
              id: `watchmode-${item.id}`,
              title: item.name,
              originalTitle: item.name,
              year: getYear(item.year),
              type: item.tmdb_type === "tv" ? "tv" : "movie",
              rating: 0,
              popularity: Math.min(10, Math.round((Number(item.relevance ?? 0) / 50) * 10) / 10),
              genres: ["Watchmode"],
              posterUrl: item.image_url ?? "",
              description: `来自 Watchmode 的在线搜索结果。IMDb: ${item.imdb_id ?? ""}`,
              source: "Watchmode"
            });
          }
        } catch {}
      }

      const seen = new Set<string>();
      return results.filter((movie) => {
        if (!movie.title || seen.has(movie.id)) return false;
        seen.add(movie.id);
        return true;
      });
    },
    [state.settings]
  );

  return {
    ready,
    state,
    status: state.status,
    reviews: state.reviews,
    settings: state.settings,
    customMovies: state.customMovies,
    onlineMovies: state.onlineMovies,
    actionHistory: state.actionHistory,
    onlineLoading,
    onlineError,
    allMovies,
    movieMap,
    counts,
    markMovie,
    removeMovie,
    resetStatus,
    undo,
    canUndo: undoStack.length > 0,
    saveReview,
    saveMovie,
    updateSettings,
    addMovieAsWatched,
    addCustomWatched,
    importState,
    exportState,
    exportWatchedCsv,
    exportMarkdownReport,
    importDoubanText,
    importImdbCsv,
    searchLocal,
    searchOnline,
    loadOnlineRecommendations
  };
}
