import type {
  AppSettings,
  Movie,
  MovieReview,
  MovieStatusState,
  RecommendationFilters
} from "@/types/movie";

const currentYear = new Date().getFullYear();

export function getMarkedIds(status: MovieStatusState) {
  return new Set([...status.watched, ...status.wantToWatch, ...status.skipped]);
}

export interface PreferenceProfile {
  favoriteGenres: Map<string, number>;
  skippedGenres: Map<string, number>;
  favoriteTypes: Map<Movie["type"], number>;
  averagePersonalRating: number;
}

export function buildPreferenceProfile(
  movies: Movie[],
  status: MovieStatusState,
  reviews: Record<string, MovieReview>
): PreferenceProfile {
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  const favoriteGenres = new Map<string, number>();
  const skippedGenres = new Map<string, number>();
  const favoriteTypes = new Map<Movie["type"], number>();
  const personalRatings: number[] = [];

  function add(map: Map<string, number>, key: string, amount: number) {
    map.set(key, (map.get(key) ?? 0) + amount);
  }

  status.watched.forEach((id) => {
    const movie = byId.get(id);
    if (!movie) return;
    const rating = Number(reviews[id]?.personalRating || 0);
    if (rating) personalRatings.push(rating);
    const amount = rating >= 8 ? 2.4 : rating >= 6 ? 1.4 : 0.8;
    movie.genres.forEach((genre) => add(favoriteGenres, genre, amount));
    favoriteTypes.set(movie.type, (favoriteTypes.get(movie.type) ?? 0) + amount);
  });

  status.wantToWatch.forEach((id) => {
    const movie = byId.get(id);
    if (!movie) return;
    movie.genres.forEach((genre) => add(favoriteGenres, genre, 1));
    favoriteTypes.set(movie.type, (favoriteTypes.get(movie.type) ?? 0) + 0.7);
  });

  status.skipped.forEach((id) => {
    const movie = byId.get(id);
    if (!movie) return;
    movie.genres.forEach((genre) => add(skippedGenres, genre, 0.8));
  });

  return {
    favoriteGenres,
    skippedGenres,
    favoriteTypes,
    averagePersonalRating: personalRatings.length
      ? personalRatings.reduce((sum, value) => sum + value, 0) / personalRatings.length
      : 0
  };
}

export function getRecommendationWeight(movie: Movie, settings?: AppSettings, profile?: PreferenceProfile) {
  const baseWeight = movie.rating * 0.6 + movie.popularity * 0.4;
  const highRatingBoost = settings?.onlyHighRated && movie.rating >= 8 ? 1.15 : 1;
  let smartBoost = 1;

  if (settings?.useSmartRecommendation && profile) {
    const positive = movie.genres.reduce((sum, genre) => sum + (profile.favoriteGenres.get(genre) ?? 0), 0);
    const negative = movie.genres.reduce((sum, genre) => sum + (profile.skippedGenres.get(genre) ?? 0), 0);
    smartBoost += Math.min(0.75, positive * 0.08);
    smartBoost -= Math.min(0.45, negative * 0.06);
    smartBoost += Math.min(0.25, (profile.favoriteTypes.get(movie.type) ?? 0) * 0.04);
    if (profile.averagePersonalRating >= 8 && movie.rating >= 8) smartBoost += 0.12;
  }

  return Math.max(0.1, baseWeight * highRatingBoost * smartBoost);
}

export function filterMovies(
  items: Movie[],
  filters: RecommendationFilters,
  status: MovieStatusState,
  settings: AppSettings
) {
  const markedIds = getMarkedIds(status);

  return items.filter((movie) => {
    if (!settings.allowRepeatRecommendations && markedIds.has(movie.id)) {
      return false;
    }

    if (settings.onlyHighRated && movie.rating < 8) {
      return false;
    }

    if (filters.type !== "all" && movie.type !== filters.type) {
      return false;
    }

    if (filters.genre !== "all" && !movie.genres.includes(filters.genre)) {
      return false;
    }

    if (filters.minRating !== "all" && movie.rating < Number(filters.minRating)) {
      return false;
    }

    if (filters.yearRange === "recent5" && movie.year < currentYear - 5) {
      return false;
    }

    if (filters.yearRange === "recent10" && movie.year < currentYear - 10) {
      return false;
    }

    if (filters.yearRange === "classic" && movie.year >= currentYear - 10) {
      return false;
    }

    return true;
  });
}

export function pickWeightedRandomMovie(items: Movie[], settings?: AppSettings, profile?: PreferenceProfile) {
  if (items.length === 0) {
    return null;
  }

  const weighted = items.map((movie) => ({
    movie,
    weight: getRecommendationWeight(movie, settings, profile)
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.movie;
    }
  }

  return weighted[weighted.length - 1]?.movie ?? null;
}

export function getRecommendationReason(movie: Movie, profile?: PreferenceProfile) {
  if (!profile) return "评分和热度较高，适合快速刷卡判断。";
  const likedGenres = movie.genres
    .filter((genre) => (profile.favoriteGenres.get(genre) ?? 0) > (profile.skippedGenres.get(genre) ?? 0))
    .slice(0, 2);
  if (likedGenres.length > 0) {
    return `推荐原因：你最近更偏向 ${likedGenres.join(" / ")} 类型。`;
  }
  if ((profile.favoriteTypes.get(movie.type) ?? 0) > 2) {
    return `推荐原因：你对${movie.type === "tv" ? "剧集" : "电影"}的标记更积极。`;
  }
  if (movie.rating >= 8.5) return "推荐原因：高分作品，适合作为补片候选。";
  if (movie.popularity >= 8) return "推荐原因：近期热度较高，可以快速判断是否感兴趣。";
  return "推荐原因：保留随机探索，避免推荐池太同质化。";
}
