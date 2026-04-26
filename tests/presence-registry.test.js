import test from "node:test";
import assert from "node:assert/strict";
import { createPresenceRegistry } from "../server/modules/presence-registry.js";

test("presence registry keeps user online while at least one socket remains", () => {
  const registry = createPresenceRegistry();

  registry.connect("alice", "socket-a1");
  registry.connect("alice", "socket-a2");
  assert.equal(registry.isOnline("alice"), true);

  registry.disconnect("alice", "socket-a1");
  assert.equal(registry.isOnline("alice"), true);

  registry.disconnect("alice", "socket-a2");
  assert.equal(registry.isOnline("alice"), false);
});

