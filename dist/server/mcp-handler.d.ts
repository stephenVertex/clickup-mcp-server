/**
 * Simplified MCP Handler for OAuth2 authenticated requests
 */
export interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}
export interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export declare class MCPHandler {
    private token;
    constructor(token: string);
    handleRequest(request: MCPRequest): Promise<MCPResponse>;
    private handleInitialize;
    private handleToolsList;
    private handleToolCall;
    private getUser;
    private getWorkspaces;
    private getTasks;
    private createTask;
    private handlePing;
}
//# sourceMappingURL=mcp-handler.d.ts.map