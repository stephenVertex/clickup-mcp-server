# ClickUp MCP Server

A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.

## Quick Start

Directions for use with Cursor Composer Agent:

1. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL
2. Go to Features in settings
3. Add under MCP Servers:
```bash
npx -y @taazkareem/clickup-mcp-server --env CLICKUP_API_KEY=your_api_key_here --env TEAM_ID=your_team_id_here
```
4. Replace the credentials and click Save
5. Use Natural Language to interact with your ClickUp Workspace!

## Features

- 🎯 **Task Management**
  - Create, update, and delete tasks
  - Move and duplicate tasks between lists, spaces, and folders 
  - Bulk task operations
  - Task details

- 📂 **Workspace Organization**
  - Hierarchical tree structure with clear relationships
  - Efficient navigation with path tracking
  - List and folder management in spaces
  - Smart caching to reduce API calls
  - Name/ID-based item lookup
  - Optimized task organization

- 🔄 **Smart Integration**
  - Case-insensitive name lookups
  - Markdown support
  - Automatic rate limiting
  - Error handling

- 🤖 **AI Assistance**
  - Task analysis and insights
  - Status summaries and priorities
  - Description assistance
  - Relationship mapping

## Available Tools

1. **get_workspace_hierarchy**
   - Gets complete hierarchy of spaces, folders, and lists
   - No parameters required
   - Returns tree structure showing:
     ```
     Workspace (root)
     ├── Space A
     │   ├── List 1
     │   └── Folder 1
     │       ├── List 2
     │       └── List 3
     └── Space B
         └── List 4
     ```

2. **get_tasks**
   - Gets tasks from a ClickUp list with optional filters
   - List Identification (required):
     ```
     listId: "123"      # List ID from ClickUp
     -- OR --
     listName: "My List" # List name (case insensitive)
     ```
   - Optional Filters:
     ```
     archived: true/false        # Include archived tasks
     page: number               # Page number for pagination
     order_by: string          # Field to sort by
     reverse: true/false       # Reverse sort order
     subtasks: true/false      # Include subtasks
     statuses: ["status1",..] # Filter by status
     include_closed: true/false # Include closed tasks
     assignees: ["user1",..]   # Filter by assignee
     due_date_gt: timestamp    # Due after date
     due_date_lt: timestamp    # Due before date
     custom_fields: {...}      # Filter by custom fields
     ```

3. **get_task**
   - Gets detailed information about a specific task
   - Task Identification (required):
     ```
     taskId: "123"       # Task ID from ClickUp
     -- OR --
     taskName: "My Task" # Task name (case insensitive)
     ```
   - Optional:
     ```
     listName: "My List" # Narrow search to specific list
     ```
   - Returns full task details including attachments and custom fields

4. **create_task**
   - Creates a new task in ClickUp
   - List Identification (required):
     ```
     listId: "123"      # List ID from ClickUp
     -- OR --
     listName: "My List" # List name (case insensitive)
     ```
   - Task Details:
     ```
     # Required
     taskName: "New Task"  # Name of the task to create

     # Optional
     description: "..."    # Task description (markdown supported)
     status: "In Progress" # Task status
     priority: 1-4        # Priority level (1=Urgent, 4=Low)
     dueDate: timestamp   # Due date
     ```

5. **create_bulk_tasks**
   - Creates multiple tasks in a list
   - List Identification (required):
     ```
     listId: "123"      # List ID from ClickUp
     -- OR --
     listName: "My List" # List name (case insensitive)
     ```
   - Tasks Array (required):
     ```
     tasks: [
       {
         taskName: "Task 1",    # Required
         description: "...",    # Optional
         status: "In Progress", # Optional
         priority: 1-4,        # Optional
         dueDate: timestamp    # Optional
       },
       // ... more tasks
     ]
     ```
   - Handles rate limiting automatically

