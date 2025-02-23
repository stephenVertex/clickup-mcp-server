# ClickUp MCP Server

A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.

## Quick Start (Recommended)

1. Install the server:
```bash
npm install -g @taazkareem/clickup-mcp-server
```

2. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL

3. Start the server:
```bash
clickup-mcp-server --env CLICKUP_API_KEY=your_api_key_here --env TEAM_ID=your_team_id_here
```

> **Security Note**: Your API key will be stored securely and not exposed to AI models.

## Using with Cursor AI Composer

1. Go to Features in settings
2. Add under MCP Servers:
```bash
clickup-mcp-server --env CLICKUP_API_KEY=your_api_key_here --env TEAM_ID=your_team_id_here
```
3. Replace the credentials and click Save

## Alternative Installation
Run directly without installing:
```bash
npx @taazkareem/clickup-mcp-server --env CLICKUP_API_KEY=your_api_key_here --env TEAM_ID=your_team_id_here
```

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
   - Gets complete hierarchy of spaces, folders, and lists as a tree structure
   - Provides full paths to all items
   - Shows parent-child relationships
   - No parameters required
   - Example response structure:
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
   - Required: Either `listId` or `listName`
   - Optional filters for:
     - Archived and closed tasks
     - Status and priority
     - Due dates and creation dates
     - Assignees and custom fields

3. **get_task**
   - Gets detailed information about a specific task
   - Required: `taskId`

4. **create_task**
   - Creates a new task in ClickUp
   - Required: Either `listId` or `listName`, `name`
   - Optional: Description, status, priority, due date

5. **create_bulk_tasks**
   - Creates multiple tasks in a list
   - Required: Either `listId` or `listName`, array of tasks
   - Handles rate limiting automatically

6. **update_task**
   - Updates an existing task
   - Required: `taskId`
   - Optional: Name, description, status, priority, due date

7. **delete_task**
   - Deletes a task from workspace
   - Required: `taskId`

8. **move_task**
   - Moves a task to a different list
   - Required: `taskId`, either `listId` or `listName`

9. **duplicate_task**
   - Creates a copy of a task in specified list
   - Required: `taskId`, either `listId` or `listName`

10. **create_list**
    - Creates a new list in a space
    - Required: `name`, either `spaceId` or `spaceName`
    - Optional: Content, due date, priority, assignee

11. **create_folder**
    - Creates a new folder in a space
    - Required: `name`, either `spaceId` or `spaceName`
    - Optional: Status override settings

12. **create_list_in_folder**
    - Creates a new list within a folder
    - Required: `name`, either `folderId` or (`folderName` with space info)
    - Optional: Content, status

## Available Prompts

1. **summarize_tasks**
   - Groups tasks by status
   - Highlights priorities and deadlines
   - Suggests task relationships

2. **analyze_priorities**
   - Analyzes priority distribution
   - Identifies misalignments
   - Suggests adjustments and sequencing

3. **generate_description**
   - Generates detailed task descriptions with:
     - Clear objectives
     - Success criteria
     - Required resources
     - Dependencies
     - Potential risks

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors

## Support the Developer

If you find this project useful, please consider supporting the developer:
Talib Kareem (taazkareem@icloud.com)

- [Buy me a coffee](https://www.buymeacoffee.com/taazkareem)
- [Solana Wallet]: GjtRksihd7SWQw7hJSCDMcTxPHbgpNs7xPW3nFubNjVM

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

