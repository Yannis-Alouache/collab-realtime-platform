import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("call.html contains required mode selector and disabled call button", () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), "public", "call.html"), "utf8");
  assert.equal(html.includes('id="callMode"'), true);
  assert.equal(html.includes('value=""'), true);
  assert.equal(html.includes('id="callBtn" disabled'), true);
});
