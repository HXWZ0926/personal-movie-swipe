import { NextResponse } from "next/server";
import type { Movie, MovieType, RecommendationFilters, RecommendationMode } from "@/types/movie";

export const dynamic = "force-dynamic";

const genreNameToTmdb: Record<string, Partial<Record<MovieType, string>>> = {
  动作: { movie: "28", tv: "10759" },
  冒险: { movie: "12", tv: "10759" },
  动画: { movie: "16", tv: "16" },
  喜剧: { movie: "35", tv: "35" },
  犯罪: { movie: "80", tv: "80" },
  剧情: { movie: "18", tv: "18" },
  家庭: { movie: "10751", tv: "10751" },
  奇幻: { movie: "14", tv: "10765" },
  历史: { movie: "36" },
  恐怖: { movie: "27" },
  音乐: { movie: "10402" },
  悬疑: { movie: "9648", tv: "9648" },
  爱情: { movie: "10749", tv: "10749" },
  科幻: { movie: "878", tv: "10765" },
  战争: { movie: "10752", tv: "10768" },
  惊悚: { movie: "53" },
  传记: { movie: "36" }
};

const tmdbGenreNames: Record<string, string> = {
  "12": "冒险",
  "14": "奇幻",
  "16": "动画",
  "18": "剧情",
  "27": "恐怖",
  "28": "动作",
  "35": "喜剧",
  "36": "历史",
  "53": "惊悚",
  "80": "犯罪",
  "878": "科幻",
  "9648": "悬疑",
  "10402": "音乐",
  "10749": "爱情",
  "10751": "家庭",
  "10752": "战争",
  "10759": "动作",
  "10765": "科幻",
  "10768": "战争",
  "10770": "电视电影"
};

