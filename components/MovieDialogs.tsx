"use client";

import { ExternalLink, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Movie, MovieReview } from "@/types/movie";

const emptyReview: MovieReview = {
  personalRating: "",
  review: "",
  watchDate: new Date().toISOString().slice(0, 10),
  platform: "",
  rewatch: false,
  rewatchCount: 1,
  privateTags: "",
  customLists: ""
};

interface ReviewDialogProps {
  movie: Movie | null;
  review?: MovieReview;
  onClose: () => void;
  onSave: (review: MovieReview) => void;
}

function buildReviewDraft(movie: Movie, draft: MovieReview) {
  const rating = draft.personalRating ? `我给 ${draft.personalRating}/10。` : "";
  const tags = draft.privateTags ? `关键词：${draft.privateTags}。` : "";
  const platform = draft.platform ? `观看平台是 ${draft.platform}。` : "";
  const feeling =
    Number(draft.personalRating || 0) >= 8
      ? "整体很对胃口，最打动我的是它的情绪余韵和完成度。"
      : Number(draft.personalRating || 0) >= 6
        ? "整体值得看，但也有一些节奏或表达上的保留。"
        : "这次观看没有完全进入状态，可能不太适合当下的我。";
  return [rating, platform, tags, feeling, `《${movie.title}》可以先记作：${movie.description.slice(0, 80)}...`]
    .filter(Boolean)
    .join("\n");
}

export function ReviewDialog({ movie, review, onClose, onSave }: ReviewDialogProps) {
  const [draft, setDraft] = useState<MovieReview>(review ?? emptyReview);

  useEffect(() => {
    setDraft(review ?? { ...emptyReview, watchDate: new Date().toISOString().slice(0, 10) });
  }, [review, movie]);

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-4">
      <section className="glass w-full max-w-2xl rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/55">评分与影评</p>
            <h2 className="text-2xl font-semibold">{movie.title}</h2>
          </div>
          <button onClick={onClose} className="glass-soft grid h-10 w-10 place-items-center rounded-[16px]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 text-sm text-white/70 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span>个人评分</span>
              <span className="text-lg font-semibold text-white">{draft.personalRating || "未评分"}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={draft.personalRating === "" ? 0 : draft.personalRating}
              onChange={(event) => setDraft((current) => ({ ...current, personalRating: Number(event.target.value) }))}
              className="w-full accent-cyan-200"
            />
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {[0, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, personalRating: value }))}
                  className="rounded-[12px] bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5 text-sm text-white/70">
            观看日期
            <input
              type="date"
              value={draft.watchDate}
              onChange={(event) => setDraft((current) => ({ ...current, watchDate: event.target.value }))}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            观看平台
            <input
              value={draft.platform}
              onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value }))}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
              placeholder="影院 / Netflix / B站 / 电视"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            私人标签
            <input
              value={draft.privateTags}
              onChange={(event) => setDraft((current) => ({ ...current, privateTags: event.target.value }))}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
              placeholder="治愈、神作、下饭"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-white/70">
            重看次数
            <input
              type="number"
              min={1}
              max={99}
              value={draft.rewatchCount ?? 1}
              onChange={(event) => setDraft((current) => ({ ...current, rewatchCount: Number(event.target.value) }))}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-white/70 sm:col-span-2">
            自定义片单
            <input
              value={draft.customLists}
              onChange={(event) => setDraft((current) => ({ ...current, customLists: event.target.value }))}
              className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
              placeholder="年度十佳, 私人神作"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={draft.rewatch}
              onChange={(event) => setDraft((current) => ({ ...current, rewatch: event.target.checked }))}
              className="h-5 w-5 accent-cyan-300"
            />
            二刷 / 重看
          </label>
          <label className="grid gap-1.5 text-sm text-white/70 sm:col-span-2">
            影评 / 备注
            <textarea
              value={draft.review}
              onChange={(event) => setDraft((current) => ({ ...current, review: event.target.value }))}
              className="glass-soft min-h-36 rounded-[16px] p-3 text-white outline-none"
              placeholder="写一点只给自己看的感受。"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => setDraft((current) => ({ ...current, review: buildReviewDraft(movie, current) }))}
            className="glass-soft inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            生成影评草稿
          </button>
          <button onClick={onClose} className="glass-soft rounded-[16px] px-4 py-2 text-sm">
            取消
          </button>
          <button
            onClick={() => onSave({ ...draft, rewatch: draft.rewatch || Number(draft.rewatchCount ?? 1) > 1 })}
            className="rounded-[16px] bg-white px-4 py-2 text-sm font-semibold text-[#172033]"
          >
            保存
          </button>
        </div>
      </section>
    </div>
  );
}

