import fetch, { Response } from 'node-fetch';
import { LRUCache } from 'lru-cache';
import { 
  Config, 
  CacheEntry, 
  FetchOptions, 
  NetworkError, 
  TimeoutError,
  PerformanceMetrics 
} from './types.js';

/**
 * High-performance HTTP client optimized for MacBook Air
 * Features smart caching, request deduplication, and resource management
 */
export class HttpClient {
  private cache: LRUCache<string, CacheEntry>;
  private activeRequests = new Map<string, Promise<Response>>();
  private requestQueue: Array<() => Promise<void>> = [];
  private activeRequestCount = 0;
  private metrics: PerformanceMetrics;

  constructor(private config: Config) {
    this.cache = new LRUCache({
      max: config.maxCacheSize,
      ttl: config.cacheTTL * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      allowStale: false,
    });

    this.metrics = {
      requestCount: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      errorRate: 0,
      lastReset: Date.now(),
    };
  }

  /**
   * Fetch content with smart caching and request deduplication
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    
    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.updateMetrics('cache_hit');
      return this.createResponseFromCache(cached);
    }

    // Check for active request to same URL (deduplication)
    const activeRequest = this.activeRequests.get(cacheKey);
    if (activeRequest) {
      return activeRequest;
    }

    // Queue request if at concurrency limit
    if (this.activeRequestCount >= this.config.maxConcurrentRequests) {
      return this.queueRequest(() => this.executeRequest(url, options, cacheKey));
    }

    return this.executeRequest(url, options, cacheKey);
  }

  /**
   * Execute HTTP request with timeout and error handling
   */
  private async executeRequest(
    url: string, 
    options: FetchOptions, 
    cacheKey: string
  ): Promise<Response> {
    const startTime = Date.now();
    this.activeRequestCount++;
    this.metrics.requestCount++;

    try {
      const controller = new AbortController();
      const timeout = options.timeout || this.config.requestTimeout;
      
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers,
        },
        redirect: options.followRedirects !== false ? 'follow' : 'manual',
        follow: options.maxRedirects || 5,
      };

      const requestPromise = fetch(url, fetchOptions);
      this.activeRequests.set(cacheKey, requestPromise);

      const response = await requestPromise;
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          url,
          response.status
        );
      }

      // Cache successful responses
      await this.cacheResponse(cacheKey, response, startTime);
      
      this.updateMetrics('success', Date.now() - startTime);
      return response;

    } catch (error) {
      this.updateMetrics('error');
      
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${options.timeout || this.config.requestTimeout}ms`, url);
      }
      
      if (error instanceof NetworkError) {
        throw error;
      }
      
      throw new NetworkError(`Network request failed: ${error.message}`, url);
    } finally {
      this.activeRequestCount--;
      this.activeRequests.delete(cacheKey);
      this.processQueue();
    }
  }

  /**
   * Queue request when at concurrency limit
   */
  private async queueRequest(requestFn: () => Promise<Response>): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await requestFn();
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequestCount < this.config.maxConcurrentRequests) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options: FetchOptions): string {
    const optionsHash = JSON.stringify({
      headers: options.headers || {},
      followRedirects: options.followRedirects,
      maxRedirects: options.maxRedirects,
    });
    return `${url}:${Buffer.from(optionsHash).toString('base64')}`;
  }

  /**
   * Get cached response if valid
   */
  private getCachedResponse(cacheKey: string): CacheEntry | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTTL * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Cache response with metadata
   */
  private async cacheResponse(cacheKey: string, response: Response, startTime: number): Promise<void> {
    try {
      // Clone response for caching (response can only be read once)
      const responseClone = response.clone();
      const content = await responseClone.text();
      
      if (content.length > this.config.maxContentLength) {
        // Don't cache oversized content
        return;
      }

      const cacheEntry: CacheEntry = {
        data: {
          url: response.url,
          content: { text: content, html: content, wordCount: 0, readingTime: 0 },
          structure: { headings: [], links: [], images: [], forms: [] },
          metadata: {},
          technologies: { frameworks: [], libraries: [], analytics: [] },
          performance: {
            loadTime: Date.now() - startTime,
            contentSize: content.length,
            responseHeaders: Object.fromEntries(response.headers.entries()),
          },
          semantic: { mainTopics: [] },
        },
        timestamp: Date.now(),
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
      };

      this.cache.set(cacheKey, cacheEntry);
    } catch (error) {
      // Silently fail caching - don't break the request
      console.warn('Failed to cache response:', error.message);
    }
  }

  /**
   * Create Response object from cached data
   */
  private createResponseFromCache(cached: CacheEntry): Response {
    const headers = cached.data.performance.responseHeaders;
    return new Response(cached.data.content.html, {
      status: 200,
      statusText: 'OK (Cached)',
      headers: new Headers(headers),
    }) as Response;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(type: 'success' | 'error' | 'cache_hit', responseTime?: number): void {
    if (type === 'cache_hit') {
      const totalRequests = this.metrics.requestCount + 1;
      const cacheHits = Math.round(this.metrics.cacheHitRate * this.metrics.requestCount) + 1;
      this.metrics.cacheHitRate = cacheHits / totalRequests;
      return;
    }

    if (type === 'error') {
      const totalRequests = this.metrics.requestCount;
      const errors = Math.round(this.metrics.errorRate * (totalRequests - 1)) + 1;
      this.metrics.errorRate = errors / totalRequests;
      return;
    }

    if (type === 'success' && responseTime) {
      const totalRequests = this.metrics.requestCount;
      const totalTime = this.metrics.averageResponseTime * (totalRequests - 1) + responseTime;
      this.metrics.averageResponseTime = totalTime / totalRequests;
    }

    // Update memory usage (approximate)
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      errorRate: 0,
      lastReset: Date.now(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
      ttl: this.config.cacheTTL,
      calculatedSize: this.cache.calculatedSize,
    };
  }
}
