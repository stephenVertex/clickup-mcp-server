import axios, { AxiosInstance } from 'axios';
import { 
  ClickUpTask, 
  ClickUpList, 
  ClickUpSpace,
  ClickUpFolder,
  CreateTaskData,
  UpdateTaskData,
  CreateListData,
  CreateFolderData,
  WorkspaceNode,
  WorkspaceTree,
  MoveTaskData,
  TaskPriority
} from '../types/clickup.js';

/**
 * Service class for interacting with the ClickUp API.
 * Handles all API requests and data transformations.
 */
export class ClickUpService {
  private client: AxiosInstance;
  private static instance: ClickUpService;
  private clickupTeamId: string;
  private rateLimitRemaining: number = 100; // Default to lowest tier limit
  private rateLimitReset: number = 0;

  private constructor(apiKey: string, clickupTeamId: string) {
    this.client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        // Update rate limit info from headers
        this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '100');
        this.rateLimitReset = parseInt(response.headers['x-ratelimit-reset'] || '0');
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] || '0');
          const waitTime = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
          
          console.warn(`Rate limit exceeded. Waiting ${waitTime} seconds before retrying...`);
          
          // Wait until rate limit resets
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          
          // Retry the request
          return this.client.request(error.config);
        }
        throw error;
      }
    );

    this.clickupTeamId = clickupTeamId;
  }

  /**
   * Checks if we're close to hitting rate limits and waits if necessary.
   * @private
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 5) { // Buffer of 5 requests
      const now = Math.floor(Date.now() / 1000);
      const waitTime = Math.max(0, this.rateLimitReset - now);
      if (waitTime > 0) {
        console.warn(`Approaching rate limit. Waiting ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }

  /**
   * Makes an API request with rate limit handling.
   * @private
   * @param requestFn - Function that makes the actual API request
   * @returns The API response
   */
  private async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    await this.checkRateLimit();
    try {
      return await requestFn();
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Let the interceptor handle it
        throw error;
      }
      throw error;
    }
  }

  /**
   * Initializes the ClickUpService singleton instance.
   * @param apiKey - The ClickUp API key for authentication
   * @param clickupTeamId - The team/workspace ID to operate on
   * @returns The singleton instance of ClickUpService
   * @throws Error if initialization fails
   */
  public static initialize(apiKey: string, clickupTeamId: string): ClickUpService {
    if (!ClickUpService.instance) {
      ClickUpService.instance = new ClickUpService(apiKey, clickupTeamId);
    }
    return ClickUpService.instance;
  }

  /**
   * Gets the singleton instance of ClickUpService.
   * @returns The singleton instance of ClickUpService
   * @throws Error if service hasn't been initialized
   */
  public static getInstance(): ClickUpService {
    if (!ClickUpService.instance) {
      throw new Error('ClickUpService not initialized. Call initialize() first.');
    }
    return ClickUpService.instance;
  }

  // Tasks
  /**
   * Retrieves tasks from a specific list with optional filtering.
   * Handles rate limiting automatically.
   * @param listId - The ID of the list to fetch tasks from
   * @param filters - Optional filters to apply to the task query
   * @param filters.archived - Include archived tasks
   * @param filters.page - Page number for pagination
   * @param filters.order_by - Field to order tasks by
   * @param filters.reverse - Reverse the order of tasks
   * @param filters.subtasks - Include subtasks
   * @param filters.statuses - Filter by specific statuses
   * @param filters.include_closed - Include closed tasks
   * @param filters.assignees - Filter by assignee IDs
   * @param filters.due_date_gt - Tasks due after this timestamp
   * @param filters.due_date_lt - Tasks due before this timestamp
   * @param filters.date_created_gt - Tasks created after this timestamp
   * @param filters.date_created_lt - Tasks created before this timestamp
   * @param filters.date_updated_gt - Tasks updated after this timestamp
   * @param filters.date_updated_lt - Tasks updated before this timestamp
   * @param filters.custom_fields - Filter by custom field values
   * @returns Object containing tasks array and available statuses
   * @throws Error if the API request fails
   */
  async getTasks(listId: string, filters?: {
    archived?: boolean;
    page?: number;
    order_by?: string;
    reverse?: boolean;
    subtasks?: boolean;
    statuses?: string[];
    include_closed?: boolean;
    assignees?: string[];
    due_date_gt?: number;
    due_date_lt?: number;
    date_created_gt?: number;
    date_created_lt?: number;
    date_updated_gt?: number;
    date_updated_lt?: number;
    custom_fields?: Record<string, any>;
  }): Promise<{ tasks: ClickUpTask[]; statuses: string[] }> {
    return this.makeRequest(async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.archived !== undefined) params.append('archived', filters.archived.toString());
        if (filters.page !== undefined) params.append('page', filters.page.toString());
        if (filters.order_by) params.append('order_by', filters.order_by);
        if (filters.reverse !== undefined) params.append('reverse', filters.reverse.toString());
        if (filters.subtasks !== undefined) params.append('subtasks', filters.subtasks.toString());
        if (filters.statuses) params.append('statuses[]', filters.statuses.join(','));
        if (filters.include_closed !== undefined) params.append('include_closed', filters.include_closed.toString());
        if (filters.assignees) params.append('assignees[]', filters.assignees.join(','));
        if (filters.due_date_gt) params.append('due_date_gt', filters.due_date_gt.toString());
        if (filters.due_date_lt) params.append('due_date_lt', filters.due_date_lt.toString());
        if (filters.date_created_gt) params.append('date_created_gt', filters.date_created_gt.toString());
        if (filters.date_created_lt) params.append('date_created_lt', filters.date_created_lt.toString());
        if (filters.date_updated_gt) params.append('date_updated_gt', filters.date_updated_gt.toString());
        if (filters.date_updated_lt) params.append('date_updated_lt', filters.date_updated_lt.toString());
        if (filters.custom_fields) {
          Object.entries(filters.custom_fields).forEach(([key, value]) => {
            params.append(`custom_fields[${key}]`, JSON.stringify(value));
          });
        }
      }

      const queryString = params.toString();
      const url = `/list/${listId}/task${queryString ? `?${queryString}` : ''}`;
      const response = await this.client.get(url);
      const tasks = response.data.tasks;
      const statuses = [...new Set(tasks
        .filter((task: ClickUpTask) => task.status !== undefined)
        .map((task: ClickUpTask) => task.status!.status))] as string[];
      return { tasks, statuses };
    });
  }

  /**
   * Retrieves detailed information about a specific task.
   * Handles rate limiting automatically.
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/task/${taskId}`);
      return response.data;
    });
  }

  /**
   * Creates a new task in a specified list.
   * Handles rate limiting automatically.
   */
  async createTask(listId: string, data: CreateTaskData): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      const taskData = { ...data };
      
      if (taskData.description && /[#*`\-\[\]>]/.test(taskData.description)) {
        taskData.markdown_description = taskData.description;
        delete taskData.description;
      }

      const response = await this.client.post(`/list/${listId}/task`, taskData);
      return response.data;
    });
  }

  /**
   * Creates multiple tasks in a list sequentially to avoid rate limits.
   * Automatically handles rate limiting and retries.
   */
  async createBulkTasks(listId: string, data: { tasks: CreateTaskData[] }): Promise<ClickUpTask[]> {
    const createdTasks: ClickUpTask[] = [];
    
    for (const taskData of data.tasks) {
      await this.makeRequest(async () => {
        const processedTask = { ...taskData };
        if (processedTask.description && /[#*`\-\[\]>]/.test(processedTask.description)) {
          processedTask.markdown_description = processedTask.description;
          delete processedTask.description;
        }
        
        const response = await this.client.post(`/list/${listId}/task`, processedTask);
        createdTasks.push(response.data);
      });
    }
    
    return createdTasks;
  }

  /**
   * Updates an existing task with new data.
   * Handles rate limiting automatically.
   */
  async updateTask(taskId: string, data: UpdateTaskData): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      const response = await this.client.put(`/task/${taskId}`, data);
      return response.data;
    });
  }

  /**
   * Deletes a task from the workspace.
   * Handles rate limiting automatically.
   */
  async deleteTask(taskId: string): Promise<void> {
    return this.makeRequest(async () => {
      await this.client.delete(`/task/${taskId}`);
    });
  }

  // Lists
  /**
   * Gets all lists in a space.
   * @param spaceId - ID of the space to get lists from
   * @returns Promise resolving to array of ClickUpList objects
   * @throws Error if the API request fails
   */
  async getLists(spaceId: string): Promise<ClickUpList[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/space/${spaceId}/list`);
      return response.data.lists;
    });
  }

  /**
   * Gets all lists in the workspace.
   * @param clickupTeamId - ID of the team/workspace
   * @returns Promise resolving to array of ClickUpList objects
   * @throws Error if the API request fails
   */
  async getAllLists(clickupTeamId: string): Promise<ClickUpList[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/team/${clickupTeamId}/list`);
      return response.data.lists;
    });
  }

  /**
   * Gets a specific list by ID.
   * @param listId - ID of the list to retrieve
   * @returns Promise resolving to ClickUpList object
   * @throws Error if the API request fails or list not found
   */
  async getList(listId: string): Promise<ClickUpList> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/list/${listId}`);
      return response.data;
    });
  }

  // Spaces
  async getSpaces(clickupTeamId: string): Promise<ClickUpSpace[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/team/${clickupTeamId}/space`);
      return response.data.spaces;
    });
  }

  async getSpace(spaceId: string): Promise<ClickUpSpace> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/space/${spaceId}`);
      return response.data;
    });
  }

  async findSpaceByName(clickupTeamId: string, spaceName: string): Promise<ClickUpSpace | null> {
    const spaces = await this.getSpaces(clickupTeamId);
    return spaces.find(space => space.name.toLowerCase() === spaceName.toLowerCase()) || null;
  }

  /**
   * Creates a new list in a space.
   * @param spaceId - ID of the space to create the list in
   * @param data - List creation data (name, content, due date, etc.)
   * @returns Promise resolving to the created ClickUpList
   * @throws Error if the API request fails
   */
  async createList(spaceId: string, data: CreateListData): Promise<ClickUpList> {
    return this.makeRequest(async () => {
      const response = await this.client.post(`/space/${spaceId}/list`, data);
      return response.data;
    });
  }

  // Folders
  async getFolders(spaceId: string): Promise<ClickUpFolder[]> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/space/${spaceId}/folder`);
      return response.data.folders;
    });
  }

  async getFolder(folderId: string): Promise<ClickUpFolder> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/folder/${folderId}`);
      return response.data;
    });
  }

  async createFolder(spaceId: string, data: CreateFolderData): Promise<ClickUpFolder> {
    return this.makeRequest(async () => {
      const response = await this.client.post(`/space/${spaceId}/folder`, data);
      return response.data;
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    return this.makeRequest(async () => {
      await this.client.delete(`/folder/${folderId}`);
    });
  }

  /**
   * Creates a new list in a folder.
   * @param folderId - ID of the folder to create the list in
   * @param data - List creation data (name, content, etc.)
   * @returns Promise resolving to the created ClickUpList
   * @throws Error if the API request fails
   */
  async createListInFolder(folderId: string, data: CreateListData): Promise<ClickUpList> {
    return this.makeRequest(async () => {
      const response = await this.client.post(`/folder/${folderId}/list`, data);
      return response.data;
    });
  }

  async findFolderByName(spaceId: string, folderName: string): Promise<ClickUpFolder | null> {
    const folders = await this.getFolders(spaceId);
    return folders.find(folder => folder.name.toLowerCase() === folderName.toLowerCase()) || null;
  }

  // Additional helper methods
  /**
   * Moves a task to a different list.
   * Since direct task moving is not supported by the ClickUp API,
   * this creates a new task in the target list and deletes the original.
   * 
   * @param taskId - ID of the task to move
   * @param listId - ID of the destination list
   * @returns Promise resolving to the new task in its new location
   * @throws Error if the API request fails
   */
  async moveTask(taskId: string, listId: string): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      // Get the current task to copy all its data
      const currentTask = await this.getTask(taskId);
      
      // Get available statuses in the target list
      const { statuses: targetStatuses } = await this.getTasks(listId);
      
      // Check if current status exists in target list
      const currentStatus = currentTask.status?.status;
      const statusExists = currentStatus && targetStatuses.includes(currentStatus);

      // Prepare the task data for the new location
      const moveData: MoveTaskData = {
        name: currentTask.name,
        description: currentTask.description,
        markdown_description: currentTask.description, // In case it contains markdown
        status: statusExists ? currentStatus : undefined, // Only set status if it exists in target list
        priority: currentTask.priority ? (parseInt(currentTask.priority.id) as TaskPriority) : undefined,
        due_date: currentTask.due_date ? parseInt(currentTask.due_date) : undefined,
        start_date: currentTask.start_date ? parseInt(currentTask.start_date) : undefined,
        assignees: currentTask.assignees?.map(a => a.id)
      };

      // Create a new task in the target list with the same data
      const newTask = await this.createTask(listId, moveData);

      // Delete the original task
      await this.deleteTask(taskId);

      // Return the new task
      return newTask;
    });
  }

  /**
   * Duplicates a task to another list.
   * Creates a new task with the same data in the target list.
   * 
   * @param taskId - ID of the task to duplicate
   * @param listId - ID of the destination list
   * @returns Promise resolving to the new duplicate task
   * @throws Error if the API request fails
   */
  async duplicateTask(taskId: string, listId: string): Promise<ClickUpTask> {
    return this.makeRequest(async () => {
      // Get the current task to copy all its data
      const currentTask = await this.getTask(taskId);
      
      // Get available statuses in the target list
      const { statuses: targetStatuses } = await this.getTasks(listId);
      
      // Check if current status exists in target list
      const currentStatus = currentTask.status?.status;
      const statusExists = currentStatus && targetStatuses.includes(currentStatus);

      // Prepare the task data for duplication
      const taskData: CreateTaskData = {
        name: currentTask.name,
        description: currentTask.description,
        markdown_description: currentTask.description, // In case it contains markdown
        status: statusExists ? currentStatus : undefined, // Only set status if it exists in target list
        priority: currentTask.priority ? (parseInt(currentTask.priority.id) as TaskPriority) : undefined,
        due_date: currentTask.due_date ? parseInt(currentTask.due_date) : undefined,
        start_date: currentTask.start_date ? parseInt(currentTask.start_date) : undefined,
        assignees: currentTask.assignees?.map(a => a.id)
      };

      // Create a new task in the target list with the same data
      const newTask = await this.createTask(listId, taskData);

      // Return the new task
      return newTask;
    });
  }

  /**
   * Deletes a list.
   * @param listId - ID of the list to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if the API request fails
   */
  async deleteList(listId: string): Promise<void> {
    return this.makeRequest(async () => {
      await this.client.delete(`/list/${listId}`);
    });
  }

  /**
   * Updates an existing list.
   * @param listId - ID of the list to update
   * @param data - Partial list data to update
   * @returns Promise resolving to the updated ClickUpList
   * @throws Error if the API request fails
   */
  async updateList(listId: string, data: Partial<CreateListData>): Promise<ClickUpList> {
    return this.makeRequest(async () => {
      const response = await this.client.put(`/list/${listId}`, data);
      return response.data;
    });
  }

  /**
   * Finds a list by name in a specific space.
   * Performs case-insensitive matching.
   * @param spaceId - ID of the space to search in
   * @param listName - Name of the list to find
   * @returns Promise resolving to ClickUpList object or null if not found
   */
  async findListByName(spaceId: string, listName: string): Promise<ClickUpList | null> {
    const lists = await this.getLists(spaceId);
    return lists.find(list => list.name.toLowerCase() === listName.toLowerCase()) || null;
  }

  async findListByNameGlobally(listName: string): Promise<ClickUpList | null> {
    // First try the direct lists
    const lists = await this.getAllLists(this.clickupTeamId);
    const directList = lists.find(list => list.name.toLowerCase() === listName.toLowerCase());
    if (directList) return directList;

    // If not found, search through folders
    const hierarchy = await this.getWorkspaceHierarchy();
    return this.findListByNameInHierarchy(hierarchy, listName);
  }

  /**
   * Gets the complete workspace hierarchy as a tree structure.
   * The tree consists of:
   * - Root (Workspace)
   *   - Spaces
   *     - Lists (directly in space)
   *     - Folders
   *       - Lists (in folders)
   * 
   * Each node in the tree contains:
   * - id: Unique identifier
   * - name: Display name
   * - type: 'space' | 'folder' | 'list'
   * - parent: Reference to parent node (except root)
   * - children: Array of child nodes
   * - data: Original ClickUp object data
   * 
   * @returns Promise resolving to the complete workspace tree
   * @throws Error if API requests fail
   */
  async getWorkspaceHierarchy(): Promise<WorkspaceTree> {
    const spaces = await this.getSpaces(this.clickupTeamId);
    const root: WorkspaceTree['root'] = {
      id: this.clickupTeamId,
      name: 'Workspace',
      type: 'workspace',
      children: []
    };

    // Build the tree
    for (const space of spaces) {
      const spaceNode: WorkspaceNode = {
        id: space.id,
        name: space.name,
        type: 'space',
        children: [],
        data: space
      };
      root.children.push(spaceNode);

      // Add lists directly in the space
      const spaceLists = await this.getLists(space.id);
      for (const list of spaceLists) {
        const listNode: WorkspaceNode = {
          id: list.id,
          name: list.name,
          type: 'list',
          parent: spaceNode,
          children: [],
          data: list
        };
        spaceNode.children.push(listNode);
      }

      // Add folders and their lists
      const folders = await this.getFolders(space.id);
      for (const folder of folders) {
        const folderNode: WorkspaceNode = {
          id: folder.id,
          name: folder.name,
          type: 'folder',
          parent: spaceNode,
          children: [],
          data: folder
        };
        spaceNode.children.push(folderNode);

        // Add lists in the folder
        const folderLists = folder.lists || [];
        for (const list of folderLists) {
          const listNode: WorkspaceNode = {
            id: list.id,
            name: list.name,
            type: 'list',
            parent: folderNode,
            children: [],
            data: list
          };
          folderNode.children.push(listNode);
        }
      }
    }

    return { root };
  }

  /**
   * Helper method to find a node in the workspace tree by name and type.
   * Performs a case-insensitive search through the tree structure.
   * 
   * @private
   * @param node - The root node to start searching from
   * @param name - The name to search for (case-insensitive)
   * @param type - The type of node to find ('space', 'folder', or 'list')
   * @returns Object containing:
   *          - node: The found WorkspaceNode
   *          - path: Full path to the node (e.g., "Space > Folder > List")
   *          Or null if no matching node is found
   */
  private findNodeInTree(
    node: WorkspaceNode | WorkspaceTree['root'],
    name: string,
    type: 'space' | 'folder' | 'list'
  ): { node: WorkspaceNode; path: string } | null {
    // Check current node if it's a WorkspaceNode
    if ('type' in node && node.type === type && node.name.toLowerCase() === name.toLowerCase()) {
      return {
        node,
        path: node.name
      };
    }

    // Search children
    for (const child of node.children) {
      const result = this.findNodeInTree(child, name, type);
      if (result) {
        const path = node.type === 'workspace' ? result.path : `${node.name} > ${result.path}`;
        return { node: result.node, path };
      }
    }

    return null;
  }

  /**
   * Finds a node by name and type in the workspace hierarchy.
   * This is a high-level method that uses findNodeInTree internally.
   * 
   * @param hierarchy - The workspace tree to search in
   * @param name - Name of the space/folder/list to find (case-insensitive)
   * @param type - Type of node to find ('space', 'folder', or 'list')
   * @returns Object containing:
   *          - id: The ID of the found node
   *          - path: Full path to the node
   *          Or null if no matching node is found
   */
  findIDByNameInHierarchy(
    hierarchy: WorkspaceTree,
    name: string,
    type: 'space' | 'folder' | 'list'
  ): { id: string; path: string } | null {
    const result = this.findNodeInTree(hierarchy.root, name, type);
    if (!result) return null;
    return { id: result.node.id, path: result.path };
  }

  /**
   * Retrieves all tasks from the entire workspace using the tree structure.
   * Traverses the workspace hierarchy tree and collects tasks from all lists.
   * Uses recursive traversal to handle nested folders and lists efficiently.
   * 
   * The process:
   * 1. Gets the workspace hierarchy tree
   * 2. Recursively processes each node:
   *    - If it's a list node, fetches and collects its tasks
   *    - If it has children, processes them recursively
   * 3. Returns all collected tasks
   * 
   * @returns Promise resolving to array of all tasks in the workspace
   * @throws Error if API requests fail
   */
  async getAllTasksInWorkspace(): Promise<ClickUpTask[]> {
    const hierarchy = await this.getWorkspaceHierarchy();
    const allTasks: ClickUpTask[] = [];

    // Helper function to process a node
    const processNode = async (node: WorkspaceNode) => {
      if (node.type === 'list') {
        const { tasks } = await this.getTasks(node.id);
        allTasks.push(...tasks);
      }
      // Process children recursively
      for (const child of node.children) {
        await processNode(child);
      }
    };

    // Process all spaces
    for (const space of hierarchy.root.children) {
      await processNode(space);
    }

    return allTasks;
  }

  /**
   * Finds a list by name in the workspace hierarchy.
   * This is a specialized version of findNodeInTree for lists.
   * 
   * @param hierarchy - The workspace tree to search in
   * @param listName - Name of the list to find (case-insensitive)
   * @returns The found ClickUpList object or null if not found
   */
  findListByNameInHierarchy(hierarchy: WorkspaceTree, listName: string): ClickUpList | null {
    const result = this.findNodeInTree(hierarchy.root, listName, 'list');
    if (!result) return null;
    return result.node.data as ClickUpList;
  }

  /**
   * Helper method to find a space ID by name.
   * Uses the tree structure for efficient lookup.
   * 
   * @param spaceName - Name of the space to find (case-insensitive)
   * @returns Promise resolving to the space ID or null if not found
   */
  async findSpaceIDByName(spaceName: string): Promise<string | null> {
    const hierarchy = await this.getWorkspaceHierarchy();
    const result = this.findIDByNameInHierarchy(hierarchy, spaceName, 'space');
    return result?.id || null;
  }

  /**
   * Helper method to find a folder ID and its path by name.
   * Uses the tree structure for efficient lookup.
   * 
   * @param folderName - Name of the folder to find (case-insensitive)
   * @returns Promise resolving to object containing:
   *          - id: The folder ID
   *          - spacePath: Full path including the parent space
   *          Or null if not found
   */
  async findFolderIDByName(folderName: string): Promise<{ id: string; spacePath: string } | null> {
    const hierarchy = await this.getWorkspaceHierarchy();
    const result = this.findNodeInTree(hierarchy.root, folderName, 'folder');
    return result ? { id: result.node.id, spacePath: result.path } : null;
  }

  /**
   * Helper method to find a list ID and its path by name.
   * Uses the tree structure for efficient lookup.
   * 
   * @param listName - Name of the list to find (case-insensitive)
   * @returns Promise resolving to object containing:
   *          - id: The list ID
   *          - path: Full path including parent space and folder (if any)
   *          Or null if not found
   */
  async findListIDByName(listName: string): Promise<{ id: string; path: string } | null> {
    const hierarchy = await this.getWorkspaceHierarchy();
    const result = this.findNodeInTree(hierarchy.root, listName, 'list');
    return result ? { id: result.node.id, path: result.path } : null;
  }

  /**
   * Helper method to find a task by name, optionally within a specific list.
   * Uses case-insensitive matching and returns full path information.
   * 
   * @param taskName - Name of the task to find (case-insensitive)
   * @param listId - Optional: ID of the list to search in
   * @param listName - Optional: Name of the list to search in (alternative to listId)
   * @returns Promise resolving to object containing:
   *          - id: The task ID
   *          - path: Full path including space, folder (if any), list, and task name
   *          Or null if not found
   */
  async findTaskByName(
    taskName: string,
    listId?: string,
    listName?: string
  ): Promise<{ id: string; path: string } | null> {
    // If listName is provided, get the listId first
    if (!listId && listName) {
      const result = await this.findListIDByName(listName);
    if (!result) return null;
      listId = result.id;
    }

    // Get tasks from specific list or all tasks
    const tasks = listId 
      ? (await this.getTasks(listId)).tasks
      : await this.getAllTasksInWorkspace();

    // Find matching task (case-insensitive)
    const task = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
    if (!task) return null;

    // Get the full path
    const path = task.folder?.name 
      ? `${task.space.name} > ${task.folder.name} > ${task.list.name} > ${task.name}`
      : `${task.space.name} > ${task.list.name} > ${task.name}`;

    return { id: task.id, path };
  }

  async getTaskStatuses(listId: string): Promise<string[]> {
    const response = await this.getTasks(listId);
    const statuses = [...new Set(response.tasks
      .filter((task: ClickUpTask) => task.status !== undefined)
      .map((task: ClickUpTask) => task.status!.status))] as string[];
    return statuses;
  }
} 
