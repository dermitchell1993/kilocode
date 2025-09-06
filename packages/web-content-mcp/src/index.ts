#!/usr/bin/env node

import { WebContentMcpServer } from './server.js';
import { Config } from './types.js';

/**
 * Main entry point for the Web Content MCP Server
 * Optimized for MacBook Air performance
 */
async function main() {
  // Parse command line arguments for configuration
  const config: Partial<Config> = {};
  
  // Parse environment variables for configuration
  if (process.env.WEB_CONTENT_MAX_CONCURRENT_REQUESTS) {
    config.maxConcurrentRequests = parseInt(process.env.WEB_CONTENT_MAX_CONCURRENT_REQUESTS);
  }
  
  if (process.env.WEB_CONTENT_REQUEST_TIMEOUT) {
    config.requestTimeout = parseInt(process.env.WEB_CONTENT_REQUEST_TIMEOUT);
  }
  
  if (process.env.WEB_CONTENT_MAX_CACHE_SIZE) {
    config.maxCacheSize = parseInt(process.env.WEB_CONTENT_MAX_CACHE_SIZE);
  }
  
  if (process.env.WEB_CONTENT_CACHE_TTL) {
    config.cacheTTL = parseInt(process.env.WEB_CONTENT_CACHE_TTL);
  }
  
  if (process.env.WEB_CONTENT_MAX_CONTENT_LENGTH) {
    config.maxContentLength = parseInt(process.env.WEB_CONTENT_MAX_CONTENT_LENGTH);
  }
  
  if (process.env.WEB_CONTENT_USER_AGENT) {
    config.userAgent = process.env.WEB_CONTENT_USER_AGENT;
  }
  
  if (process.env.WEB_CONTENT_ENABLE_SEMANTIC_ANALYSIS) {
    config.enableSemanticAnalysis = process.env.WEB_CONTENT_ENABLE_SEMANTIC_ANALYSIS === 'true';
  }
  
  if (process.env.WEB_CONTENT_ENABLE_PERFORMANCE_MONITORING) {
    config.enablePerformanceMonitoring = process.env.WEB_CONTENT_ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  // Create and start the server
  const server = new WebContentMcpServer(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    await server.start();
    
    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { WebContentMcpServer } from './server.js';
export * from './types.js';
