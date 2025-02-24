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

| Tool | Description | Parameters |
|------|-------------|------------|
| [get_workspace_hierarchy](docs/workspace.md) | Returns complete workspace structure (spaces, folders, lists) | None required |
| [get_tasks](docs/tasks.md) | Get tasks from list with optional filters | `listId\|listName`, optional: archived, page, order_by, reverse, subtasks, statuses, include_closed, assignees, due_date_gt/lt, custom_fields |
| [get_task](docs/tasks.md) | Get detailed task info including attachments and custom fields | `taskId\|taskName`, optional: `listName` |
| [create_task](docs/tasks.md) | Create task with optional parameters | `listId\|listName`, `taskName`, optional: description (markdown), status, priority (1-4), dueDate |
| [create_bulk_tasks](docs/tasks.md) | Bulk create tasks with automatic rate limiting | `listId\|listName`, `tasks[]` (Each task: name required, description, status, priority, dueDate optional) |
| [update_task](docs/tasks.md) | Update task properties | `taskId\|taskName`, optional: `listName`, name, description, status, priority (1-4), dueDate |
| [delete_task](docs/tasks.md) | Permanently delete a task | `taskId\|taskName`, optional: `listName` |
| [move_task](docs/tasks.md) | Move task to different list | `taskId\|taskName`, `destinationListId\|destinationListName`, optional: `sourceListName` |
| [duplicate_task](docs/tasks.md) | Create copy of task in specified list | `taskId\|taskName`, `destinationListId\|destinationListName`, optional: `sourceListName` |
| [create_list](docs/lists.md) | Create list in space | `spaceId\|spaceName`, `listName`, optional: content, dueDate, priority (1-4), assignee |
| [create_folder](docs/folders.md) | Create folder in space | `spaceId\|spaceName`, `folderName`, optional: `overrideStatuses` |
| [create_list_in_folder](docs/lists.md) | Create list in folder | `folderId\|folderName`, `listName`, optional: content and status |

## Available Prompts

| Prompt | Description | Features |
|--------|-------------|-----------|
| [summarize_tasks](docs/prompts.md) | Task summary and status overview | - Basic task summary by status<br>- Lists tasks with their current states<br>- Shows task relationships within lists |
| [analyze_priorities](docs/prompts.md) | Priority analysis and recommendations | - Reviews current task priorities<br>- Suggests priority adjustments<br>- Recommends task sequencing |
| [generate_description](docs/prompts.md) | Interactive task description generator | - Interactive prompt for creating task descriptions<br>- Helps structure task information<br>- Includes objectives, criteria, and dependencies |

## Error Handling

The server provides clear error messages for:
- Missing required parameters
- Invalid IDs or names
- Items not found
- Permission issues
- API errors
- Rate limiting

## Support the Developer

If you find this project useful, please consider supporting

[![Sponsor TaazKareem](https://img.shields.io/badge/Sponsor-TaazKareem-orange?logo=github)](https://github.com/sponsors/TaazKareem)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

