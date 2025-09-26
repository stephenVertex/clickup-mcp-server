/**
 * Simplified MCP Handler for OAuth2 authenticated requests
 */
import { logger } from '../logger.js';
export class MCPHandler {
    token;
    constructor(token) {
        this.token = token;
    }
    async handleRequest(request) {
        logger.info({ method: request.method }, 'Handling MCP request');
        try {
            switch (request.method) {
                case 'initialize':
                    return this.handleInitialize(request);
                case 'tools/list':
                    return this.handleToolsList(request);
                case 'tools/call':
                    return this.handleToolCall(request);
                case 'ping':
                    return this.handlePing(request);
                default:
                    return {
                        jsonrpc: '2.0',
                        id: request.id,
                        error: {
                            code: -32601,
                            message: 'Method not found'
                        }
                    };
            }
        }
        catch (error) {
            logger.error({ error, method: request.method }, 'MCP handler error');
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: -32603,
                    message: 'Internal error',
                    data: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
    handleInitialize(request) {
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                protocolVersion: '2025-06-18',
                capabilities: {
                    tools: {
                        listChanged: true
                    }
                },
                serverInfo: {
                    name: 'clickup-mcp-oauth',
                    version: '1.0.0'
                }
            }
        };
    }
    handleToolsList(request) {
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                tools: [
                    {
                        name: 'clickup_get_user',
                        description: 'Get current ClickUp user information',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: 'clickup_get_workspaces',
                        description: 'Get list of ClickUp workspaces',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: 'clickup_get_tasks',
                        description: 'Get tasks from a ClickUp list',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                list_id: {
                                    type: 'string',
                                    description: 'The ID of the list to get tasks from'
                                }
                            },
                            required: ['list_id']
                        }
                    },
                    {
                        name: 'clickup_create_task',
                        description: 'Create a new task in ClickUp',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                list_id: {
                                    type: 'string',
                                    description: 'The ID of the list to create the task in'
                                },
                                name: {
                                    type: 'string',
                                    description: 'The name of the task'
                                },
                                description: {
                                    type: 'string',
                                    description: 'The description of the task'
                                }
                            },
                            required: ['list_id', 'name']
                        }
                    }
                ]
            }
        };
    }
    async handleToolCall(request) {
        const { name, arguments: args } = request.params;
        logger.info({ tool: name, args }, 'Tool call requested');
        try {
            let result;
            switch (name) {
                case 'clickup_get_user':
                    result = await this.getUser();
                    break;
                case 'clickup_get_workspaces':
                    result = await this.getWorkspaces();
                    break;
                case 'clickup_get_tasks':
                    result = await this.getTasks(args.list_id);
                    break;
                case 'clickup_create_task':
                    result = await this.createTask(args.list_id, args.name, args.description);
                    break;
                default:
                    return {
                        jsonrpc: '2.0',
                        id: request.id,
                        error: {
                            code: -32602,
                            message: `Unknown tool: ${name}`
                        }
                    };
            }
            return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                }
            };
        }
        catch (error) {
            logger.error({ error, tool: name }, 'Tool execution error');
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: -32603,
                    message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            };
        }
    }
    async getUser() {
        const response = await fetch('https://api.clickup.com/api/v2/user', {
            headers: {
                'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
            }
        });
        if (!response.ok) {
            throw new Error(`ClickUp API error: ${response.status}`);
        }
        return await response.json();
    }
    async getWorkspaces() {
        const response = await fetch('https://api.clickup.com/api/v2/team', {
            headers: {
                'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
            }
        });
        if (!response.ok) {
            throw new Error(`ClickUp API error: ${response.status}`);
        }
        const data = await response.json();
        return data.teams;
    }
    async getTasks(listId) {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            headers: {
                'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
            }
        });
        if (!response.ok) {
            throw new Error(`ClickUp API error: ${response.status}`);
        }
        const data = await response.json();
        return data.tasks;
    }
    async createTask(listId, name, description) {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
            method: 'POST',
            headers: {
                'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description: description || ''
            })
        });
        if (!response.ok) {
            throw new Error(`ClickUp API error: ${response.status}`);
        }
        return await response.json();
    }
    handlePing(request) {
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {}
        };
    }
}
//# sourceMappingURL=mcp-handler.js.map