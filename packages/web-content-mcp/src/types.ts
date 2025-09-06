import { z } from 'zod';

// Configuration schema for MacBook Air optimization
export const ConfigSchema = z.object({
  maxConcurrentRequests: z.number().min(1).max(10).default(3),
  requestTimeout: z.number().min(1000).max(30000).default(10000),
  maxCacheSize: z.number().min(10).max(1000).default(100),
  cacheTTL: z.number().min(60).max(86400).default(3600), // 1 hour default
  maxContentLength: z.number().min(1024).max(10485760).default(2097152), // 2MB default
  userAgent: z.string().default('KiloCode-WebContent-MCP/1.0.0'),
  enableSemanticAnalysis: z.boolean().default(true),
  enablePerformanceMonitoring: z.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

// Web content analysis result
export interface WebContentAnalysis {
  url: string;
  title?: string;
  description?: string;
  content: {
    text: string;
    html: string;
    wordCount: number;
    readingTime: number; // in minutes
  };
  structure: {
    headings: Array<{ level: number; text: string }>;
    links: Array<{ href: string; text: string; internal: boolean }>;
    images: Array<{ src: string; alt?: string; title?: string }>;
    forms: Array<{ action?: string; method?: string; inputs: number }>;
  };
  metadata: {
    charset?: string;
    language?: string;
    author?: string;
    keywords?: string[];
    viewport?: string;
    robots?: string;
    canonical?: string;
    openGraph?: Record<string, string>;
    twitterCard?: Record<string, string>;
  };
  technologies: {
    frameworks: string[];
    libraries: string[];
    analytics: string[];
    cms?: string;
    server?: string;
  };
  performance: {
    loadTime: number;
    contentSize: number;
    responseHeaders: Record<string, string>;
  };
  semantic: {
    purpose?: string;
    category?: string;
    mainTopics: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    complexity?: 'low' | 'medium' | 'high';
  };
}

// Simplified content for quick access
export interface WebContentSummary {
  url: string;
  title?: string;
  description?: string;
  mainContent: string;
  keyPoints: string[];
  category?: string;
  loadTime: number;
}

// Cache entry structure
export interface CacheEntry {
  data: WebContentAnalysis;
  timestamp: number;
  etag?: string;
  lastModified?: string;
}

// Request options
export interface FetchOptions {
  timeout?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  validateSSL?: boolean;
}

// Performance metrics
export interface PerformanceMetrics {
  requestCount: number;
  cacheHitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  errorRate: number;
  lastReset: number;
}

// Error types
export class WebContentError extends Error {
  constructor(
    message: string,
    public code: string,
    public url?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'WebContentError';
  }
}

export class NetworkError extends WebContentError {
  constructor(message: string, url?: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', url, statusCode);
    this.name = 'NetworkError';
  }
}

export class ParseError extends WebContentError {
  constructor(message: string, url?: string) {
    super(message, 'PARSE_ERROR', url);
    this.name = 'ParseError';
  }
}

export class TimeoutError extends WebContentError {
  constructor(message: string, url?: string) {
    super(message, 'TIMEOUT_ERROR', url);
    this.name = 'TimeoutError';
  }
}
