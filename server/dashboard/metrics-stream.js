// Builds the SSE metrics stream and periodic metric simulation loop used by the dashboard.
export function createMetricsStream({ insertMetric, config }) {
  const metricsClients = new Set();

  // Pushes one synthetic metric sample to DB and all connected SSE clients.
  function simulateMetric() {
    const cpu = Math.floor(20 + Math.random() * 75);
    const ram = Math.floor(25 + Math.random() * 70);
    const payload = { cpu, ram, ts: new Date().toISOString() };
    insertMetric(cpu, ram);
    for (const res of metricsClients) {
      res.write(`event: metrics\ndata: ${JSON.stringify(payload)}\n\n`);
      if (cpu >= config.cpuAlertThreshold || ram >= config.ramAlertThreshold) {
        res.write(
          `event: threshold-alert\ndata: ${JSON.stringify({ cpu, ram, cpuThreshold: config.cpuAlertThreshold, ramThreshold: config.ramAlertThreshold })}\n\n`
        );
      }
    }
  }

  // Registers the SSE route used by the dashboard client.
  function registerDashboardStreamRoute(app) {
    app.get("/api/dashboard/stream", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      metricsClients.add(res);
      req.on("close", () => metricsClients.delete(res));
    });
  }

  // Starts the periodic metrics simulation that feeds dashboard SSE clients.
  function startMetricSimulation() {
    setInterval(simulateMetric, config.metricsIntervalMs);
  }

  return { registerDashboardStreamRoute, startMetricSimulation };
}

