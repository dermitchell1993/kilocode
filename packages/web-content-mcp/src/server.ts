import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { HttpClient } from './http-client.js';
import { ContentProcessor } from './content-processor.js';
import { 
  Config, 
  ConfigSchema, 
  WebContentError, 
  NetworkError, 
  TimeoutError,
  ParseError 
} from './types.js';

/**
 * Web Content MCP Server
 * Lean, high-performance server for web content retrieval and semantic analysis
 */
export class WebContentMcpServer {
  private server: Server;
  private httpClient: HttpClient;
  private contentProcessor: ContentProcessor;
  private config: Config;

  constructor(config: Partial<Config> = {}) {
    // Validate and set configuration
    this.config = ConfigSchema.parse(config);
    
    // Initialize components
    this.httpClient = new HttpClient(this.config);
    this.contentProcessor = new ContentProcessor(this.config);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'web-content-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fetch_page_content',
            description: 'Fetch and analyze complete web page content with semantic understanding',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the web page to fetch and analyze',
                },
                options: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
                    followRedirects: { type: 'boolean', description: 'Whether to follow redirects' },
                    headers: { type: 'object', description: 'Custom headers to send with request' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_page_summary',
            description: 'Get a lightweight summary of web page content for quick understanding',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the web page to summarize',
                },
                options: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
                    headers: { type: 'object', description: 'Custom headers to send with request' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'analyze_website_structure',
            description: 'Analyze website structure including headings, links, forms, and technologies',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the website to analyze',
                },
                options: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
                    headers: { type: 'object', description: 'Custom headers to send with request' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'extract_page_metadata',
            description: 'Extract metadata from web page including SEO tags, Open Graph, and technical details',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the web page to extract metadata from',
                },
                options: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
                    headers: { type: 'object', description: 'Custom headers to send with request' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'detect_technologies',
            description: 'Detect technologies, frameworks, and tools used by a website',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL of the website to analyze for technologies',
                },
                options: {
                  type: 'object',
                  properties: {
                    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
                    headers: { type: 'object', description: 'Custom headers to send with request' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'get_performance_metrics',
            description: 'Get performance metrics and statistics for the MCP server',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'clear_cache',
            description: 'Clear the internal cache to free memory',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ] satisfies Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_page_content':
            return await this.handleFetchPageContent(args);
          
          case 'get_page_summary':
            return await this.handleGetPageSummary(args);
          
          case 'analyze_website_structure':
            return await this.handleAnalyzeWebsiteStructure(args);
          
          case 'extract_page_metadata':
            return await this.handleExtractPageMetadata(args);
          
          case 'detect_technologies':
            return await this.handleDetectTechnologies(args);
          
          case 'get_performance_metrics':
            return await this.handleGetPerformanceMetrics();
          
          case 'clear_cache':
            return await this.handleClearCache();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle fetch_page_content tool
   */
  private async handleFetchPageContent(args: any) {
    const schema = z.object({
      url: z.string().url(),
      options: z.object({
        timeout: z.number().optional(),
        followRedirects: z.boolean().optional(),
        headers: z.record(z.string()).optional(),
      }).optional(),
    });

    const { url, options = {} } = schema.parse(args);
    const startTime = Date.now();

    try {
      const response = await this.httpClient.fetch(url, options);
      
      if (!this.contentProcessor.validateContent(response)) {
        throw new WebContentError('Invalid content type or size', 'INVALID_CONTENT', url);
      }

      const analysis = await this.contentProcessor.processResponse(response, startTime);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Handle get_page_summary tool
   */
  private async handleGetPageSummary(args: any) {
    const schema = z.object({
      url: z.string().url(),
      options: z.object({
        timeout: z.number().optional(),
        headers: z.record(z.string()).optional(),
      }).optional(),
    });

    const { url, options = {} } = schema.parse(args);
    const startTime = Date.now();

    try {
      const response = await this.httpClient.fetch(url, options);
      
      if (!this.contentProcessor.validateContent(response)) {
        throw new WebContentError('Invalid content type or size', 'INVALID_CONTENT', url);
      }

      const summary = await this.contentProcessor.processSummary(response, startTime);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Handle analyze_website_structure tool
   */
  private async handleAnalyzeWebsiteStructure(args: any) {
    const schema = z.object({
      url: z.string().url(),
      options: z.object({
        timeout: z.number().optional(),
        headers: z.record(z.string()).optional(),
      }).optional(),
    });

    const { url, options = {} } = schema.parse(args);
    const startTime = Date.now();

    try {
      const response = await this.httpClient.fetch(url, options);
      const analysis = await this.contentProcessor.processResponse(response, startTime);

      const structure = {
        url: analysis.url,
        title: analysis.title,
        structure: analysis.structure,
        technologies: analysis.technologies,
        performance: {
          loadTime: analysis.performance.loadTime,
          contentSize: analysis.performance.contentSize,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(structure, null, 2),
          },
        ],
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Handle extract_page_metadata tool
   */
  private async handleExtractPageMetadata(args: any) {
    const schema = z.object({
      url: z.string().url(),
      options: z.object({
        timeout: z.number().optional(),
        headers: z.record(z.string()).optional(),
      }).optional(),
    });

    const { url, options = {} } = schema.parse(args);

    try {
      const response = await this.httpClient.fetch(url, options);
      const metadata = await this.contentProcessor.extractMetadata(response);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(metadata, null, 2),
          },
        ],
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Handle detect_technologies tool
   */
  private async handleDetectTechnologies(args: any) {
    const schema = z.object({
      url: z.string().url(),
      options: z.object({
        timeout: z.number().optional(),
        headers: z.record(z.string()).optional(),
      }).optional(),
    });

    const { url, options = {} } = schema.parse(args);
    const startTime = Date.now();

    try {
      const response = await this.httpClient.fetch(url, options);
      const analysis = await this.contentProcessor.processResponse(response, startTime);

      const technologies = {
        url: analysis.url,
        technologies: analysis.technologies,
        metadata: {
          generator: analysis.metadata.generator,
          server: analysis.performance.responseHeaders.server,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(technologies, null, 2),
          },
        ],
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Handle get_performance_metrics tool
   */
  private async handleGetPerformanceMetrics() {
    const metrics = this.httpClient.getMetrics();
    const cacheStats = this.httpClient.getCacheStats();

    const performanceData = {
      httpClient: metrics,
      cache: cacheStats,
      config: this.config,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(performanceData, null, 2),
        },
      ],
    };
  }

  /**
   * Handle clear_cache tool
   */
  private async handleClearCache() {
    this.httpClient.clearCache();
    this.httpClient.resetMetrics();

    return {
      content: [
        {
          type: 'text',
          text: 'Cache cleared and metrics reset successfully',
        },
      ],
    };
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, url?: string): Error {
    if (error instanceof WebContentError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new TimeoutError('Request timeout', url);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new NetworkError(`Network error: ${error.message}`, url);
    }

    return new WebContentError(`Unexpected error: ${error.message}`, 'UNKNOWN_ERROR', url);
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log startup information if in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Web Content MCP Server started');
      console.error('Configuration:', JSON.stringify(this.config, null, 2));
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
  }
}
