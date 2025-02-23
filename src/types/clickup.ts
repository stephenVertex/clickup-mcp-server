/**
 * Type for task priority levels
 */
export type TaskPriority = 1 | 2 | 3 | 4;

/**
 * Type for custom field configuration
 */
export interface CustomFieldConfig {
  default?: any;
  options?: Array<{
    id: string;
    name: string;
    color?: string;
    orderindex: number;
  }>;
}

/**
 * Type for custom field value
 */
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'dropdown' | 'date' | 'checkbox' | 'number' | 'currency' | 'email' | 'url' | 'location';
  type_config: CustomFieldConfig;
  date_created: string;
  hide_from_guests: boolean;
  value: any;
  required: boolean;
}

/**
 * Interface for task filter options
 */
export interface TaskFilters {
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
}

/**
 * Represents a task in ClickUp with all its properties.
 */
export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status?: {
    status: string;
    color: string;
    type: string;
    orderindex: number;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  creator: {
    id: number;
    username: string;
    color: string;
    email: string;
    profilePicture: string | null;
  };
  assignees: Array<{
    id: number;
    username: string;
    color: string;
    initials: string;
    email: string;
    profilePicture: string | null;
  }>;
  checklists: Array<{
    id: string;
    name: string;
    orderindex: number;
    items: Array<{
      id: string;
      name: string;
      orderindex: number;
      assignee: string | null;
      resolved: boolean;
      parent: string | null;
      date_created: string;
      children: any[];
    }>;
  }>;
  tags: Array<{
    name: string;
    tag_bg: string;
    tag_fg: string;
  }>;
  parent: string | null;
  priority: {
    id: string;
    priority: TaskPriority;
    color: string;
    orderindex: string;
  } | null;
  due_date: string | null;
  start_date: string | null;
  points: number | null;
  time_estimate: number | null;
  custom_fields: CustomField[];
  dependencies: Array<{
    task_id: string;
    depends_on: string;
    type: number;
  }>;
  linked_tasks: Array<{
    task_id: string;
    link_id: string;
    date_created: string;
    userid: string;
  }>;
  team_id: string;
  url: string;
  permission_level: string;
  list: {
    id: string;
    name: string;
    access: boolean;
  };
  project: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  } | null;
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  attachments: Array<{
    id: string;
    version: number;
    date: string;
    title: string;
    extension: string;
    thumbnail_small: string;
    thumbnail_large: string;
    url: string;
  }>;
}

/**
 * Represents a list in ClickUp that can contain tasks.
 * Lists can exist directly in a space or within a folder.
 */
export interface ClickUpList {
  /** Unique identifier for the list */
  id: string;
  /** Display name of the list */
  name: string;
  /** Description or content of the list */
  content: string;
  /** Parent space information */
  space: {
    id: string;
    name: string;
  };
  /** Current status configuration */
  status: {
    status: string;
    color: string;
  };
}

/**
 * Represents a space in ClickUp that can contain lists and folders.
 * Spaces are the top-level organizational units within a workspace.
 */
export interface ClickUpSpace {
  /** Unique identifier for the space */
  id: string;
  /** Display name of the space */
  name: string;
  /** Whether the space is private */
  private: boolean;
  /** Available status options for tasks in this space */
  statuses: Array<{
    id: string;
    status: string;
    color: string;
  }>;
}

/**
 * Data structure for creating a new task.
 */
export interface CreateTaskData {
  name: string;
  /**
   * Plain text description. If the text contains markdown characters (#, *, `, -, [], >),
   * it will automatically be treated as markdown and moved to markdown_description.
   */
  description?: string;
  /**
   * Markdown formatted description. If not provided but description contains markdown characters,
   * it will be automatically populated from description.
   */
  markdown_description?: string;
  priority?: TaskPriority;
  due_date?: number;
  start_date?: number;
  assignees?: number[];
  status?: string;
  custom_fields?: Record<string, any>;
}

/**
 * Data structure for bulk creating multiple tasks.
 * Handles rate limiting automatically.
 */
export interface BulkCreateTasksData {
  /** Array of tasks to create */
  tasks: Array<CreateTaskData>;
}

/**
 * Data structure for creating a new list.
 * Lists can be created either directly in a space or within a folder.
 */
export interface CreateListData {
  /** Name of the new list */
  name: string;
  /** Description or content for the list */
  content?: string;
  /** Due date for the entire list (Unix timestamp) */
  due_date?: number;
  /** Priority level for the list (1-4) */
  priority?: TaskPriority;
  /** User ID to assign the list to */
  assignee?: number;
  /** Initial status for the list */
  status?: string;
}

/**
 * Data structure for updating an existing task.
 * Allows partial updates of any task properties.
 * Only specified fields will be updated.
 */
export interface UpdateTaskData extends Partial<CreateTaskData> {}

/**
 * Represents a folder in ClickUp that can contain lists.
 */
export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
  lists: ClickUpList[];
}

/**
 * Data structure for creating a new folder.
 */
export interface CreateFolderData {
  name: string;
  override_statuses?: boolean;
}

/**
 * Represents a node in the workspace hierarchy tree.
 * Each node has common properties and can contain children.
 * 
 * The tree structure follows these rules:
 * 1. Spaces can contain lists and folders
 * 2. Folders can only contain lists
 * 3. Lists are always leaf nodes (no children)
 * 
 * Parent references allow traversal up the tree, while children
 * allow traversal down. The type field identifies the node's role
 * in the hierarchy.
 */
export interface WorkspaceNode {
  /** Unique identifier from ClickUp */
  id: string;
  /** Display name of the node */
  name: string;
  /** Type of the node, determines its role and valid children */
  type: 'space' | 'folder' | 'list';
  /** Reference to parent node, undefined for top-level spaces */
  parent?: WorkspaceNode;
  /** Array of child nodes, empty for lists */
  children: WorkspaceNode[];
  /** Original ClickUp object data based on type */
  data: ClickUpSpace | ClickUpFolder | ClickUpList;
}

/**
 * Represents the complete workspace hierarchy as a tree.
 * The root node represents the workspace itself and contains
 * all spaces as its children.
 * 
 * Example structure:
 * ```
 * Workspace (root)
 * ├── Space A
 * │   ├── List 1
 * │   └── Folder 1
 * │       ├── List 2
 * │       └── List 3
 * └── Space B
 *     └── List 4
 * ```
 */
export interface WorkspaceTree {
  root: {
    /** Workspace/Team ID from ClickUp */
    id: string;
    /** Workspace name */
    name: string;
    /** Always 'workspace' to identify the root */
    type: 'workspace';
    /** Array of all spaces in the workspace */
    children: WorkspaceNode[];
  };
}

/**
 * Data structure for moving a task to a different list.
 * Preserves task data while changing its location.
 */
export interface MoveTaskData {
  /** Name of the task (preserved from original) */
  name: string;
  /** Plain text description */
  description?: string;
  /** Markdown formatted description */
  markdown_description?: string;
  /** Status (if available in target list) */
  status?: string;
  /** Priority level (1-4) */
  priority?: TaskPriority;
  /** Due date (Unix timestamp) */
  due_date?: number;
  /** Start date (Unix timestamp) */
  start_date?: number;
  /** Array of user IDs to keep assigned */
  assignees?: number[];
} 