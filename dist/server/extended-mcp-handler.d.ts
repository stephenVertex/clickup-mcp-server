interface MCPRequest {
    jsonrpc: string;
    method: string;
    params?: any;
    id?: number | string;
}
interface MCPResponse {
    jsonrpc: string;
    id?: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}
/**
 * Extended MCP Handler with full CRUD support for ClickUp entities
 */
export declare class ExtendedMCPHandler {
    private token;
    constructor(token: string);
    handleRequest(request: MCPRequest): Promise<MCPResponse>;
    private handleInitialize;
    private handleToolsList;
    private handleToolCall;
    private getUser;
    private getWorkspaces;
    private getSpaces;
    private getListsInSpace;
    private createList;
    private getList;
    private updateList;
    private deleteList;
    private createTask;
    private getTask;
    private getTasks;
    private updateTask;
    private deleteTask;
    private createFolder;
    private getFolder;
    private updateFolder;
    private deleteFolder;
    private createTaskComment;
    private getTaskComments;
    private handlePing;
}
export {};
//# sourceMappingURL=extended-mcp-handler.d.ts.map