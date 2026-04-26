# Alert Threshold Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réduire la fréquence des alertes dashboard en relevant les seuils CPU/RAM à 90%.

**Architecture:** Le changement est purement configuratif dans le backend. Le flux SSE existant (`metrics` et `threshold-alert`) reste inchangé, mais ses conditions de déclenchement sont durcies.

**Tech Stack:** Node.js, Express, SSE.

---

### Task 1: Relever les seuils d’alerte dashboard

**Files:**
- Modify: `server/config.js`
- Test: `manual check with dashboard stream`

- [ ] **Step 1: Write the failing test**

```js
// Vérification manuelle ciblée: la config actuelle est trop sensible
import { config } from "./server/config.js";
console.assert(config.cpuAlertThreshold === 90, "cpuAlertThreshold should be 90");
console.assert(config.ramAlertThreshold === 90, "ramAlertThreshold should be 90");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node -e "import('./server/config.js').then(({config})=>{console.log(config)})"`  
Expected: FAIL fonctionnel (valeurs observées à 80).

- [ ] **Step 3: Write minimal implementation**

```js
// server/config.js
export const config = {
  port: Number(process.env.PORT ?? 3000),
  metricsIntervalMs: 2000,
  cpuAlertThreshold: 90,
  ramAlertThreshold: 90
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node -e "import('./server/config.js').then(({config})=>{console.log(config.cpuAlertThreshold, config.ramAlertThreshold)})"`  
Expected: PASS fonctionnel (90 90).

- [ ] **Step 5: Commit**

```bash
git add server/config.js docs/superpowers/specs/2026-04-26-alert-threshold-tuning-design.md docs/superpowers/plans/2026-04-26-alert-threshold-tuning-plan.md
git commit -m "chore: raise dashboard alert thresholds to 90"
```

---

## Spec coverage check

- Objectif: réduire alertes trop précoces -> **Task 1**
- Périmètre: changement config uniquement -> **Task 1**
- Seuils ciblés 90/90 -> **Task 1**

