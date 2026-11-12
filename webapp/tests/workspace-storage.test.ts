import { describe, expect, it } from "vitest";
import { GUEST_STORAGE_KEY, workspaceStorageKey } from "../shared/workspace-storage";

describe("workspaceStorageKey", () => {
  it("separates guest drafts from authenticated workspaces", () => {
    expect(workspaceStorageKey()).toBe(GUEST_STORAGE_KEY);
    expect(workspaceStorageKey("user/one")).not.toBe(GUEST_STORAGE_KEY);
  });
  it("never shares a local storage namespace between two accounts", () => {
    expect(workspaceStorageKey("open-id-a")).not.toBe(workspaceStorageKey("open-id-b"));
  });
  it("encodes identity before using it as a storage key segment", () => {
    expect(workspaceStorageKey("user/one")).toContain("user%2Fone");
  });
});
