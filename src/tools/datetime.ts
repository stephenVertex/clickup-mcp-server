/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP DateTime Utility Tools
 *
 * This module provides datetime conversion utilities for handling custom fields
 * that store datetime values as Unix timestamps in seconds.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { datetimeToMillisecondsGmt, timestampToDatetime, datetimeToSecondsGmt, secondsGmtToDatetime } from '../utils/date-utils.js';

// Create a logger for datetime tools
const logger = new Logger('DateTimeTool');

/**
 * Tool definition for converting datetime to timestamp
 */
export const datetimeToTimestampTool: Tool = {
  name: 'datetime_to_timestamp',
  description: `Converts a datetime string or ISO date to Unix timestamp. Returns milliseconds by default (JavaScript standard), with option for seconds. Useful for storing datetime values in ClickUp custom fields.`,
  inputSchema: {
    type: 'object',
    properties: {
      datetime: {
        type: 'string',
        description: 'Datetime string in various formats (ISO, natural language like "tomorrow 3pm", "2025-01-15 14:30", etc.)'
      },
      output_seconds: {
        type: 'boolean',
        description: 'If true, returns timestamp in seconds instead of milliseconds. Default: false (milliseconds)',
        default: false
      }
    },
    required: ['datetime']
  }
};

/**
 * Legacy tool for backward compatibility
 */
export const datetimeToSecondsGmtTool: Tool = {
  name: 'datetime_to_seconds_gmt',
  description: `[DEPRECATED] Use datetime_to_timestamp instead. Converts datetime to Unix timestamp in seconds since GMT epoch.`,
  inputSchema: {
    type: 'object',
    properties: {
      datetime: {
        type: 'string',
        description: 'Datetime string in various formats (ISO, natural language like "tomorrow 3pm", "2025-01-15 14:30", etc.)'
      }
    },
    required: ['datetime']
  }
};

/**
 * Tool definition for converting timestamp to datetime with autodetection
 */
export const timestampToDatetimeTool: Tool = {
  name: 'timestamp_to_datetime',
  description: `Converts Unix timestamp to formatted datetime string in specified timezone. Automatically detects if timestamp is in seconds or milliseconds. Useful for displaying datetime values from ClickUp custom fields or JavaScript timestamps.`,
  inputSchema: {
    type: 'object',
    properties: {
      timestamp: {
        type: 'number',
        description: 'Unix timestamp (autodetects seconds vs milliseconds based on magnitude)'
      },
      timezone: {
        type: 'string',
        description: 'Timezone name (e.g., "Pacific Time", "America/Los_Angeles", "UTC", "Eastern Time"). Defaults to "Pacific Time"',
        default: 'Pacific Time'
      },
      force_seconds: {
        type: 'boolean',
        description: 'If true, forces interpretation as seconds regardless of autodetection. Default: false (autodetect)',
        default: false
      }
    },
    required: ['timestamp']
  }
};

/**
 * Legacy tool for backward compatibility
 */
export const secondsGmtToDatetimeTool: Tool = {
  name: 'seconds_gmt_to_datetime',
  description: `[DEPRECATED] Use timestamp_to_datetime instead. Converts Unix timestamp in seconds to formatted datetime string.`,
  inputSchema: {
    type: 'object',
    properties: {
      seconds: {
        type: 'number',
        description: 'Unix timestamp in seconds since GMT epoch'
      },
      timezone: {
        type: 'string',
        description: 'Timezone name (e.g., "Pacific Time", "America/Los_Angeles", "UTC", "Eastern Time"). Defaults to "Pacific Time"',
        default: 'Pacific Time'
      }
    },
    required: ['seconds']
  }
};

/**
 * Handler for the datetime_to_timestamp tool
 */
export async function handleDatetimeToTimestamp(args: any) {
  try {
    const { datetime, output_seconds = false } = args;

    if (!datetime) {
      throw new Error('Datetime parameter is required');
    }

    logger.info(`Converting datetime to timestamp: ${datetime} (seconds: ${output_seconds})`);

    const timestamp = datetimeToMillisecondsGmt(datetime, output_seconds);

    const result = {
      input_datetime: datetime,
      timestamp: timestamp,
      format: output_seconds ? 'seconds' : 'milliseconds',
      verification: {
        converted_back_utc: timestampToDatetime(timestamp, 'UTC', output_seconds),
        converted_back_pacific: timestampToDatetime(timestamp, 'Pacific Time', output_seconds),
        iso_string: new Date(output_seconds ? timestamp * 1000 : timestamp).toISOString()
      }
    };

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error(`Error converting datetime to timestamp: ${error.message}`);
    return sponsorService.createErrorResponse(`Error converting datetime: ${error.message}`);
  }
}

