import { Flame, Star } from "lucide-react";
import { useState } from "react";
import type { Movie } from "@/types/movie";

interface MovieCardProps {
  movie: Movie;
  animation?: "idle" | "left" | "right" | "up";
  reason?: string;
  onSwipe?: (direction: "left" | "right" | "up") => void;
}

const animationClass = {
  idle: "translate-x-0 translate-y-0 rotate-0 opacity-100",
  left: "-translate-x-[130%] rotate-[-16deg] opacity-0",
  right: "translate-x-[130%] rotate-[16deg] opacity-0",
  up: "-translate-y-[120%] scale-95 opacity-0"
};

export function MovieCard({ movie, animation = "idle", reason, onSwipe }: MovieCardProps) {
  const [drag, setDrag] = useState({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const dragStyle = drag.active
    ? {
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`,
        transition: "none"
      }
    : undefined;

  function finishDrag() {
    const absX = Math.abs(drag.x);
    const absY = Math.abs(drag.y);
    if (absY > 110 && drag.y < -70) onSwipe?.("up");
    else if (absX > 110) onSwipe?.(drag.x > 0 ? "right" : "left");
    setDrag({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  }

  return (
    <article
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ active: true, startX: event.clientX, startY: event.clientY, x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        if (!drag.active) return;
        setDrag((current) => ({
          ...current,
          x: event.clientX - current.startX,
          y: event.clientY - current.startY
        }));
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={dragStyle}
      className={`glass relative mx-auto h-[min(610px,calc(100svh-295px))] min-h-[470px] w-full max-w-[430px] touch-pan-y overflow-hidden rounded-[26px] shadow-[0_24px_70px_rgba(0,0,0,.36)] transition-all duration-300 ease-out sm:h-[610px] sm:rounded-[28px] sm:shadow-[0_30px_90px_rgba(0,0,0,.42)] ${animationClass[animation]}`}
    >
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={`${movie.title} 海报`} className="poster-mask h-[60%] w-full object-cover sm:h-[390px]" draggable={false} />
      ) : (
        <div className="poster-mask grid h-[60%] w-full place-items-center bg-white/10 text-white/45 sm:h-[390px]">无海报</div>
      )}

      <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
        <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {movie.type === "movie" ? "电影" : "电视剧"}
        </span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-amber-200 backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-current" />
            {movie.rating ? movie.rating.toFixed(1) : "暂无"}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-orange-200 backdrop-blur">
            <Flame className="h-3.5 w-3.5" />
            {movie.popularity ? movie.popularity.toFixed(1) : "0"}
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        {drag.active && Math.abs(drag.x) > 40 ? (
          <div
            className={`absolute top-[-260px] rounded-[18px] border-2 px-4 py-2 text-lg font-bold ${
              drag.x > 0 ? "right-6 rotate-12 border-emerald-300 text-emerald-200" : "left-6 -rotate-12 border-rose-300 text-rose-200"
            }`}
          >
            {drag.x > 0 ? "想看" : "跳过"}
          </div>
        ) : null}
        {drag.active && drag.y < -45 ? (
          <div className="absolute left-1/2 top-[-270px] -translate-x-1/2 rounded-[18px] border-2 border-cyan-200 px-4 py-2 text-lg font-bold text-cyan-100">
            看过
          </div>
        ) : null}
        <div className="mb-3 flex flex-wrap gap-2">
          {movie.genres.map((genre) => (
            <span key={genre} className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-xs text-white">
              {genre}
            </span>
          ))}
        </div>

        <h1 className="text-[1.7rem] font-semibold leading-tight tracking-normal sm:text-3xl">{movie.title}</h1>
        <p className="mt-1 text-sm text-white/55">
          {movie.originalTitle} · {movie.year || "未知年份"} · {movie.source ?? "本地库"}
        </p>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/70 sm:mt-4 sm:line-clamp-3">{movie.description}</p>
        {reason ? <p className="mt-3 line-clamp-2 rounded-[16px] bg-white/10 px-3 py-2 text-xs leading-5 text-cyan-50/80">{reason}</p> : null}
      </div>
    </article>
  );
}
