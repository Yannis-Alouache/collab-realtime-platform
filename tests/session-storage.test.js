import test from "node:test";
import assert from "node:assert/strict";
import { getPseudoFromStorage, savePseudoToStorage } from "../public/js/session.js";

function createStorageMock() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    }
  };
}

test("session helper stores and reads pseudo using key userPseudo", () => {
  const storage = createStorageMock();
  savePseudoToStorage(storage, "alice");
  assert.equal(getPseudoFromStorage(storage), "alice");
});

test("session helper returns empty string when no pseudo exists", () => {
  const storage = createStorageMock();
  assert.equal(getPseudoFromStorage(storage), "");
});

