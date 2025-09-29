#!/usr/bin/env node

/**
 * Low-Token Formatting Real Data Test
 *
 * This test validates the formatTaskDataLowToken() function using real ClickUp API data.
 * It fetches tasks from a real list and shows the low-token formatted output.
 *
 * Usage: node tests/manual/low-token-real-data.test.js
 */

import { formatTaskDataLowToken } from '../../build/tools/task/utilities.js';
import { taskService } from '../../build/services/shared.js';

const LIST_ID = '901112032115';

async function testWithRealData() {
  console.log('🧪 Testing Low-Token Formatting with Real ClickUp Data\n');

  try {
    console.log(`📋 Fetching tasks from list ID: ${LIST_ID}`);

    // Get tasks directly from the list using core method
    const tasks = await taskService.getTasks(LIST_ID);

    if (!tasks || tasks.length === 0) {
      console.log('❌ No tasks found in the specified list');
      return;
    }

    console.log(`✅ Found ${tasks.length} task(s)\n`);

    // Process each task
    for (let i = 0; i < Math.min(tasks.length, 3); i++) { // Limit to first 3 tasks
      const task = tasks[i];

      console.log(`\n🔍 Task ${i + 1}: ${task.name}`);
      console.log('=====================================');

      console.log('\n📋 Original Task Keys:', Object.keys(task).join(', '));
      console.log('Description length:', task.description?.length || 0, 'characters');

      const lowTokenTask = formatTaskDataLowToken(task);

      console.log('\n✨ Low-Token Formatted Task:');
      console.log(JSON.stringify(lowTokenTask, null, 2));

      console.log('\n📊 Comparison:');
      console.log('Original keys:', Object.keys(task).length);
      console.log('Low-token keys:', Object.keys(lowTokenTask).length);
      console.log('Data reduction:', Math.round((1 - Object.keys(lowTokenTask).length / Object.keys(task).length) * 100) + '%');

      if (task.description && lowTokenTask.description) {
        console.log('Description truncated:', lowTokenTask.description.includes('...') ? 'Yes' : 'No');
      }
    }

    console.log('\n✅ Real data low-token formatting test completed!');

  } catch (error) {
    console.error('❌ Error testing with real data:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithRealData();