import { NextResponse } from "next/server";
import type { Movie, MovieType } from "@/types/movie";

export const dynamic = "force-dynamic";

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

function authHeaders(): HeadersInit {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

function authQuery() {
  const bearer = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  return bearer || !apiKey ? "" : `&api_key=${encodeURIComponent(apiKey)}`;
}

function mapGenres(genres: unknown, ids?: unknown) {
  if (Array.isArray(genres) && genres.length > 0) {
    return genres.map((genre: any) => genre.name).filter(Boolean);
  }
  const list = Array.isArray(ids) ? ids : [];
  const names = list.map((id) => tmdbGenreNames[String(id)]).filter(Boolean);
  return names.length > 0 ? Array.from(new Set(names)) : ["TMDb"];
}

function mapBriefMovie(item: any, type: MovieType): Movie {
  return {
    id: `tmdb-${type}-${item.id}`,
    title: type === "movie" ? item.title : item.name,
    originalTitle: type === "movie" ? item.original_title : item.original_name,
    year: getYear(type === "movie" ? item.release_date : item.first_air_date),
    type,
    rating: Number(item.vote_average ?? 0),
    popularity: normalizePopularity(item.popularity),
    genres: mapGenres(item.genres, item.genre_ids),
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
    description: item.overview || "来自 TMDb 的相似推荐。",
    source: "TMDb 在线片源",
    externalIds: { tmdb: item.id },
    tmdbUrl: `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${item.id}`
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id") ?? "";
  const type = (searchParams.get("type") as MovieType) || (rawId.includes("-tv-") ? "tv" : "movie");
  const tmdbId = Number(searchParams.get("tmdbId") ?? rawId.match(/tmdb-(?:movie|tv)-(\d+)/)?.[1]);

  if (!tmdbId || (!process.env.TMDB_BEARER_TOKEN && !process.env.TMDB_API_KEY)) {
    return NextResponse.json({ movie: null, similar: [] });
  }

  const endpoint = type === "movie" ? "movie" : "tv";
  const append = type === "movie" ? "credits,similar,external_ids,watch/providers" : "credits,similar,external_ids,recommendations,watch/providers";
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?language=zh-CN&append_to_response=${append}${authQuery()}`;
  const response = await fetch(url, { headers: authHeaders(), next: { revalidate: 3600 } });
  if (!response.ok) {
    return NextResponse.json({ movie: null, similar: [] }, { status: 502 });
  }

  const data = await response.json();
  const crew = data.credits?.crew ?? [];
  const cast = (data.credits?.cast ?? []).slice(0, 8).map((person: any) => person.name).filter(Boolean);
  const director = crew.find((person: any) => person.job === "Director")?.name;
  const creators = (data.created_by ?? []).map((person: any) => person.name).filter(Boolean);
  const similar = ((data.similar?.results ?? data.recommendations?.results ?? []) as any[])
    .slice(0, 10)
    .map((item) => mapBriefMovie(item, type));
  const providerRegion = data["watch/providers"]?.results?.CN ?? data["watch/providers"]?.results?.US;
  const watchProviders = [
    ...(providerRegion?.flatrate ?? []),
    ...(providerRegion?.rent ?? []),
    ...(providerRegion?.buy ?? [])
  ]
    .map((provider: any) => provider.provider_name)
    .filter(Boolean)
    .filter((name: string, index: number, list: string[]) => list.indexOf(name) === index)
    .slice(0, 8);

  const movie: Movie = {
    ...mapBriefMovie(data, type),
    runtime: type === "movie" ? data.runtime : data.episode_run_time?.[0],
    seasons: type === "tv" ? data.number_of_seasons : undefined,
    director,
    creators,
    cast,
    watchProviders,
    externalIds: {
      tmdb: tmdbId,
      imdb: data.external_ids?.imdb_id,
      tvdb: data.external_ids?.tvdb_id
    },
    similar
  };

  return NextResponse.json({ movie, similar });
}
