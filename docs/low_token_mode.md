# Low-token mode

Low-token mode provides a simplified, token-efficient representation of ClickUp tasks that reduces API response sizes by up to **87%** while preserving essential task information.

## Implementation

The `formatTaskDataLowToken()` function is available in `src/tools/task/utilities.ts` and transforms full ClickUp task objects into a compact YAML-like structure.

## Data Reduction

- **Original task**: 38+ fields including metadata, permissions, timestamps, etc.
- **Low-token format**: 5-9 essential fields only
- **Token reduction**: Up to 87% fewer data fields transmitted

## Format Specification

```yaml
name: "task name"
id: "abc123"
status: "todo"
priority: "high"                    # Optional - only if set
due_date: "2025-01-01"             # Optional - only if set
description: "task description"     # Optional - truncated to 200 chars
custom_fields:                     # Optional - only if present
  - name: "custom field name"
    value: "custom field value"
assignees:                         # Optional - only if present
  - name: "assignee name"
    id: "def456"
subtasks:                          # Optional - only if present
  - name: "subtask name"
    id: "sdfsds12"
    status: "todo"
```

## Real Example

Here's an actual task from ClickUp formatted in low-token mode:

```yaml
name: "🎙️ Brian Nielson - or ask for referral"
id: "868fqxz19"
status: "ideation"
description: "Brian is at Sonrai Security, and we can have a security-focused episode about AI and agents and such"
custom_fields:
  - name: "EP_NUM"
  - name: "GUEST"
    value: "Brian Nielson - or ask for referral"
  - name: "LPT_TASK_TYPE"
    value: 0
  - name: "RECORDING_DATE"
  - name: "TASK_FILES"
  - name: "TASK_URL"
```

## Features

- **Selective fields**: Only includes essential task information
- **Description truncation**: Limits descriptions to 200 characters with "..." suffix
- **Simplified custom fields**: Only includes name and value (no type info, IDs, etc.)
- **Streamlined assignees**: Username/email and ID only (no full user objects)
- **Basic subtasks**: Name, ID, and status only (no nested details)
- **Optional fields**: Fields are omitted entirely if not present (no null values)

## Testing

Test the implementation with real ClickUp data:

```bash
# Test with mock data and YAML output
node tests/manual/low-token-formatting.test.js

# Test with real ClickUp API data
node tests/manual/real-data-yaml.test.js
```

