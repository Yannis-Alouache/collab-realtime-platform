import test from "node:test";
import assert from "node:assert/strict";
import { createMetricsStream } from "../server/dashboard/metrics-stream.js";

test("metrics stream exposes stop and clears interval", () => {
  let setCalls = 0;
  let clearCalls = 0;
  const timers = new Set();

  const stream = createMetricsStream({
    insertMetric() {},
    config: { cpuAlertThreshold: 90, ramAlertThreshold: 90, metricsIntervalMs: 1000 },
    setIntervalFn(fn, ms) {
      setCalls += 1;
      const id = { fn, ms, id: setCalls };
      timers.add(id);
      return id;
    },
    clearIntervalFn(id) {
      clearCalls += 1;
      timers.delete(id);
    }
  });

  stream.startMetricSimulation();
  stream.stopMetricSimulation();

  assert.equal(setCalls, 1);
  assert.equal(clearCalls, 1);
  assert.equal(timers.size, 0);
});

