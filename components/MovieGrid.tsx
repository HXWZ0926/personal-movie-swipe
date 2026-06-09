import { Trash2 } from "lucide-react";
import type { Movie } from "@/types/movie";

interface MovieGridProps {
  movies: Movie[];
  onRemove: (id: string) => void;
}

export function MovieGrid({ movies, onRemove }: MovieGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {movies.map((movie) => (
        <article key={movie.id} className="glass overflow-hidden rounded-[8px]">
          <img
            src={movie.posterUrl}
            alt={`${movie.title} 海报`}
            className="aspect-[2/3] w-full object-cover"
            loading="lazy"
          />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold leading-snug">{movie.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {movie.year} · {movie.rating.toFixed(1)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(movie.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-white/10 text-slate-300 transition hover:bg-rose-500 hover:text-white"
                title="从片单中移除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {movie.genres.slice(0, 3).map((genre) => (
                <span key={genre} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
