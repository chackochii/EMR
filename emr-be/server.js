import http from 'node:http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSocket } from './sockets/socket.js';

const SHUTDOWN_TIMEOUT_MS = 10000;

await connectDB();

const server = http.createServer(createApp());
const io = initSocket(server);

server.listen(env.PORT, () => logger.info(`EMR API listening on port ${env.PORT} (${env.NODE_ENV})`));

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  try {
    await io.close(); // also closes the underlying http server
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));
