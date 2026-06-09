export type MovieType = "movie" | "tv";

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  type: MovieType;
  rating: number;
  popularity: number;
  genres: string[];
  posterUrl: string;
  backdropUrl?: string;
  description: string;
  source?: string;
  externalIds?: {
    tmdb?: number;
    imdb?: string;
    tvdb?: number;
  };
  runtime?: number;
  seasons?: number;
  director?: string;
  creators?: string[];
  cast?: string[];
  watchProviders?: string[];
  tmdbUrl?: string;
  similar?: Movie[];
}

export type MovieStatusKey = "watched" | "wantToWatch" | "skipped";

export interface MovieStatusState {
  watched: string[];
  wantToWatch: string[];
  skipped: string[];
}

export interface RecommendationFilters {
  type: "all" | MovieType;
  genre: "all" | string;
  yearRange: "all" | "recent5" | "recent10" | "classic";
  minRating: "all" | "7" | "8" | "9";
}

export interface AppSettings {
  allowRepeatRecommendations: boolean;
  onlyHighRated: boolean;
  boostUnwatchedGenres: boolean;
  useSmartRecommendation: boolean;
  tmdbApiKey: string;
  tmdbBearerToken: string;
  omdbApiKey: string;
  traktClientId: string;
  watchmodeApiKey: string;
}

export interface MovieReview {
  personalRating?: number | "";
  review: string;
  watchDate: string;
  platform: string;
  rewatch: boolean;
  rewatchCount?: number;
  privateTags: string;
  customLists: string;
}

export interface ActionHistoryItem {
  movieId: string;
  status: MovieStatusKey;
  at: string;
}

export interface MovieAppState {
  status: MovieStatusState;
  customMovies: Movie[];
  onlineMovies: Movie[];
  reviews: Record<string, MovieReview>;
  actionHistory: ActionHistoryItem[];
  settings: AppSettings;
}

export interface MovieSearchResult extends Movie {
  source: string;
}

export type RecommendationMode = "balanced" | "popular" | "highRated" | "hiddenGem" | "recent" | "classic" | "chinese";
