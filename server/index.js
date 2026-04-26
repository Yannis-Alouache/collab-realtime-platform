import http from "node:http";
import { config } from "./config.js";
import { attachSocket, createApp } from "./app.js";

const app = createApp();
const server = http.createServer(app);
attachSocket(server);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});

