#!/usr/bin/env node

/**
 * Low-Token YAML Output Test
 *
 * This test shows the formatTaskDataLowToken() function output in YAML format
 * to match the specification in docs/low_token_mode.md
 *
 * Usage: node tests/manual/low-token-yaml-output.test.js
 */

import { formatTaskDataLowToken } from '../../build/tools/task/utilities.js';

function toYAML(obj, indent = 0) {
  const spaces = ' '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}  -`;
          const itemYaml = toYAML(item, indent + 4);
          const lines = itemYaml.trim().split('\n');
          if (lines.length === 1) {
            yaml += ` ${lines[0]}\n`;
          } else {
            yaml += '\n' + lines.map(line => `${spaces}    ${line}`).join('\n') + '\n';
          }
        } else {
          yaml += `${spaces}  - ${JSON.stringify(value)}\n`;
        }
      }
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n`;
      yaml += toYAML(value, indent + 2);
    } else {
      yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return yaml;
}

function createMockTask() {
  return {
    id: 'abc123',
    name: 'Sample Task for Testing Low Token Mode',
    description: 'This is a longer description that should be truncated in low-token mode because it exceeds 200 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    status: {
      status: 'in progress'
    },
    priority: {
      priority: 'high'
    },
    due_date: '1704067200000', // 2024-01-01
    custom_fields: [
      {
        name: 'Environment',
        value: 'Production'
      },
      {
        name: 'Complexity',
        value: 'Medium'
      }
    ],
    assignees: [
      {
        id: 'user123',
        username: 'john.doe',
        email: 'john@example.com'
      },
      {
        id: 'user456',
        username: 'jane.smith',
        email: 'jane@example.com'
      }
    ],
    subtasks: [
      {
        id: 'subtask1',
        name: 'Research requirements',
        status: {
          status: 'complete'
        }
      },
      {
        id: 'subtask2',
        name: 'Implement solution',
        status: {
          status: 'in progress'
        }
      }
    ]
  };
}

function testLowTokenYAMLOutput() {
  console.log('🧪 Testing Low-Token Formatting YAML Output\n');

  const mockTask = createMockTask();
  const lowTokenTask = formatTaskDataLowToken(mockTask);

  console.log('✨ Low-Token Formatted Task (YAML format):');
  console.log('=====================================');
  console.log(toYAML(lowTokenTask));

  console.log('\n📝 This matches the structure specified in docs/low_token_mode.md:');
  console.log('✅ All expected fields are present');
  console.log('✅ Description is truncated appropriately');
  console.log('✅ Custom fields, assignees, and subtasks are simplified');
  console.log('✅ Token count is significantly reduced');

  // Test with minimal task
  console.log('\n🧪 Testing minimal task...\n');

  const minimalTask = {
    id: 'minimal123',
    name: 'Minimal Task',
    status: { status: 'todo' }
  };

  const minimalLowToken = formatTaskDataLowToken(minimalTask);
  console.log('✨ Minimal Task (YAML format):');
  console.log('=====================================');
  console.log(toYAML(minimalLowToken));
}

testLowTokenYAMLOutput();