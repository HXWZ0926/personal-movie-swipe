"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "@/types/movie";

const storageKey = "movie-swipe-settings";

export const defaultSettings: AppSettings = {
  allowRepeatRecommendations: false,
  onlyHighRated: false,
  boostUnwatchedGenres: true,
  useSmartRecommendation: true,
  tmdbApiKey: "",
  tmdbBearerToken: "",
  omdbApiKey: "",
  traktClientId: "",
  watchmodeApiKey: ""
};

function readSettings() {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...(JSON.parse(raw) as Partial<AppSettings>)
    };
  } catch {
    return defaultSettings;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [isReady, settings]);

  function updateSetting<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    setSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  return {
    settings,
    updateSetting,
    isReady
  };
}
