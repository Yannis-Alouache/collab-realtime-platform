import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("call start handler does not rethrow caught errors", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "public", "js", "call.js"), "utf8");
  assert.equal(source.includes("throw error;"), false);
});

