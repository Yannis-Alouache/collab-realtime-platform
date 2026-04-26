export const config = {
  port: Number(process.env.PORT ?? 3000),
  metricsIntervalMs: 2000,
  cpuAlertThreshold: 90,
  ramAlertThreshold: 90
};

