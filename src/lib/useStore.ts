"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStore, saveStore } from "./store";
import type { FunLmaStore } from "./types";

export function useStore() {
  const [store, setStoreState] = useState<FunLmaStore | null>(null);

  useEffect(() => {
    setStoreState(loadStore());
    const handler = () => setStoreState(loadStore());
    window.addEventListener("funlma:store-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("funlma:store-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = useCallback(
    (updater: (prev: FunLmaStore) => FunLmaStore) => {
      setStoreState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveStore(next);
        return next;
      });
    },
    [],
  );

  return { store, update, ready: store !== null };
}

export function useActiveUser() {
  const { store, update, ready } = useStore();
  const activeUser =
    store && store.activePersonaId ? store.users[store.activePersonaId] : null;
  return { store, activeUser, update, ready };
}
