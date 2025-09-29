#!/usr/bin/env node

/**
 * Workspace Tasks Basic Functionality Test
 *
 * This test validates the basic functionality of get_workspace_tasks without
 * low-token mode. It tests standard task retrieval, summary mode, and various
 * filter combinations to ensure API connectivity and basic operations work.
 *
 * Usage: node tests/manual/workspace-tasks-basic.test.js
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

async function testBasic() {
  console.log('🧪 Basic test of get_workspace_tasks');
  console.log('📋 List ID: 901112032115');
  console.log('🔧 Mode: Standard (no low-token)\n');

  console.log('🔑 API Key found:', (process.env.CLICKUP_API_KEY || process.env.CLICKUP_API_TOKEN).substring(0, 10) + '...');
  console.log('🏢 Team ID:', process.env.CLICKUP_TEAM_ID);

  try {
    console.log('\n⏳ Test 1: Basic list query...');

    const result1 = await handleGetWorkspaceTasks({
      list_ids: ['901112032115']
    });

    console.log('✅ Test 1 Results:');
    console.log('- Total tasks:', result1.total_count || 0);
    console.log('- Has more:', result1.has_more || false);
    console.log('- Format:', result1.format || 'standard');

    if (result1.tasks && result1.tasks.length > 0) {
      console.log('- First task ID:', result1.tasks[0].id);
      console.log('- First task name:', result1.tasks[0].name);
    } else if (result1.summaries && result1.summaries.length > 0) {
      console.log('- First summary ID:', result1.summaries[0].id);
      console.log('- First summary name:', result1.summaries[0].name);
    }

    console.log('\n⏳ Test 2: Summary mode...');

    const result2 = await handleGetWorkspaceTasks({
      list_ids: ['901112032115'],
      detail_level: 'summary'
    });

    console.log('✅ Test 2 Results:');
    console.log('- Total tasks:', result2.total_count || 0);
    console.log('- Format:', result2.format || 'standard');

    if (result2.summaries && result2.summaries.length > 0) {
      console.log('- First summary keys:', Object.keys(result2.summaries[0]).join(', '));
    }

    console.log('\n⏳ Test 3: ANY workspace tasks (no list filter)...');

    const result3 = await handleGetWorkspaceTasks({
      statuses: ['to do']
    });

    console.log('✅ Test 3 Results:');
    console.log('- Total tasks:', result3.total_count || 0);
    console.log('- Format:', result3.format || 'standard');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('- Error message:', error.message);

    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status text:', error.response.statusText);
      if (error.response.data) {
        console.error('- Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    console.error('- Stack trace:');
    console.error(error.stack);
  }
}

testBasic().then(() => {
  console.log('\n✨ Basic test completed!');
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
});