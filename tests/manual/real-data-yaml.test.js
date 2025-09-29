#!/usr/bin/env node

/**
 * Real ClickUp Data with YAML Output Test
 *
 * This test gets real tasks from ClickUp API and shows both JSON and YAML output
 * using the formatTaskDataLowToken() function.
 *
 * Usage: node tests/manual/real-data-yaml.test.js
 */

import { formatTaskDataLowToken } from '../../build/tools/task/utilities.js';
import { taskService } from '../../build/services/shared.js';

const LIST_ID = '901112032115';

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

async function testRealDataWithYAML() {
  console.log('🧪 Real ClickUp Data - JSON and YAML Output\n');

  try {
    console.log(`📋 Fetching tasks from list ID: ${LIST_ID}\n`);

    const tasks = await taskService.getTasks(LIST_ID);

    if (!tasks || tasks.length === 0) {
      console.log('❌ No tasks found in the specified list');
      return;
    }

    console.log(`✅ Found ${tasks.length} task(s)\n`);

    // Show first task in both formats
    const task = tasks[0];
    const lowTokenTask = formatTaskDataLowToken(task);

    console.log(`🎯 Task: ${task.name}`);
    console.log(`📊 Data reduction: ${Math.round((1 - Object.keys(lowTokenTask).length / Object.keys(task).length) * 100)}% (${Object.keys(task).length} → ${Object.keys(lowTokenTask).length} keys)`);

    if (task.description) {
      console.log(`📝 Description: ${task.description.length} chars → ${lowTokenTask.description?.length || 0} chars`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 LOW-TOKEN JSON FORMAT:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(lowTokenTask, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📋 LOW-TOKEN YAML FORMAT:');
    console.log('='.repeat(60));
    console.log(toYAML(lowTokenTask));

    console.log('✅ Real ClickUp data successfully formatted in both JSON and YAML!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealDataWithYAML();