const labels = [];
const cpuData = [];
const ramData = [];

const chart = new Chart(document.getElementById("metricsChart"), {
  type: "line",
  data: {
    labels,
    datasets: [
      { label: "CPU %", data: cpuData, borderColor: "#22d3ee" },
      { label: "RAM %", data: ramData, borderColor: "#f59e0b" }
    ]
  },
  options: { responsive: true, animation: false, scales: { y: { min: 0, max: 100 } } }
});

const alertBox = document.getElementById("alertBox");
alertBox.textContent = "En attente des métriques...";

const sse = new EventSource("/api/dashboard/stream");
sse.addEventListener("metrics", (event) => {
  const metric = JSON.parse(event.data);
  labels.push(new Date(metric.ts).toLocaleTimeString());
  cpuData.push(metric.cpu);
  ramData.push(metric.ram);
  if (labels.length > 20) {
    labels.shift();
    cpuData.shift();
    ramData.shift();
  }
  chart.update();
});

sse.addEventListener("threshold-alert", (event) => {
  const data = JSON.parse(event.data);
  alertBox.className = "alert alert-high";
  alertBox.textContent = `Alerte: CPU ${data.cpu}% / RAM ${data.ram}%`;
});

