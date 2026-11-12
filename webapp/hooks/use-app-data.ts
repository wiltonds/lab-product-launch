import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { AppData, DEFAULT_APP_DATA, mergeAppData } from "@/shared/finance";
import { GUEST_STORAGE_KEY, LEGACY_GUEST_STORAGE_KEY, workspaceStorageKey } from "@/shared/workspace-storage";

type StoredWorkspace = { payload: Partial<AppData>; updatedAt: number };
function parseStored(value: string): StoredWorkspace {
  const parsed = JSON.parse(value) as Partial<AppData> | StoredWorkspace;
  if (parsed && typeof parsed === "object" && "payload" in parsed && parsed.payload) {
    return { payload: parsed.payload as Partial<AppData>, updatedAt: Number(parsed.updatedAt) || 0 };
  }
  // Support the earlier local-only format while migrating it exclusively into the guest scope.
  return { payload: parsed as Partial<AppData>, updatedAt: 0 };
}
const serialize = (payload: AppData, updatedAt: number) => JSON.stringify({ payload, updatedAt });

// Each screen calls useAppData(); this keeps every mounted screen in sync after an edit
// (before, a screen that was already mounted kept showing stale data until reloaded).
type Listener = (key: string, data: AppData, updatedAt: number) => void;
const listeners = new Set<Listener>();
const broadcast = (key: string, data: AppData, updatedAt: number, from: Listener) => listeners.forEach((l) => { if (l !== from) l(key, data, updatedAt); });

