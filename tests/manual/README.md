# Manual Tests

This directory contains manual test scripts for validating ClickUp MCP Server functionality.

## Low-Token Mode Tests

### `low-token-formatting.test.js`
**Purpose**: Unit test for the `formatTaskDataLowToken()` function using mock data.

**Usage**:
```bash
node tests/manual/low-token-formatting.test.js
```

**What it tests**:
- Low-token formatting with complete task data
- Description truncation at 200 characters
- Handling of optional fields (custom_fields, assignees, subtasks)
- Minimal task formatting
- Structure compliance with `docs/low_token_mode.md`

**Dependencies**: None (uses mock data)

### `workspace-tasks-integration.test.js`
**Purpose**: Integration test for `get_workspace_tasks` with low-token mode using real ClickUp API.

**Usage**:
```bash
node tests/manual/workspace-tasks-integration.test.js
```

**What it tests**:
- Low-token mode vs standard mode comparison
- Real API integration with ClickUp
- Response format validation
- Token efficiency verification

**Dependencies**: Requires `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` environment variables

### `workspace-tasks-basic.test.js`
**Purpose**: Basic functionality test for `get_workspace_tasks` without low-token mode.

**Usage**:
```bash
node tests/manual/workspace-tasks-basic.test.js
```

**What it tests**:
- Standard workspace task retrieval
- Summary mode functionality
- Error handling and API connectivity
- Different filter combinations

**Dependencies**: Requires `CLICKUP_API_KEY` and `CLICKUP_TEAM_ID` environment variables

## Running Tests

### Prerequisites
1. Ensure the project is built: `npm run build`
2. Set environment variables:
   ```bash
   export CLICKUP_API_KEY=your_api_key
   export CLICKUP_TEAM_ID=your_team_id
   ```

### Test Order
1. Start with `low-token-formatting.test.js` (no API required)
2. Run `workspace-tasks-basic.test.js` to verify API connectivity
3. Run `workspace-tasks-integration.test.js` to test low-token mode

### Expected Results
- **Formatting test**: Should show properly formatted low-token structures
- **Basic test**: Should return task data from your ClickUp workspace
- **Integration test**: Should demonstrate token savings with low-token mode

## Notes
- Tests use real ClickUp API calls and may be subject to rate limits
- Some tests may return empty results if no tasks exist in the specified lists
- Test files are executable and include detailed output for debugging