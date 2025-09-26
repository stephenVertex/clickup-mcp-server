#!/usr/bin/env node
/**
 * ClickUp MCP OAuth2 Server
 * Entry point
 */
import { ClickUpMCPServer } from './server/mcp-server.js';
import { logger } from './logger.js';
async function main() {
    try {
        const server = new ClickUpMCPServer();
        await server.start();
    }
    catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    process.exit(1);
});
process.on('unhandledRejection', (error) => {
    logger.error({ error }, 'Unhandled rejection');
    process.exit(1);
});
main();
//# sourceMappingURL=index.js.map