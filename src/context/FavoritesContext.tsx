"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FavoritesResponse = {
  count?: number;
  error?: string;
  favorited?: boolean;
  serviceIds?: string[];
};

type FavoritesContextValue = {
  favoriteCount: number;
  favoriteIds: string[];
  isFavorite: (serviceId: string) => boolean;
  isLoaded: boolean;
  isPending: (serviceId: string) => boolean;
  refresh: () => Promise<void>;
  toggleFavorite: (serviceId: string) => Promise<boolean>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  async function refresh() {
    const response = await fetch("/api/favorites", {
      cache: "no-store",
      credentials: "same-origin",
    });

    const data = (await response.json()) as FavoritesResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Favoriler yuklenemedi.");
    }

    setFavoriteIds(data.serviceIds ?? []);
    setIsLoaded(true);
  }

  useEffect(() => {
    void refresh().catch(() => {
      setFavoriteIds([]);
      setIsLoaded(true);
    });
  }, []);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  async function toggleFavorite(serviceId: string) {
    const currentlyFavorite = favoriteIdSet.has(serviceId);

    if (pendingIds.includes(serviceId)) {
      return currentlyFavorite;
    }

    setPendingIds((current) => [...current, serviceId]);

    try {
      const response = await fetch("/api/favorites", {
        method: currentlyFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ serviceId }),
      });

      const data = (await response.json()) as FavoritesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Favori islemi tamamlanamadi.");
      }

      setFavoriteIds(data.serviceIds ?? []);
      setIsLoaded(true);
      return Boolean(data.favorited);
    } finally {
      setPendingIds((current) => current.filter((id) => id !== serviceId));
    }
  }

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteCount: favoriteIds.length,
      favoriteIds,
      isFavorite: (serviceId: string) => favoriteIdSet.has(serviceId),
      isLoaded,
      isPending: (serviceId: string) => pendingIds.includes(serviceId),
      refresh,
      toggleFavorite,
    }),
    [favoriteIdSet, favoriteIds, isLoaded, pendingIds],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }

  return context;
}