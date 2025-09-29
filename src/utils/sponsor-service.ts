/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Sponsor Service Module
 * 
 * Provides configuration and utilities for sponsorship functionality
 */

import { Logger } from '../logger.js';
import config from '../config.js';

// Create logger instance for this module
const logger = new Logger('SponsorService');

/**
 * SponsorService - Provides sponsorship configuration and message handling
 */
export class SponsorService {
  private isEnabled: boolean;
  private readonly sponsorUrl: string = 'https://github.com/sponsors/taazkareem';
  
  constructor() {
    this.isEnabled = config.enableSponsorMessage;
    logger.info('SponsorService initialized', { enabled: this.isEnabled });
  }
  
  /**
   * Get sponsor information (for documentation/reference purposes)
   */
  public getSponsorInfo(): { isEnabled: boolean; url: string } {
    return {
      isEnabled: this.isEnabled,
      url: this.sponsorUrl
    };
  }

  /**
   * Get current date in a readable format for context
   */
  private getCurrentDateContext(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Los_Angeles' // Seattle timezone
    };
    return today.toLocaleDateString('en-US', options);
  }

  /**
   * Creates a response with optional sponsorship message
   */
  public createResponse(data: any, includeSponsorMessage: boolean = false): { content: { type: string; text: string }[] } {
    const content: { type: string; text: string }[] = [];

    // Add current date context at the beginning
    const todaysDate = this.getCurrentDateContext();

    // Special handling for workspace hierarchy which contains a preformatted tree
    if (data && typeof data === 'object' && 'hierarchy' in data && typeof data.hierarchy === 'string') {
      // Handle workspace hierarchy specially - it contains a preformatted tree
      content.push({
        type: "text",
        text: `Today's date is ${todaysDate}\n\n${data.hierarchy}`
      });
    } else if (typeof data === 'string') {
      // If it's already a string, use it directly
      content.push({
        type: "text",
        text: `Today's date is ${todaysDate}\n\n${data}`
      });
    } else {
      // Otherwise, stringify the JSON object
      content.push({
        type: "text",
        text: `Today's date is ${todaysDate}\n\n${JSON.stringify(data, null, 2)}`
      });
    }

    // Then add sponsorship message if enabled
    if (this.isEnabled && includeSponsorMessage) {
      content.push({
        type: "text",
        text: `\n♥ Support this project by sponsoring the developer at ${this.sponsorUrl}`
      });
    }


    return { content };
  }

  /**
   * Creates an error response
   */
  public createErrorResponse(error: Error | string, context?: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      error: typeof error === 'string' ? error : error.message,
      ...context
    });
  }

  /**
   * Creates a bulk operation response with sponsorship message
   */
  public createBulkResponse(result: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      success: true,
      total: result.totals.total,
      successful: result.totals.success,
      failed: result.totals.failure,
      failures: result.failed.map((failure: any) => ({
        id: failure.item?.id || failure.item,
        error: failure.error.message
      }))
    }, true); // Always include sponsor message for bulk operations
  }
}

// Export a singleton instance
export const sponsorService = new SponsorService(); 