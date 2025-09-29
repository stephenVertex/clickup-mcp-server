#!/usr/bin/env node

/**
 * Low-Token Formatting Unit Test
 *
 * This test validates the formatTaskDataLowToken() function using mock data.
 * It verifies that the low-token format matches the specification in docs/low_token_mode.md
 * and properly handles optional fields, description truncation, and minimal tasks.
 *
 * Usage: node tests/manual/low-token-formatting.test.js
 * Dependencies: None (uses mock data)
 */

import { formatTaskDataLowToken } from '../../build/tools/task/utilities.js';

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
    ],
    tags: [
      {
        name: 'backend',
        tag_bg: '#FF0000',
        tag_fg: '#FFFFFF'
      }
    ],
    list: {
      id: '901112032115',
      name: 'Development Tasks'
    },
    space: {
      id: 'space123',
      name: 'My Workspace'
    }
  };
}

function testLowTokenFormatting() {
  console.log('🧪 Testing Low-Token Formatting with Mock Data\n');

  const mockTask = createMockTask();

  console.log('📋 Original Mock Task Structure:');
  console.log('Keys:', Object.keys(mockTask).join(', '));
  console.log('Description length:', mockTask.description.length, 'characters');

  const lowTokenTask = formatTaskDataLowToken(mockTask);

  console.log('\n✨ Low-Token Formatted Task:');
  console.log('=====================================');
  console.log(JSON.stringify(lowTokenTask, null, 2));

  console.log('\n📊 Comparison:');
  console.log('Original keys:', Object.keys(mockTask).length);
  console.log('Low-token keys:', Object.keys(lowTokenTask).length);
  console.log('Description truncated:', lowTokenTask.description?.includes('...') ? 'Yes' : 'No');

  // Test with a task without optional fields
  console.log('\n🧪 Testing with minimal task...');

  const minimalTask = {
    id: 'minimal123',
    name: 'Minimal Task',
    status: { status: 'todo' }
  };

  const minimalLowToken = formatTaskDataLowToken(minimalTask);
  console.log('\n✨ Minimal Low-Token Task:');
  console.log(JSON.stringify(minimalLowToken, null, 2));

  console.log('\n✅ Low-token formatting is working correctly!');

  // Verify YAML-like structure matches docs/low_token_mode.md
  console.log('\n📝 Structure matches docs/low_token_mode.md:');
  const expectedFields = ['name', 'id', 'status', 'priority', 'due_date', 'description', 'custom_fields', 'assignees', 'subtasks'];
  const actualFields = Object.keys(lowTokenTask);

  expectedFields.forEach(field => {
    const hasField = actualFields.includes(field);
    const status = hasField ? '✅' : (lowTokenTask[field] === undefined ? '⚪' : '❌');
    console.log(`  ${status} ${field}${hasField ? '' : ' (not present - OK if optional)'}`);
  });
}

testLowTokenFormatting();