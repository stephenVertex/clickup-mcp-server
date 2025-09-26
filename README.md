# ClickUp MCP Server with OAuth2

A fully compliant Model Context Protocol (MCP) server for ClickUp with proper OAuth2 authentication.

## Features

✅ **Full OAuth2 Implementation**
- Authorization Code flow with PKCE
- Dynamic client registration
- Token refresh support
- Secure state management

✅ **MCP Specification Compliance**
- Streamable HTTP transport
- OAuth2 metadata endpoints
- Session management
- Tool registration

✅ **ClickUp API Integration**
- User information
- Workspace management
- Tasks, lists, folders, spaces
- Full CRUD operations

## Setup

### 1. Create ClickUp App

1. Go to [ClickUp Apps](https://app.clickup.com/settings/apps)
2. Create a new app
3. Add redirect URI: `http://localhost:3005/oauth/callback`
4. Copy Client ID and Client Secret

### 2. Configure Environment

Create `.env` file:

```env
CLICKUP_CLIENT_ID=your_client_id
CLICKUP_CLIENT_SECRET=your_client_secret
PORT=3005
HOST=localhost
BASE_URL=http://localhost:3005
LOG_LEVEL=info
```

### 3. Install and Run

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start
```

## Connect with Claude Code

### HTTP Transport with OAuth2

```bash
claude mcp add --transport http clickup http://localhost:3005
```

When you use the ClickUp tools in Claude, you'll be prompted to authenticate via OAuth2.

## Available Tools

- `clickup_get_user` - Get current user information
- `clickup_get_workspaces` - List available workspaces
- `clickup_get_tasks` - Get tasks from a list
- `clickup_create_task` - Create a new task
- `clickup_update_task` - Update existing task
- `clickup_delete_task` - Delete a task

## Testing

```bash
# Run unit tests
npm test

# Run integration tests with Claude
npm run test:integration

# Test OAuth2 flow manually
curl http://localhost:3005/.well-known/mcp_oauth_metadata
```

## Architecture

### OAuth2 Flow

1. Claude requests authorization
2. User redirected to ClickUp login
3. ClickUp redirects back with code
4. Server exchanges code for token
5. Token stored in session
6. MCP tools use token for API calls

### Security

- PKCE for authorization code flow
- State parameter validation
- Token expiration handling
- Session timeout management
- HTTPS enforcement in production

## Development

```bash
# Run in development mode
npm run dev

# Run tests with coverage
npm run test:ci

# Check types
npm run type-check
```

## Troubleshooting

### Port Already in Use
Change port in `.env` file to available port.

### OAuth2 Redirect Error
Ensure redirect URI in ClickUp app matches `BASE_URL/oauth/callback`.

### Token Expired
Server automatically handles token refresh if refresh token is available.

## License

MIT