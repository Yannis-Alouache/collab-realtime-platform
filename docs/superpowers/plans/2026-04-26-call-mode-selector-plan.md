# Call Mode Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un sélecteur explicite de mode d’appel (audio seul / audio+vidéo) et empêcher le lancement d’appel sans sélection.

**Architecture:** Le frontend `call.html` expose un sélecteur de mode avec état initial invalide. `call.js` active/désactive le bouton et transmet le mode à `media.js`. `media.js` applique des contraintes WebRTC selon ce mode, avec fallback audio en mode audio+vidéo.

**Tech Stack:** HTML, JavaScript ES modules, WebRTC `getUserMedia`, Node test runner.

---

### Task 1: Ajouter l’UI de sélection obligatoire du mode

**Files:**
- Modify: `public/call.html`
- Test: `tests/call-mode-ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/call-mode-ui.test.js`  
Expected: FAIL because selector/disabled state are missing.

- [ ] **Step 3: Write minimal implementation**

```html
<select id="callMode">
  <option value="">Choisir un mode...</option>
  <option value="audio-only">Audio seul</option>
  <option value="audio-video">Audio + Vidéo</option>
</select>
<button id="callBtn" disabled>Appeler</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/call-mode-ui.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/call.html tests/call-mode-ui.test.js
git commit -m "feat: require explicit call mode selection before dialing"
```

---

### Task 2: Propager le mode dans le démarrage d’appel

**Files:**
- Modify: `public/js/call.js`
- Test: `tests/call-mode-script.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("call.js blocks call when mode is empty and reads callMode value", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "public", "js", "call.js"), "utf8");
  assert.equal(source.includes('document.getElementById("callMode")'), true);
  assert.equal(source.includes("if (!selectedMode)"), true);
  assert.equal(source.includes("await ensureMedia(selectedMode)"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/call-mode-script.test.js`  
Expected: FAIL because mode selection flow is absent.

- [ ] **Step 3: Write minimal implementation**

```js
const modeSelect = document.getElementById("callMode");
const callBtn = document.getElementById("callBtn");

modeSelect.addEventListener("change", () => {
  callBtn.disabled = !modeSelect.value;
});

async function startCall() {
  const selectedMode = modeSelect.value;
  if (!selectedMode) return alert("Choisis un mode d'appel.");
  await ensureMedia(selectedMode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/call-mode-script.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/call.js tests/call-mode-script.test.js
git commit -m "feat: gate call start by explicit mode selection"
```

---

### Task 3: Adapter acquisition média au mode choisi

**Files:**
- Modify: `public/js/media.js`
- Modify: `tests/media.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("acquireUserMediaForMode uses strict audio-only constraints", async () => {
  const calls = [];
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      return { getTracks: () => [] };
    }
  };
  await acquireUserMediaForMode(mediaDevices, "audio-only");
  assert.deepEqual(calls, [{ audio: true, video: false }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/media.test.js`  
Expected: FAIL because mode-based API does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export async function acquireUserMediaForMode(mediaDevices, mode) {
  if (mode === "audio-only") {
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
  try {
    return await mediaDevices.getUserMedia({ audio: true, video: true });
  } catch {
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/media.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/media.js public/js/call.js tests/media.test.js
git commit -m "feat: support explicit audio-only and audio-video call modes"
```

---

### Task 4: Vérification finale

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

```js
// Manual acceptance scenario:
// call button remains disabled until mode selected.
// audio-only call starts without camera requirement.
```

- [ ] **Step 2: Run verification and observe mismatch**

Run: `npm test`  
Expected: PASS on all automated tests; then perform manual UI scenario.

- [ ] **Step 3: Write minimal implementation**

```md
## Appel WebRTC
- Choix obligatoire du mode: Audio seul ou Audio + Vidéo.
- Le bouton Appeler est désactivé tant qu'aucun mode n'est sélectionné.
```

- [ ] **Step 4: Run verification again**

Run: `npm test`  
Expected: PASS and manual scenario validated.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document required call mode selection behavior"
```

---

## Spec coverage check

- Sélection explicite obligatoire avant appel: **Task 1 + Task 2**
- Option audio seul / audio+vidéo: **Task 1 + Task 3**
- Fallback mode audio pour audio+vidéo: **Task 3**
- Pas de crash non géré: **Task 2 + Task 3**

