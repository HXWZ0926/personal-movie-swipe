"use client";

import { Header } from "@/components/Header";
import { useMovieStore } from "@/hooks/useMovieStore";

function topEntries(map: Map<string, number>, limit = 8) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export default function StatsPage() {
  const store = useMovieStore();
  const currentYear = new Date().getFullYear();

  const watchedMovies = store.status.watched.map((id) => store.movieMap.get(id)).filter(Boolean);
  const rated = store.status.watched
    .map((id) => ({ id, review: store.reviews[id], movie: store.movieMap.get(id) }))
    .filter((item) => item.review?.personalRating !== undefined && item.review?.personalRating !== "");
  const averageRating =
    rated.length > 0 ? (rated.reduce((sum, item) => sum + Number(item.review?.personalRating ?? 0), 0) / rated.length).toFixed(2) : "暂无";

  const genreCount = new Map<string, number>();
  const decadeCount = new Map<string, number>();
  const platformCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();

  watchedMovies.forEach((movie) => {
    movie?.genres.forEach((genre) => genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1));
    const decade = movie?.year ? `${Math.floor(movie.year / 10) * 10}s` : "未知";
    decadeCount.set(decade, (decadeCount.get(decade) ?? 0) + 1);
    sourceCount.set(movie?.source ?? "本地库", (sourceCount.get(movie?.source ?? "本地库") ?? 0) + 1);
  });

  Object.values(store.reviews).forEach((review) => {
    if (review.platform) platformCount.set(review.platform, (platformCount.get(review.platform) ?? 0) + 1);
  });

  const watchedThisYear = store.status.watched.filter((id) => store.reviews[id]?.watchDate?.startsWith(String(currentYear))).length;
  const rewatchCount = Object.values(store.reviews).filter((review) => review.rewatch || Number(review.rewatchCount ?? 1) > 1).length;
  const topRated = rated.sort((a, b) => Number(b.review?.personalRating ?? 0) - Number(a.review?.personalRating ?? 0)).slice(0, 10);

  return (
    <main className="min-h-screen pb-28 sm:pb-8">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6">
        <section>
          <p className="text-sm text-white/55">个人影视档案</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">{currentYear} 年度报告</h1>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {[
            ["已看", store.counts.watched],
            ["今年观看", watchedThisYear],
            ["想看", store.counts.wantToWatch],
            ["重看", rewatchCount],
            ["平均个人评分", averageRating]
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-[28px] p-5">
              <p className="text-sm text-white/55">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {[
            ["常看类型", topEntries(genreCount)],
            ["年份分布", topEntries(decadeCount)],
            ["观看平台", topEntries(platformCount)],
            ["片源来源", topEntries(sourceCount)]
          ].map(([title, entries]) => (
            <div key={title as string} className="glass rounded-[28px] p-5">
              <h2 className="text-xl font-semibold">{title as string}</h2>
              <div className="mt-4 space-y-3">
                {(entries as [string, number][]).length > 0 ? (
                  (entries as [string, number][]).map(([name, count]) => (
                    <div key={name}>
                      <div className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span>{count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-cyan-200" style={{ width: `${Math.min(100, count * 14)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/55">暂无数据</p>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="glass rounded-[28px] p-5">
          <h2 className="text-xl font-semibold">个人高分榜</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topRated.length > 0 ? (
              topRated.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between rounded-[18px] bg-white/10 px-4 py-3 text-sm">
                  <span>
                    {index + 1}. {item.movie?.title ?? item.id}
                  </span>
                  <span className="text-emerald-200">{item.review?.personalRating}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/55">给看过作品打分后会生成榜单。</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
