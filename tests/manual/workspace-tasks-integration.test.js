#!/usr/bin/env node

/**
 * Workspace Tasks Integration Test with Low-Token Mode
 *
 * This test validates the get_workspace_tasks tool with low-token mode enabled,
 * comparing it against standard mode responses. It bypasses MCP and directly
 * tests the handler function with real ClickUp API calls.
 *
 * Usage: node tests/manual/workspace-tasks-integration.test.js
 * Dependencies: Requires CLICKUP_API_KEY and CLICKUP_TEAM_ID environment variables
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Import the built modules
import { handleGetWorkspaceTasks } from '../../build/tools/task/index.js';

async function testLowTokenMode() {
  console.log('🧪 Testing get_workspace_tasks with low_token_mode = true');
  console.log('📋 List ID: 901112032115');
  console.log('🔧 Mode: Low Token\n');

  // Check if API token is available
  if (!process.env.CLICKUP_API_KEY && !process.env.CLICKUP_API_TOKEN) {
    console.error('❌ CLICKUP_API_KEY or CLICKUP_API_TOKEN not found in environment variables');
    console.log('💡 Make sure you have CLICKUP_API_KEY=your_token set');
    process.exit(1);
  }

  console.log('🔑 API Key found:', (process.env.CLICKUP_API_KEY || process.env.CLICKUP_API_TOKEN).substring(0, 10) + '...');
  console.log('🏢 Team ID:', process.env.CLICKUP_TEAM_ID);

  try {
    console.log('⏳ Calling handleGetWorkspaceTasks...');

    const result = await handleGetWorkspaceTasks({
      list_ids: ['901112032115'],
      low_token_mode: true
    });

    console.log('✅ Request completed successfully!\n');

    // Display results
    console.log('📊 RESULTS:');
    console.log('Format:', result.format || 'standard');
    console.log('Total tasks:', result.total_count || 0);
    console.log('Has more:', result.has_more || false);
    console.log('Next page:', result.next_page || 0);

    if (result.tasks && result.tasks.length > 0) {
      console.log('\n📝 FIRST TASK (Low-Token Format):');
      console.log('=====================================');
      console.log(JSON.stringify(result.tasks[0], null, 2));

      if (result.tasks.length > 1) {
        console.log(`\n📋 Additional ${result.tasks.length - 1} task(s) available...`);

        // Show structure of all tasks
        console.log('\n🏗️ TASK STRUCTURES:');
        result.tasks.forEach((task, index) => {
          console.log(`Task ${index + 1}:`, Object.keys(task).join(', '));
        });
      }
    } else {
      console.log('\n📭 No tasks found');
    }

    // Test standard mode for comparison
    console.log('\n🔄 Testing standard mode for comparison...');
    const standardResult = await handleGetWorkspaceTasks({
      list_ids: ['901112032115'],
      low_token_mode: false,
      detail_level: 'summary'
    });

    console.log('📊 Standard mode results:');
    console.log('Format:', standardResult.format || 'standard');
    console.log('Total tasks:', standardResult.total_count || 0);

    if (standardResult.summaries && standardResult.summaries.length > 0) {
      console.log('First task keys (standard):', Object.keys(standardResult.summaries[0]).join(', '));
    } else if (standardResult.tasks && standardResult.tasks.length > 0) {
      console.log('First task keys (standard):', Object.keys(standardResult.tasks[0]).join(', '));
    }

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error message:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status text:', error.response.statusText);
      console.error('Response data:', error.response.data);
    }

    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testLowTokenMode().then(() => {
  console.log('\n✨ Test completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});