6. **update_task**
   - Updates an existing task
   - Task Identification (required):
     ```
     taskId: "123"       # Task ID from ClickUp
     -- OR --
     taskName: "My Task" # Task name (case insensitive)
     ```
   - Optional Updates:
     ```
     listName: "My List"     # Narrow search to specific list
     newName: "Updated Task" # New task name
     description: "..."      # New description
     status: "Done"         # New status
     priority: 1-4          # New priority
     dueDate: timestamp     # New due date
     ```

7. **delete_task**
   - Permanently deletes a task
   - Task Identification (required):
     ```
     taskId: "123"       # Task ID from ClickUp
     -- OR --
     taskName: "My Task" # Task name (case insensitive)
     ```
   - Optional:
     ```
     listName: "My List" # Narrow search to specific list
     ```

8. **move_task**
   - Moves a task to a different list
   - Source Task (required):
     ```
     taskId: "123"       # Task ID from ClickUp
     -- OR --
     taskName: "My Task" # Task name (case insensitive)
     ```
   - Destination List (required):
     ```
     destinationListId: "456"      # Target list ID
     -- OR --
     destinationListName: "My List" # Target list name
     ```
   - Optional:
     ```
     sourceListName: "Old List" # Narrow task search to specific list
     ```

9. **duplicate_task**
   - Creates a copy of a task in specified list
   - Source Task (required):
     ```
     taskId: "123"       # Task ID from ClickUp
     -- OR --
     taskName: "My Task" # Task name (case insensitive)
     ```
   - Destination List (required):
     ```
     destinationListId: "456"      # Target list ID
     -- OR --
     destinationListName: "My List" # Target list name
     ```
   - Optional:
     ```
     sourceListName: "Current List" # Narrow task search to specific list
     ```

10. **create_list**
    - Creates a new list in a space
    - Space Identification (required):
      ```
      spaceId: "123"       # Space ID from ClickUp
      -- OR --
      spaceName: "My Space" # Space name (case insensitive)
      ```
    - List Details:
      ```
      # Required
      listName: "New List" # Name for the new list

      # Optional
      content: "..."      # List description
      dueDate: timestamp  # List due date
      priority: 1-4       # List priority
      assignee: "user_id" # Assign to user
      ```

11. **create_folder**
    - Creates a new folder in a space
    - Space Identification (required):
      ```
      spaceId: "123"       # Space ID from ClickUp
      -- OR --
      spaceName: "My Space" # Space name (case insensitive)
      ```
    - Folder Details:
      ```
      # Required
      folderName: "New Folder" # Name for the new folder

      # Optional
      overrideStatuses: true/false # Override space statuses
      ```

12. **create_list_in_folder**
    - Creates a new list within a folder
    - Folder Identification (required):
      ```
      folderId: "123"        # Folder ID from ClickUp
      -- OR --
      folderName: "My Folder" # Folder name (case insensitive)
      ```
    - List Details:
      ```
      # Required
      listName: "New List" # Name for the new list

      # Optional
      content: "..."      # List description
      status: "Active"    # Initial list status
      ```

## Available Prompts

1. **summarize_tasks**
   - Basic task summary by status
   - Lists tasks with their current states
   - Shows task relationships within lists

2. **analyze_priorities**
   - Reviews current task priorities
   - Suggests priority adjustments
   - Recommends task sequencing

3. **generate_description**
   - Interactive prompt for creating task descriptions
   - Helps structure task information
   - Includes objectives, criteria, and dependencies

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors
- Rate limiting

## Support the Developer

If you find this project useful, please consider supporting the developer:
Talib Kareem (taazkareem@icloud.com)

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Support-orange)](https://www.buymeacoffee.com/taazkareem)

<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M4 18h12l4-4h-12z" /><path d="M8 14l-4-4h12l4 4" /><path d="M16 10l4-4h-12l-4 4" /></svg><span style="vertical-align: middle;">**Solana Wallet:** `GjtRksihd7SWQw7hJSCDMcTxPHbgpNs7xPW3nFubNjVM`</span>

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

