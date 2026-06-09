"use client";

import { useEffect, useMemo, useState } from "react";
import type { MovieStatusKey, MovieStatusState } from "@/types/movie";

const storageKey = "movie-swipe-status";

const initialStatus: MovieStatusState = {
  watched: [],
  wantToWatch: [],
  skipped: []
};

function uniqueWithout(ids: string[], targetId: string) {
  return ids.filter((id) => id !== targetId);
}

function readStatus(): MovieStatusState {
  if (typeof window === "undefined") {
    return initialStatus;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return initialStatus;
    }

    const parsed = JSON.parse(raw) as Partial<MovieStatusState>;
    return {
      watched: Array.isArray(parsed.watched) ? parsed.watched : [],
      wantToWatch: Array.isArray(parsed.wantToWatch) ? parsed.wantToWatch : [],
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : []
    };
  } catch {
    return initialStatus;
  }
}

export function useMovieStatus() {
  const [status, setStatus] = useState<MovieStatusState>(initialStatus);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setStatus(readStatus());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(status));
  }, [isReady, status]);

  const counts = useMemo(
    () => ({
      watched: status.watched.length,
      wantToWatch: status.wantToWatch.length,
      skipped: status.skipped.length
    }),
    [status]
  );

  function markMovie(id: string, nextStatus: MovieStatusKey) {
    setStatus((current) => ({
      watched:
        nextStatus === "watched"
          ? [id, ...uniqueWithout(current.watched, id)]
          : uniqueWithout(current.watched, id),
      wantToWatch:
        nextStatus === "wantToWatch"
          ? [id, ...uniqueWithout(current.wantToWatch, id)]
          : uniqueWithout(current.wantToWatch, id),
      skipped:
        nextStatus === "skipped"
          ? [id, ...uniqueWithout(current.skipped, id)]
          : uniqueWithout(current.skipped, id)
    }));
  }

  function removeMovie(id: string) {
    setStatus((current) => ({
      watched: uniqueWithout(current.watched, id),
      wantToWatch: uniqueWithout(current.wantToWatch, id),
      skipped: uniqueWithout(current.skipped, id)
    }));
  }

  function resetAllStatus() {
    setStatus(initialStatus);
  }

  return {
    status,
    counts,
    isReady,
    markMovie,
    removeMovie,
    resetAllStatus
  };
}
