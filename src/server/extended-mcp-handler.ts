import { logger } from '../logger.js';

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
export class ExtendedMCPHandler {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      logger.info({ method: request.method }, 'Handling MCP request');

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
    } catch (error) {
      logger.error({ error, method: request.method }, 'MCP handler error');
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      };
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
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
          name: 'clickup-mcp-oauth-extended',
          version: '1.0.0'
        }
      }
    };
  }

  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: [
          // User & Workspace Management
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
            name: 'clickup_get_spaces',
            description: 'Get spaces in a ClickUp workspace',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_id: {
                  type: 'string',
                  description: 'The ID of the workspace'
                }
              },
              required: ['workspace_id']
            }
          },
          {
            name: 'clickup_get_lists_in_space',
            description: 'Get all lists in a ClickUp space',
            inputSchema: {
              type: 'object',
              properties: {
                space_id: {
                  type: 'string',
                  description: 'The ID of the space to get lists from'
                }
              },
              required: ['space_id']
            }
          },

          // List Management (CRUD)
          {
            name: 'clickup_create_list',
            description: 'Create a new list in a ClickUp space',
            inputSchema: {
              type: 'object',
              properties: {
                space_id: {
                  type: 'string',
                  description: 'The ID of the space to create the list in'
                },
                name: {
                  type: 'string',
                  description: 'The name of the list'
                },
                content: {
                  type: 'string',
                  description: 'The description of the list'
                }
              },
              required: ['space_id', 'name']
            }
          },
          {
            name: 'clickup_get_list',
            description: 'Get a ClickUp list by ID',
            inputSchema: {
              type: 'object',
              properties: {
                list_id: {
                  type: 'string',
                  description: 'The ID of the list to retrieve'
                }
              },
              required: ['list_id']
            }
          },
          {
            name: 'clickup_update_list',
            description: 'Update a ClickUp list',
            inputSchema: {
              type: 'object',
              properties: {
                list_id: {
                  type: 'string',
                  description: 'The ID of the list to update'
                },
                name: {
                  type: 'string',
                  description: 'The new name of the list'
                },
                content: {
                  type: 'string',
                  description: 'The new description of the list'
                }
              },
              required: ['list_id']
            }
          },
          {
            name: 'clickup_delete_list',
            description: 'Delete a ClickUp list',
            inputSchema: {
              type: 'object',
              properties: {
                list_id: {
                  type: 'string',
                  description: 'The ID of the list to delete'
                }
              },
              required: ['list_id']
            }
          },

          // Task Management (CRUD)
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
                },
                status: {
                  type: 'string',
                  description: 'The status of the task'
                }
              },
              required: ['list_id', 'name']
            }
          },
          {
            name: 'clickup_get_task',
            description: 'Get a ClickUp task by ID',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: {
                  type: 'string',
                  description: 'The ID of the task to retrieve'
                }
              },
              required: ['task_id']
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
            name: 'clickup_update_task',
            description: 'Update a ClickUp task',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: {
                  type: 'string',
                  description: 'The ID of the task to update'
                },
                name: {
                  type: 'string',
                  description: 'The new name of the task'
                },
                description: {
                  type: 'string',
                  description: 'The new description of the task'
                },
                status: {
                  type: 'string',
                  description: 'The new status of the task'
                }
              },
              required: ['task_id']
            }
          },
          {
            name: 'clickup_delete_task',
            description: 'Delete a ClickUp task',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: {
                  type: 'string',
                  description: 'The ID of the task to delete'
                }
              },
              required: ['task_id']
            }
          },

          // Folder Management (CRUD)
          {
            name: 'clickup_create_folder',
            description: 'Create a new folder in a ClickUp space',
            inputSchema: {
              type: 'object',
              properties: {
                space_id: {
                  type: 'string',
                  description: 'The ID of the space to create the folder in'
                },
                name: {
                  type: 'string',
                  description: 'The name of the folder'
                }
              },
              required: ['space_id', 'name']
            }
          },
          {
            name: 'clickup_get_folder',
            description: 'Get a ClickUp folder by ID',
            inputSchema: {
              type: 'object',
              properties: {
                folder_id: {
                  type: 'string',
                  description: 'The ID of the folder to retrieve'
                }
              },
              required: ['folder_id']
            }
          },
          {
            name: 'clickup_update_folder',
            description: 'Update a ClickUp folder',
            inputSchema: {
              type: 'object',
              properties: {
                folder_id: {
                  type: 'string',
                  description: 'The ID of the folder to update'
                },
                name: {
                  type: 'string',
                  description: 'The new name of the folder'
                }
              },
              required: ['folder_id']
            }
          },
          {
            name: 'clickup_delete_folder',
            description: 'Delete a ClickUp folder',
            inputSchema: {
              type: 'object',
              properties: {
                folder_id: {
                  type: 'string',
                  description: 'The ID of the folder to delete'
                }
              },
              required: ['folder_id']
            }
          },

          // Comments
          {
            name: 'clickup_create_task_comment',
            description: 'Create a comment on a ClickUp task',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: {
                  type: 'string',
                  description: 'The ID of the task'
                },
                comment_text: {
                  type: 'string',
                  description: 'The comment text'
                }
              },
              required: ['task_id', 'comment_text']
            }
          },
          {
            name: 'clickup_get_task_comments',
            description: 'Get comments for a ClickUp task',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: {
                  type: 'string',
                  description: 'The ID of the task'
                }
              },
              required: ['task_id']
            }
          }
        ]
      }
    };
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    const { name: tool, arguments: args } = request.params;

    logger.info({ tool, args }, 'Tool call requested');

    try {
      let result;

      switch (tool) {
        // User & Workspace
        case 'clickup_get_user':
          result = await this.getUser();
          break;
        case 'clickup_get_workspaces':
          result = await this.getWorkspaces();
          break;
        case 'clickup_get_spaces':
          result = await this.getSpaces(args.workspace_id);
          break;
        case 'clickup_get_lists_in_space':
          result = await this.getListsInSpace(args.space_id);
          break;

        // List CRUD
        case 'clickup_create_list':
          result = await this.createList(args.space_id, args.name, args.content);
          break;
        case 'clickup_get_list':
          result = await this.getList(args.list_id);
          break;
        case 'clickup_update_list':
          result = await this.updateList(args.list_id, args.name, args.content);
          break;
        case 'clickup_delete_list':
          result = await this.deleteList(args.list_id);
          break;

        // Task CRUD
        case 'clickup_create_task':
          result = await this.createTask(args.list_id, args.name, args.description, args.status);
          break;
        case 'clickup_get_task':
          result = await this.getTask(args.task_id);
          break;
        case 'clickup_get_tasks':
          result = await this.getTasks(args.list_id);
          break;
        case 'clickup_update_task':
          result = await this.updateTask(args.task_id, args.name, args.description, args.status);
          break;
        case 'clickup_delete_task':
          result = await this.deleteTask(args.task_id);
          break;

        // Folder CRUD
        case 'clickup_create_folder':
          result = await this.createFolder(args.space_id, args.name);
          break;
        case 'clickup_get_folder':
          result = await this.getFolder(args.folder_id);
          break;
        case 'clickup_update_folder':
          result = await this.updateFolder(args.folder_id, args.name);
          break;
        case 'clickup_delete_folder':
          result = await this.deleteFolder(args.folder_id);
          break;

        // Comments
        case 'clickup_create_task_comment':
          result = await this.createTaskComment(args.task_id, args.comment_text);
          break;
        case 'clickup_get_task_comments':
          result = await this.getTaskComments(args.task_id);
          break;

        default:
          throw new Error(`Unknown tool: ${tool}`);
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
    } catch (error) {
      logger.error({ tool, error }, 'Tool execution error');
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

  // User & Workspace methods
  private async getUser() {
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

  private async getWorkspaces() {
    const response = await fetch('https://api.clickup.com/api/v2/team', {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getSpaces(workspaceId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/team/${workspaceId}/space`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getListsInSpace(spaceId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });
    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }
    return await response.json();
  }

  // List CRUD methods
  private async createList(spaceId: string, name: string, content?: string) {
    const body: any = { name };
    if (content) body.content = content;

    const response = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, {
      method: 'POST',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getList(listId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async updateList(listId: string, name?: string, content?: string) {
    const body: any = {};
    if (name) body.name = name;
    if (content) body.content = content;

    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async deleteList(listId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return { success: true, message: `List ${listId} deleted successfully` };
  }

  // Task CRUD methods
  private async createTask(listId: string, name: string, description?: string, status?: string) {
    const body: any = { name };
    if (description) body.description = description;
    // Note: status should not be set during task creation, only during updates

    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText, body, listId }, 'ClickUp API create task error');
      throw new Error(`ClickUp API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private async getTask(taskId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getTasks(listId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async updateTask(taskId: string, name?: string, description?: string, status?: string) {
    const body: any = {};
    if (name) body.name = name;
    if (description) body.description = description;
    if (status) body.status = status;

    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async deleteTask(taskId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return { success: true, message: `Task ${taskId} deleted successfully` };
  }

  // Folder CRUD methods
  private async createFolder(spaceId: string, name: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, {
      method: 'POST',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getFolder(folderId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async updateFolder(folderId: string, name: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async deleteFolder(folderId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/folder/${folderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return { success: true, message: `Folder ${folderId} deleted successfully` };
  }

  // Comment methods
  private async createTaskComment(taskId: string, commentText: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment_text: commentText })
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private async getTaskComments(taskId: string) {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
      headers: {
        'Authorization': this.token.startsWith('Bearer ') ? this.token : this.token
      }
    });

    if (!response.ok) {
      throw new Error(`ClickUp API error: ${response.status}`);
    }

    return await response.json();
  }

  private handlePing(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {}
    };
  }
}