export function useAppData() {
  const { user, isAuthenticated } = useAuth();
  const openId = isAuthenticated ? user?.openId ?? null : null;
  const storageKey = workspaceStorageKey(openId);
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [localUpdatedAt, setLocalUpdatedAt] = useState(0);
  const dataRef = useRef(data);
  const localUpdatedAtRef = useRef(localUpdatedAt);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remote = trpc.workspace.get.useQuery(undefined, { enabled: false, retry: false });
  const saveRemote = trpc.workspace.save.useMutation();

  useEffect(() => { dataRef.current = data; }, [data]);
  const listenerRef = useRef<Listener>(() => undefined);
  useEffect(() => {
    const listener: Listener = (key, next, updatedAt) => {
      if (key !== storageKey) return;
      dataRef.current = next;
      localUpdatedAtRef.current = updatedAt;
      setData(next);
      setLocalUpdatedAt(updatedAt);
    };
    listenerRef.current = listener;
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, [storageKey]);
  useEffect(() => { localUpdatedAtRef.current = localUpdatedAt; }, [localUpdatedAt]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    setLoadedKey(null);
    setData(DEFAULT_APP_DATA);
    setLocalUpdatedAt(0);
    const hydrate = async () => {
      try {
        let stored = await AsyncStorage.getItem(storageKey);
        if (!stored && !openId) {
          const legacyGuest = await AsyncStorage.getItem(LEGACY_GUEST_STORAGE_KEY);
          if (legacyGuest) {
            const parsed = parseStored(legacyGuest);
            stored = serialize(mergeAppData(DEFAULT_APP_DATA, parsed.payload), parsed.updatedAt);
            await AsyncStorage.setItem(GUEST_STORAGE_KEY, stored);
            await AsyncStorage.removeItem(LEGACY_GUEST_STORAGE_KEY);
          }
        }
        if (alive && stored) {
          const parsed = parseStored(stored);
          const next = mergeAppData(DEFAULT_APP_DATA, parsed.payload);
          setData(next);
          setLocalUpdatedAt(parsed.updatedAt);
        }
      } catch {
        // Keep safe defaults if local storage is unavailable or corrupt.
      } finally {
        if (alive) { setLoadedKey(storageKey); setReady(true); }
      }
    };
    void hydrate();
    return () => { alive = false; };
  }, [storageKey, openId]);

  useEffect(() => {
    if (!openId || !isAuthenticated || !ready || loadedKey !== storageKey) return;
    let alive = true;
    const sync = async () => {
      try {
        const result = await remote.refetch();
        if (!alive || result.error) return;
        const cloud = result.data;
        if (cloud?.payload) {
          const cloudTimestamp = cloud.updatedAt ? Date.parse(cloud.updatedAt) : 0;
          const localTimestamp = localUpdatedAtRef.current;
          if (localTimestamp > cloudTimestamp) {
            const local = dataRef.current;
            const saved = await saveRemote.mutateAsync({ payload: local as unknown as Record<string, unknown> });
            const timestamp = Date.parse(saved.updatedAt) || Date.now();
            setLocalUpdatedAt(timestamp);
            await AsyncStorage.setItem(storageKey, serialize(local, timestamp));
          } else {
            const next = mergeAppData(DEFAULT_APP_DATA, cloud.payload as Partial<AppData>);
            setData(next);
            const timestamp = cloudTimestamp || Date.now();
            setLocalUpdatedAt(timestamp);
            await AsyncStorage.setItem(storageKey, serialize(next, timestamp));
          }
        } else if (localUpdatedAtRef.current > 0) {
          // Only account-scoped local data may seed a missing cloud workspace.
          const local = dataRef.current;
          const saved = await saveRemote.mutateAsync({ payload: local as unknown as Record<string, unknown> });
          const timestamp = Date.parse(saved.updatedAt) || Date.now();
          setLocalUpdatedAt(timestamp);
          await AsyncStorage.setItem(storageKey, serialize(local, timestamp));
        }
      } catch {
        // Retain the account-scoped local copy and retry on the next edit/session.
      }
    };
    void sync();
    return () => { alive = false; };
    // The refs provide the latest local state without refetching on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, isAuthenticated, ready, loadedKey, storageKey]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, [storageKey]);

  const update = useCallback(async (patch: Partial<AppData>) => {
    const next = mergeAppData(dataRef.current, patch);
    const timestamp = Date.now();
    dataRef.current = next;
    localUpdatedAtRef.current = timestamp;
    setData(next);
    setLocalUpdatedAt(timestamp);
    broadcast(storageKey, next, timestamp, listenerRef.current);
    await AsyncStorage.setItem(storageKey, serialize(next, timestamp));
    if (openId) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void saveRemote.mutateAsync({ payload: next as unknown as Record<string, unknown> }).then(async (saved) => {
          const savedAt = Date.parse(saved.updatedAt) || Date.now();
          localUpdatedAtRef.current = savedAt;
          setLocalUpdatedAt(savedAt);
          await AsyncStorage.setItem(storageKey, serialize(next, savedAt));
        }).catch(() => undefined);
      }, 650);
    }
    return next;
  }, [openId, storageKey, saveRemote]);

  const getLatestData = useCallback(async (localOverride: AppData = dataRef.current) => {
    if (!openId) return localOverride;
    const result = await remote.refetch();
    if (result.error) throw result.error;
    return result.data?.payload
      ? mergeAppData(mergeAppData(DEFAULT_APP_DATA, result.data.payload as Partial<AppData>), localOverride)
      : localOverride;
  }, [openId, remote]);

  const importGuestDraft = useCallback(async () => {
    if (!openId) throw new Error("Entre na sua conta antes de importar o rascunho.");
    const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return false;
    const guest = parseStored(raw);
    const next = mergeAppData(dataRef.current, guest.payload);
    const timestamp = Date.now();
    await AsyncStorage.setItem(storageKey, serialize(next, timestamp));
    const saved = await saveRemote.mutateAsync({ payload: next as unknown as Record<string, unknown> });
    const savedAt = Date.parse(saved.updatedAt) || timestamp;
    await AsyncStorage.setItem(storageKey, serialize(next, savedAt));
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
    dataRef.current = next;
    localUpdatedAtRef.current = savedAt;
    setData(next);
    setLocalUpdatedAt(savedAt);
    return true;
  }, [openId, storageKey, saveRemote]);

  return { data, ready, update, getLatestData, importGuestDraft, isAuthenticated, syncing: saveRemote.isPending };
}
