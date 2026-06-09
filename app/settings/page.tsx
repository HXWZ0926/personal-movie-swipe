"use client";

import { useEffect, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { useMovieStore } from "@/hooks/useMovieStore";
import type { AppSettings } from "@/types/movie";

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const store = useMovieStore();
  const settings = store.settings;
  const [providerStatus, setProviderStatus] = useState<{ tmdb: boolean; tvmaze: boolean } | null>(null);
  const [doubanText, setDoubanText] = useState("");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    fetch("/api/provider-status")
      .then((response) => response.json())
      .then((data) => setProviderStatus(data.providers))
      .catch(() => setProviderStatus(null));
  }, []);

  function update<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    store.updateSettings({ [key]: value });
  }

  async function importJson(file: File | null) {
    if (!file) return;
    const text = await file.text();
    store.importState(JSON.parse(text));
  }

  async function importImdb(file: File | null) {
    if (!file) return;
    const count = store.importImdbCsv(await file.text());
    setImportMessage(`已导入 ${count} 部 IMDb 作品。`);
  }

  return (
    <main className="min-h-screen pb-28 sm:pb-8">
      <Header />

      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 sm:px-6">
        <section>
          <p className="text-sm text-white/55">偏好、备份与在线来源</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">设置</h1>
        </section>

        <section className="glass rounded-[28px] p-5">
          <h2 className="text-lg font-semibold">推荐偏好</h2>
          <div className="mt-4 grid gap-3">
            <label className="flex items-center justify-between gap-4 rounded-[20px] bg-white/10 p-4">
              <span>
                <span className="block font-medium">允许重复推荐</span>
                <span className="mt-1 block text-sm text-white/55">已标记作品也可以重新回到刷卡池。</span>
              </span>
              <input
                type="checkbox"
                checked={settings.allowRepeatRecommendations}
                onChange={(event) => update("allowRepeatRecommendations", event.target.checked)}
                className="h-5 w-5 accent-cyan-200"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-[20px] bg-white/10 p-4">
              <span>
                <span className="block font-medium">只推荐高分作品</span>
                <span className="mt-1 block text-sm text-white/55">推荐池会优先保留 8 分以上作品。</span>
              </span>
              <input
                type="checkbox"
                checked={settings.onlyHighRated}
                onChange={(event) => update("onlyHighRated", event.target.checked)}
                className="h-5 w-5 accent-cyan-200"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-[20px] bg-white/10 p-4">
              <span>
                <span className="block font-medium">启用智能推荐画像</span>
                <span className="mt-1 block text-sm text-white/55">根据看过、想看、跳过和个人评分动态调整刷卡权重。</span>
              </span>
              <input
                type="checkbox"
                checked={settings.useSmartRecommendation}
                onChange={(event) => update("useSmartRecommendation", event.target.checked)}
                className="h-5 w-5 accent-cyan-200"
              />
            </label>
          </div>
        </section>

        <section className="glass rounded-[28px] p-5">
          <h2 className="text-lg font-semibold">在线影视库</h2>
          <p className="mt-2 text-sm text-white/55">
            TVMaze 无需 Key。TMDb 支持服务端环境变量配置，其他服务也可以在这里临时填写并保存在本机 localStorage。
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="glass-soft rounded-[18px] px-4 py-3 text-sm">
              <span className="text-white/55">TVMaze</span>
              <p className="mt-1 font-medium text-emerald-200">已启用</p>
            </div>
            <div className="glass-soft rounded-[18px] px-4 py-3 text-sm">
              <span className="text-white/55">TMDb</span>
              <p className={providerStatus?.tmdb ? "mt-1 font-medium text-emerald-200" : "mt-1 font-medium text-white/60"}>
                {providerStatus?.tmdb ? "服务端已启用" : "未检测到服务端 Key"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            {[
              ["tmdbApiKey", "TMDb API Key"],
              ["tmdbBearerToken", "TMDb Bearer Token"],
              ["omdbApiKey", "OMDb API Key"],
              ["traktClientId", "Trakt Client ID"],
              ["watchmodeApiKey", "Watchmode API Key"]
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1.5 text-sm text-white/70">
                {label}
                <input
                  value={String(settings[key as keyof AppSettings] ?? "")}
                  onChange={(event) => update(key as keyof AppSettings, event.target.value as never)}
                  className="glass-soft h-11 rounded-[16px] px-3 text-white outline-none"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm text-white/60">
            申请入口：
            <a className="ml-2 text-cyan-200 underline" href="https://developer.themoviedb.org/" target="_blank">TMDb</a>
            <a className="ml-2 text-cyan-200 underline" href="https://www.omdbapi.com/apikey.aspx" target="_blank">OMDb</a>
            <a className="ml-2 text-cyan-200 underline" href="https://trakt.tv/oauth/applications" target="_blank">Trakt</a>
            <a className="ml-2 text-cyan-200 underline" href="https://api.watchmode.com/requestApiKey/" target="_blank">Watchmode</a>
          </div>
        </section>

        <section className="glass rounded-[28px] p-5">
          <h2 className="text-lg font-semibold">数据</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => downloadText("movie-swipe-backup.json", store.exportState(), "application/json")}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-medium text-[#172033] transition hover:bg-white/80"
            >
              <Download className="h-4 w-4" />
              导出完整 JSON
            </button>
            <button
              type="button"
              onClick={() => downloadText("movie-watched.csv", store.exportWatchedCsv(), "text/csv;charset=utf-8")}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-medium text-[#172033] transition hover:bg-white/80"
            >
              <Download className="h-4 w-4" />
              导出 CSV
            </button>
            <button
              type="button"
              onClick={() => downloadText("movie-year-report.md", store.exportMarkdownReport(), "text/markdown;charset=utf-8")}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-medium text-[#172033] transition hover:bg-white/80"
            >
              <Download className="h-4 w-4" />
              导出年度 Markdown
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
              <Upload className="h-4 w-4" />
              导入 JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => importJson(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
              <Upload className="h-4 w-4" />
              导入 IMDb CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => importImdb(event.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              onClick={store.resetStatus}
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-50 transition hover:bg-rose-500/25"
            >
              <RotateCcw className="h-4 w-4" />
              清空状态
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            <label className="grid gap-1.5 text-sm text-white/70">
              粘贴豆瓣片单文本
              <textarea
                value={doubanText}
                onChange={(event) => setDoubanText(event.target.value)}
                className="glass-soft min-h-28 rounded-[16px] p-3 text-white outline-none"
                placeholder="每行一个作品，例如：盗梦空间 2010 9分"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const count = store.importDoubanText(doubanText);
                  setImportMessage(`已导入 ${count} 部豆瓣文本作品。`);
                  setDoubanText("");
                }}
                className="rounded-[16px] bg-emerald-300 px-4 py-2 text-sm font-semibold text-[#06110d]"
              >
                导入豆瓣文本
              </button>
              {importMessage ? <span className="text-sm text-cyan-100">{importMessage}</span> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