function getYear(value: unknown) {
  const match = String(value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function normalizePopularity(value: unknown) {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(10, Math.round(Math.log10(raw + 1) * 3.2 * 10) / 10);
}

function tmdbGenres(ids: unknown) {
  const list = Array.isArray(ids) ? ids : [];
  const names = list.map((id) => tmdbGenreNames[String(id)]).filter(Boolean);
  return names.length > 0 ? Array.from(new Set(names)) : ["TMDb"];
}

function withDateFilters(params: URLSearchParams, type: MovieType, yearRange: RecommendationFilters["yearRange"]) {
  if (yearRange === "all") return;

  const currentYear = new Date().getFullYear();
  const datePrefix = type === "movie" ? "primary_release_date" : "first_air_date";

  if (yearRange === "recent5") {
    params.set(`${datePrefix}.gte`, `${currentYear - 5}-01-01`);
  }

  if (yearRange === "recent10") {
    params.set(`${datePrefix}.gte`, `${currentYear - 10}-01-01`);
  }

  if (yearRange === "classic") {
    params.set(`${datePrefix}.lte`, `${currentYear - 10}-12-31`);
  }
}

function buildParams(type: MovieType, filters: RecommendationFilters, page: number, sortBy: string, mode: RecommendationMode) {
  const params = new URLSearchParams({
    include_adult: "false",
    include_null_first_air_dates: "false",
    include_video: "false",
    language: "zh-CN",
    page: String(page),
    sort_by: sortBy,
    "vote_count.gte": type === "movie" ? "120" : "80"
  });

  if (mode === "highRated") {
    params.set("vote_count.gte", type === "movie" ? "300" : "180");
    params.set("vote_average.gte", "8");
  }

  if (mode === "hiddenGem") {
    params.set("sort_by", "vote_average.desc");
    params.set("vote_count.gte", type === "movie" ? "80" : "60");
    params.set("vote_count.lte", type === "movie" ? "1200" : "800");
    params.set("vote_average.gte", "7.5");
  }

  if (mode === "recent") {
    params.set("sort_by", "popularity.desc");
    const currentYear = new Date().getFullYear();
    const datePrefix = type === "movie" ? "primary_release_date" : "first_air_date";
    params.set(`${datePrefix}.gte`, `${currentYear - 3}-01-01`);
  }

  if (mode === "classic") {
    params.set("sort_by", "vote_average.desc");
    const currentYear = new Date().getFullYear();
    const datePrefix = type === "movie" ? "primary_release_date" : "first_air_date";
    params.set(`${datePrefix}.lte`, `${currentYear - 15}-12-31`);
    params.set("vote_count.gte", type === "movie" ? "300" : "150");
  }

  if (mode === "chinese") {
    params.set("with_original_language", "zh");
  }

  if (filters.minRating !== "all") {
    params.set("vote_average.gte", filters.minRating);
  }

  const genreId = filters.genre !== "all" ? genreNameToTmdb[filters.genre]?.[type] : undefined;
  if (genreId) {
    params.set("with_genres", genreId);
  }

  withDateFilters(params, type, filters.yearRange);

  return params;
}

function authHeaders(): HeadersInit {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

function authQuery() {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  return bearer || !apiKey ? "" : `&api_key=${encodeURIComponent(apiKey)}`;
}

async function discoverType(type: MovieType, filters: RecommendationFilters, mode: RecommendationMode) {
  if (!process.env.TMDB_BEARER_TOKEN && !process.env.TMDB_API_KEY) return [];

  const endpoint = type === "movie" ? "movie" : "tv";
  const auth = authQuery();
  const headers = authHeaders();
  const requests: Promise<Movie[]>[] = [];

  const sorts = mode === "popular" ? ["popularity.desc"] : mode === "highRated" || mode === "classic" ? ["vote_average.desc"] : ["popularity.desc", "vote_average.desc"];
  for (const sortBy of sorts) {
    for (const page of [1, 2, 3]) {
      const params = buildParams(type, filters, page, sortBy, mode);
      requests.push(
        fetch(`https://api.themoviedb.org/3/discover/${endpoint}?${params.toString()}${auth}`, {
          headers,
          next: { revalidate: 1800 }
        })
          .then((response) => (response.ok ? response.json() : { results: [] }))
          .then((data) =>
            (data.results ?? [])
              .filter((item: any) => item?.poster_path && (item?.overview || item?.vote_average))
              .map((item: any): Movie => ({
                id: `tmdb-${type}-${item.id}`,
                title: type === "movie" ? item.title : item.name,
                originalTitle: type === "movie" ? item.original_title : item.original_name,
                year: getYear(type === "movie" ? item.release_date : item.first_air_date),
                type,
                rating: Number(item.vote_average ?? 0),
                popularity: normalizePopularity(item.popularity),
                genres: tmdbGenres(item.genre_ids),
                posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
                description: item.overview || "来自 TMDb 的在线推荐结果。",
                source: "TMDb 在线片源",
                externalIds: { tmdb: item.id },
                tmdbUrl: `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${item.id}`
              }))
          )
          .catch(() => [])
      );
    }
  }

  return (await Promise.all(requests)).flat();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters: RecommendationFilters = {
    type: (searchParams.get("type") as RecommendationFilters["type"]) || "all",
    genre: searchParams.get("genre") || "all",
    yearRange: (searchParams.get("yearRange") as RecommendationFilters["yearRange"]) || "all",
    minRating: (searchParams.get("minRating") as RecommendationFilters["minRating"]) || "all"
  };
  const mode = (searchParams.get("mode") as RecommendationMode) || "balanced";

  const types: MovieType[] =
    filters.type === "all" ? ["movie", "tv"] : filters.type === "movie" ? ["movie"] : ["tv"];
  const combined = (await Promise.all(types.map((type) => discoverType(type, filters, mode)))).flat();
  const seen = new Set<string>();
  const movies = combined.filter((movie) => {
    if (!movie.title || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });

  return NextResponse.json({ movies });
}
