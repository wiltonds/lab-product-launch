const STORAGE_ROOT = "lab-do-meu-negocio:data:v1";
export const LEGACY_GUEST_STORAGE_KEY = STORAGE_ROOT;
export const GUEST_STORAGE_KEY = `${STORAGE_ROOT}:guest`;
export function workspaceStorageKey(openId?: string | null) {
  return openId ? `${STORAGE_ROOT}:account:${encodeURIComponent(openId)}` : GUEST_STORAGE_KEY;
}
