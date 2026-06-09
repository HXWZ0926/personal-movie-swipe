import { NextResponse } from "next/server";
import type { MovieSearchResult, MovieType } from "@/types/movie";

export const dynamic = "force-dynamic";

function getYear(value: unknown) {
  const match = String(value ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function tmdbGenres(ids: unknown) {
  const map: Record<string, string> = {
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
    "10752": "战争"
  };
  const list = Array.isArray(ids) ? ids : [];
  const names = list.map((id) => map[String(id)]).filter(Boolean);
  return names.length > 0 ? names : ["TMDb"];
}

async function searchTvMaze(query: string): Promise<MovieSearchResult[]> {
  try {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.slice(0, 6).map((entry: any) => {
      const show = entry.show;
      return {
        id: `tvmaze-tv-${show.id}`,
        title: show.name,
        originalTitle: show.name,
        year: getYear(show.premiered),
        type: "tv" as MovieType,
        rating: show.rating?.average ?? 0,
        popularity: Math.min(10, Math.round((entry.score ?? 0) * 10)),
        genres: show.genres?.length ? show.genres : ["TVMaze"],
        posterUrl: show.image?.medium ?? "",
        description: show.summary ? stripHtml(show.summary) : "来自 TVMaze 的在线剧集搜索结果。",
        source: "TVMaze"
      };
    });
  } catch {
    return [];
  }
}

async function searchTmdb(query: string): Promise<MovieSearchResult[]> {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!bearer && !apiKey) return [];

  const results: MovieSearchResult[] = [];
  const headers: HeadersInit = bearer ? { Authorization: `Bearer ${bearer}` } : {};
  const auth = bearer ? "" : `&api_key=${encodeURIComponent(apiKey ?? "")}`;

  for (const [kind, type] of [
    ["movie", "movie"],
    ["tv", "tv"]
  ] as const) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/${kind}?query=${encodeURIComponent(
          query
        )}&include_adult=false&language=zh-CN&page=1${auth}`,
        { headers, next: { revalidate: 3600 } }
      );
      if (!response.ok) continue;
      const data = await response.json();
      for (const item of (data.results ?? []).slice(0, 8)) {
        results.push({
          id: `tmdb-${type}-${item.id}`,
          title: type === "movie" ? item.title : item.name,
          originalTitle: type === "movie" ? item.original_title : item.original_name,
          year: getYear(type === "movie" ? item.release_date : item.first_air_date),
          type,
          rating: Number(item.vote_average ?? 0),
          popularity: Math.min(10, Math.round((Number(item.popularity ?? 0) / 20) * 10) / 10),
          genres: tmdbGenres(item.genre_ids),
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
          description: item.overview || "来自 TMDb 的在线搜索结果。",
          source: "TMDb",
          externalIds: { tmdb: item.id },
          tmdbUrl: `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${item.id}`
        });
      }
    } catch {
      // Ignore provider errors so search remains usable.
    }
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const combined = [...(await searchTvMaze(query)), ...(await searchTmdb(query))];
  const seen = new Set<string>();
  const results = combined.filter((movie) => {
    if (!movie.title || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });

  return NextResponse.json({ results });
}
