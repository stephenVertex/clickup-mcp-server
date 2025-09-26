/**
 * ClickUp API client service
 */
export interface ClickUpUser {
    id: number;
    username: string;
    email: string;
    color: string;
}
export interface ClickUpWorkspace {
    id: string;
    name: string;
    color: string;
    avatar: string | null;
    members: ClickUpUser[];
}
export interface ClickUpTask {
    id: string;
    custom_id: string | null;
    name: string;
    text_content: string;
    description: string;
    status: {
        status: string;
        color: string;
        type: string;
    };
    orderindex: string;
    date_created: string;
    date_updated: string;
    date_closed: string | null;
    archived: boolean;
    creator: ClickUpUser;
    assignees: ClickUpUser[];
    watchers: ClickUpUser[];
    priority: any;
    due_date: string | null;
    start_date: string | null;
    time_estimate: number | null;
    time_spent: number;
}
export declare class ClickUpAPI {
    private api;
    constructor(accessToken: string);
    /**
     * Get authorized user information
     */
    getUser(): Promise<ClickUpUser>;
    /**
     * Get authorized teams (workspaces)
     */
    getWorkspaces(): Promise<ClickUpWorkspace[]>;
    /**
     * Get spaces in a workspace
     */
    getSpaces(workspaceId: string): Promise<any[]>;
    /**
     * Get folders in a space
     */
    getFolders(spaceId: string): Promise<any[]>;
    /**
     * Get lists in a folder
     */
    getFolderLists(folderId: string): Promise<any[]>;
    /**
     * Get folderless lists in a space
     */
    getFolderlessLists(spaceId: string): Promise<any[]>;
    /**
     * Get tasks in a list
     */
    getTasks(listId: string): Promise<ClickUpTask[]>;
    /**
     * Get a single task
     */
    getTask(taskId: string): Promise<ClickUpTask>;
    /**
     * Create a new task
     */
    createTask(listId: string, task: Partial<ClickUpTask>): Promise<ClickUpTask>;
    /**
     * Update a task
     */
    updateTask(taskId: string, updates: Partial<ClickUpTask>): Promise<ClickUpTask>;
    /**
     * Delete a task
     */
    deleteTask(taskId: string): Promise<void>;
}
export default ClickUpAPI;
//# sourceMappingURL=clickup-api.d.ts.map