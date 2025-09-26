/**
 * MCP Server implementation with OAuth2
 */
export declare class ClickUpMCPServer {
    private app;
    private mcpServer;
    private oauth2Service;
    private sessions;
    private transports;
    constructor();
    /**
     * Setup Express middleware
     */
    private setupMiddleware;
    /**
     * Setup routes
     */
    private setupRoutes;
    /**
     * Register MCP tools
     */
    private registerTools;
    /**
     * Start the server
     */
    start(): Promise<void>;
}
export default ClickUpMCPServer;
//# sourceMappingURL=mcp-server.d.ts.map