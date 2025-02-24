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
npx -y @taazkareem/clickup-mcp-server --env CLICKUP_API_KEY=your_api_key_here --env CLICKUP_TEAM_ID=your_team_id_here
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

### Workspace Tools
**get_workspace_hierarchy**
Returns complete workspace structure (spaces, folders, lists). No parameters required.

### Task Tools
**get_tasks** `(listId|listName)`
Get tasks from list with optional filters (archived, page, order_by, reverse, subtasks, statuses, include_closed, assignees, due_date_gt/lt, custom_fields).

**get_task** `(taskId|taskName, ?listName)`
Get detailed task info including attachments and custom fields.

**create_task** `(listId|listName, taskName)`
Create task with optional description (markdown), status, priority (1-4), dueDate.

**create_bulk_tasks** `(listId|listName, tasks[])`
Bulk create tasks with automatic rate limiting. Each task: name (required), description, status, priority, dueDate (optional).

**update_task** `(taskId|taskName, ?listName)`
Update task name, description, status, priority (1-4), dueDate.

**delete_task** `(taskId|taskName, ?listName)`
Permanently delete a task.

**move_task** `(taskId|taskName, destinationListId|destinationListName, ?sourceListName)`
Move task to different list, preserving task data.

**duplicate_task** `(taskId|taskName, destinationListId|destinationListName, ?sourceListName)`
Create copy of task in specified list.

### List & Folder Tools
**create_list** `(spaceId|spaceName, listName)`
Create list with optional content, dueDate, priority (1-4), assignee.

**create_folder** `(spaceId|spaceName, folderName, ?overrideStatuses)`
Create folder in space.

**create_list_in_folder** `(folderId|folderName, listName)`
Create list in folder with optional content and status.

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

