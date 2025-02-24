<img src="https://clickup.com/assets/brand/logo-v3-clickup-dark.svg" alt="ClickUp" height="40" style="vertical-align: middle; margin-top: -4px;">

# MCP Server

A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.

## Quick Start

Directions for use with Cursor Composer Agent:

1. Get your credentials:
   - ClickUp API key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL
2. Go to Features in settings
3. Add under MCP Servers:
```bash
npx -y @taazkareem/clickup-mcp-server \
  --env CLICKUP_API_KEY=your_api_key_here \
  --env CLICKUP_TEAM_ID=your_team_id_here
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

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| [get_workspace_hierarchy](docs/tools.md#workspace-organization) | Get complete workspace structure | None |
| [get_tasks](docs/tools.md#task-management) | Retrieve tasks from a list | `listId` or `listName` |
| [get_task](docs/tools.md#task-management) | Get single task details | `taskId` or `taskName` |
| [create_task](docs/tools.md#task-management) | Create a new task | `listId`, `taskName` |
| [create_bulk_tasks](docs/tools.md#task-management) | Create multiple tasks | `listId`, `tasks[]` |
| [update_task](docs/tools.md#task-management) | Modify task properties | `taskId` or `taskName` |
| [delete_task](docs/tools.md#task-management) | Remove a task | `taskId` or `taskName` |
| [move_task](docs/tools.md#task-management) | Move task to another list | `taskId`, `destinationListId` |
| [duplicate_task](docs/tools.md#task-management) | Copy task to another list | `taskId`, `destinationListId` |
| [create_list](docs/tools.md#list-management) | Create a new list | `spaceId`, `listName` |
| [create_folder](docs/tools.md#folder-management) | Create a new folder | `spaceId`, `folderName` |
| [create_list_in_folder](docs/tools.md#list-management) | Create list in folder | `folderId`, `listName` |

See [full documentation](docs/tools.md) for optional parameters and advanced usage.

## Available Prompts

| Prompt | Purpose | Features |
|--------|---------|----------|
| [summarize_tasks](docs/tools.md#prompts) | Generate task overview | Status summary, relationships, current states |
| [analyze_priorities](docs/tools.md#prompts) | Review task priorities | Priority review, adjustments, sequencing |
| [generate_description](docs/tools.md#prompts) | Create task descriptions | Structure, objectives, dependencies |

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