interface DetailDialogProps {
  movie: Movie | null;
  review?: MovieReview;
  onClose: () => void;
  onEditReview: () => void;
  onMovieUpdate?: (movie: Movie) => void;
  onOpenMovie?: (movie: Movie) => void;
}

export function DetailDialog({ movie, review, onClose, onEditReview, onMovieUpdate, onOpenMovie }: DetailDialogProps) {
  const [detail, setDetail] = useState<Movie | null>(movie);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDetail(movie);
    if (!movie || (!movie.externalIds?.tmdb && !movie.id.startsWith("tmdb-"))) return;
    setLoading(true);
    const params = new URLSearchParams({
      id: movie.id,
      type: movie.type,
      tmdbId: String(movie.externalIds?.tmdb ?? "")
    });
    fetch(`/api/details?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.movie) return;
        const nextMovie = { ...movie, ...data.movie };
        setDetail(nextMovie);
        onMovieUpdate?.(nextMovie);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [movie, onMovieUpdate]);

  const displayed = detail ?? movie;
  const meta = useMemo(() => {
    if (!displayed) return [];
    return [
      ["官方评分", displayed.rating || "暂无"],
      ["热度", displayed.popularity || "暂无"],
      ["片长", displayed.runtime ? `${displayed.runtime} 分钟` : displayed.seasons ? `${displayed.seasons} 季` : "暂无"],
      ["导演 / 主创", displayed.director || displayed.creators?.join("、") || "暂无"],
      ["我的评分", review?.personalRating || "未评分"],
      ["观看日期", review?.watchDate || "未记录"],
      ["平台", review?.platform || "未记录"],
      ["重看", review?.rewatch ? `${review.rewatchCount ?? 2} 次` : "否"]
    ];
  }, [displayed, review]);

  if (!displayed) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-4">
      <section className="glass relative grid w-full max-w-5xl gap-5 overflow-hidden rounded-[28px] p-5 md:grid-cols-[250px_1fr]">
        {displayed.backdropUrl ? (
          <img src={displayed.backdropUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15" />
        ) : null}
        <div className="relative overflow-hidden rounded-[24px] bg-white/10">
          {displayed.posterUrl ? (
            <img src={displayed.posterUrl} alt={`${displayed.title} 海报`} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="grid aspect-[2/3] place-items-center text-white/50">无海报</div>
          )}
        </div>
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-100/70">{displayed.source ?? "本地库"} {loading ? "· 正在补全资料..." : ""}</p>
              <h2 className="text-3xl font-semibold">{displayed.title}</h2>
              <p className="mt-1 text-sm text-white/55">
                {displayed.originalTitle} · {displayed.year || "未知年份"} · {displayed.type === "tv" ? "电视剧" : "电影"}
              </p>
            </div>
            <button onClick={onClose} className="glass-soft grid h-10 w-10 place-items-center rounded-[16px]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {displayed.genres.map((genre) => (
              <span key={genre} className="glass-soft rounded-full px-3 py-1 text-xs">
                {genre}
              </span>
            ))}
          </div>

          <p className="mt-4 text-sm leading-7 text-white/75">{displayed.description}</p>

          {displayed.cast?.length ? (
            <p className="mt-3 text-sm leading-6 text-white/65">主演：{displayed.cast.join("、")}</p>
          ) : null}
          {displayed.watchProviders?.length ? (
            <p className="mt-2 text-sm leading-6 text-white/65">可看平台：{displayed.watchProviders.join("、")}</p>
          ) : null}

          <div className="mt-5 grid gap-3 rounded-[22px] border border-white/15 bg-white/10 p-4 text-sm text-white/75 sm:grid-cols-2">
            {meta.map(([label, value]) => (
              <div key={label}>
                {label}：{value}
              </div>
            ))}
            <div className="sm:col-span-2">标签：{review?.privateTags || "无"}</div>
            <div className="sm:col-span-2">自定义片单：{review?.customLists || "无"}</div>
            <div className="sm:col-span-2">影评：{review?.review || "还没有写。"}</div>
          </div>

          {displayed.similar?.length ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-white">相似作品</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {displayed.similar.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDetail(item);
                      onOpenMovie?.(item);
                    }}
                    className="overflow-hidden rounded-[16px] bg-white/10 text-left"
                  >
                    {item.posterUrl ? <img src={item.posterUrl} alt="" className="aspect-[2/3] w-full object-cover" /> : null}
                    <span className="line-clamp-2 px-2 py-2 text-xs text-white/80">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={onEditReview}
              className="rounded-[16px] bg-white px-4 py-2 text-sm font-semibold text-[#172033]"
            >
              编辑评分 / 影评
            </button>
            {displayed.tmdbUrl ? (
              <a
                href={displayed.tmdbUrl}
                target="_blank"
                className="glass-soft inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                打开 TMDb
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