/**
 * Handler for the legacy datetime_to_seconds_gmt tool
 */
export async function handleDatetimeToSecondsGmt(args: any) {
  try {
    const { datetime } = args;

    if (!datetime) {
      throw new Error('Datetime parameter is required');
    }

    logger.info(`Converting datetime to seconds GMT (legacy): ${datetime}`);

    const seconds = datetimeToSecondsGmt(datetime);

    const result = {
      input_datetime: datetime,
      seconds_gmt: seconds,
      verification: {
        converted_back: secondsGmtToDatetime(seconds, 'UTC'),
        unix_timestamp_ms: seconds * 1000
      },
      notice: 'This tool is deprecated. Consider using datetime_to_timestamp instead.'
    };

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error(`Error converting datetime to seconds GMT: ${error.message}`);
    return sponsorService.createErrorResponse(`Error converting datetime: ${error.message}`);
  }
}

/**
 * Handler for the timestamp_to_datetime tool
 */
export async function handleTimestampToDatetime(args: any) {
  try {
    const { timestamp, timezone = 'Pacific Time', force_seconds = false } = args;

    if (timestamp === undefined || timestamp === null) {
      throw new Error('Timestamp parameter is required');
    }

    if (typeof timestamp !== 'number') {
      throw new Error('Timestamp must be a number');
    }

    logger.info(`Converting timestamp to datetime: ${timestamp} (timezone: ${timezone}, force_seconds: ${force_seconds})`);

    const datetime = timestampToDatetime(timestamp, timezone, force_seconds);

    // Determine what format was detected/used
    let detectedFormat: string;
    let milliseconds: number;

    if (force_seconds) {
      detectedFormat = 'seconds (forced)';
      milliseconds = timestamp * 1000;
    } else {
      const cutoffSeconds = 2000000000; // May 18, 2033
      if (timestamp < cutoffSeconds) {
        detectedFormat = 'seconds (autodetected)';
        milliseconds = timestamp * 1000;
      } else {
        detectedFormat = 'milliseconds (autodetected)';
        milliseconds = timestamp;
      }
    }

    const result = {
      input_timestamp: timestamp,
      detected_format: detectedFormat,
      timezone: timezone,
      formatted_datetime: datetime,
      verification: {
        iso_string: new Date(milliseconds).toISOString(),
        unix_timestamp_ms: milliseconds,
        unix_timestamp_seconds: Math.floor(milliseconds / 1000)
      }
    };

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error(`Error converting timestamp to datetime: ${error.message}`);
    return sponsorService.createErrorResponse(`Error converting timestamp: ${error.message}`);
  }
}

/**
 * Handler for the legacy seconds_gmt_to_datetime tool
 */
export async function handleSecondsGmtToDatetime(args: any) {
  try {
    const { seconds, timezone = 'Pacific Time' } = args;

    if (seconds === undefined || seconds === null) {
      throw new Error('Seconds parameter is required');
    }

    if (typeof seconds !== 'number') {
      throw new Error('Seconds must be a number');
    }

    logger.info(`Converting seconds GMT to datetime (legacy): ${seconds} (timezone: ${timezone})`);

    const datetime = secondsGmtToDatetime(seconds, timezone);

    const result = {
      input_seconds: seconds,
      timezone: timezone,
      formatted_datetime: datetime,
      verification: {
        iso_string: new Date(seconds * 1000).toISOString(),
        unix_timestamp_ms: seconds * 1000
      },
      notice: 'This tool is deprecated. Consider using timestamp_to_datetime instead.'
    };

    return sponsorService.createResponse(result, true);
  } catch (error: any) {
    logger.error(`Error converting seconds GMT to datetime: ${error.message}`);
    return sponsorService.createErrorResponse(`Error converting timestamp: ${error.message}`);
  }
}