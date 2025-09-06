# Web Content MCP Server

A lean, high-performance MCP server for web content retrieval and semantic analysis, optimized for MacBook Air and resource-constrained environments.

## 🚀 Features

- **Virtual Website Understanding**: Analyze website structure, content, and purpose without visual rendering
- **Smart Caching**: Intelligent LRU cache with TTL and request deduplication
- **Resource Management**: Configurable concurrency limits and memory optimization
- **Semantic Analysis**: Extract meaning, topics, and categorize content automatically
- **Technology Detection**: Identify frameworks, libraries, CMS, and analytics tools
- **Performance Monitoring**: Built-in metrics and performance tracking
- **MacBook Air Optimized**: Designed for efficient operation on resource-constrained devices

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm start
```

## 🛠️ Configuration

Configure the server using environment variables:

```bash
# Performance settings (MacBook Air optimized defaults)
export WEB_CONTENT_MAX_CONCURRENT_REQUESTS=3
export WEB_CONTENT_REQUEST_TIMEOUT=10000
export WEB_CONTENT_MAX_CACHE_SIZE=100
export WEB_CONTENT_CACHE_TTL=3600
export WEB_CONTENT_MAX_CONTENT_LENGTH=2097152

# Features
export WEB_CONTENT_ENABLE_SEMANTIC_ANALYSIS=true
export WEB_CONTENT_ENABLE_PERFORMANCE_MONITORING=true

# User agent
export WEB_CONTENT_USER_AGENT="KiloCode-WebContent-MCP/1.0.0"
```

## 🔧 Available Tools

### `fetch_page_content`
Fetch and analyze complete web page content with semantic understanding.

```json
{
  "url": "https://docs.codegen.com/api-reference/agent-run-logs",
  "options": {
    "timeout": 15000,
    "followRedirects": true,
    "headers": {
      "Accept": "text/html,application/xhtml+xml"
    }
  }
}
```

**Returns**: Complete analysis including content, structure, metadata, technologies, and semantic insights.

### `get_page_summary`
Get a lightweight summary for quick understanding.

```json
{
  "url": "https://example.com",
  "options": {
    "timeout": 10000
  }
}
```

**Returns**: Title, description, main content (truncated), key points, category, and load time.

### `analyze_website_structure`
Analyze website structure including headings, links, forms, and technologies.

```json
{
  "url": "https://example.com"
}
```

**Returns**: Structured data about headings, navigation, forms, and detected technologies.

### `extract_page_metadata`
Extract metadata including SEO tags, Open Graph, and technical details.

```json
{
  "url": "https://example.com"
}
```

**Returns**: Meta tags, Open Graph data, Twitter Card info, and technical metadata.

### `detect_technologies`
Detect technologies, frameworks, and tools used by a website.

```json
{
  "url": "https://example.com"
}
```

**Returns**: Frameworks, libraries, CMS, analytics tools, and server information.

### `get_performance_metrics`
Get performance metrics and statistics for the MCP server.

```json
{}
```

**Returns**: HTTP client metrics, cache statistics, memory usage, and configuration.

### `clear_cache`
Clear the internal cache to free memory.

```json
{}
```

**Returns**: Confirmation message.

## 🎯 Use Cases

### Documentation Analysis
Perfect for analyzing API documentation like Codegen's:

```javascript
// Analyze Codegen API documentation
const result = await mcpClient.callTool('fetch_page_content', {
  url: 'https://docs.codegen.com/api-reference/agent-run-logs'
});

// Extract key information
const { title, description, content, semantic } = result;
console.log(`Purpose: ${semantic.purpose}`);
console.log(`Category: ${semantic.category}`);
console.log(`Main Topics: ${semantic.mainTopics.join(', ')}`);
```

### Website Technology Stack Analysis
```javascript
// Detect technologies used by a website
const tech = await mcpClient.callTool('detect_technologies', {
  url: 'https://example.com'
});

console.log(`Frameworks: ${tech.technologies.frameworks.join(', ')}`);
console.log(`CMS: ${tech.technologies.cms}`);
console.log(`Analytics: ${tech.technologies.analytics.join(', ')}`);
```

### Content Summarization
```javascript
// Get quick summary for multiple pages
const urls = [
  'https://blog.example.com/post1',
  'https://blog.example.com/post2',
  'https://blog.example.com/post3'
];

const summaries = await Promise.all(
  urls.map(url => mcpClient.callTool('get_page_summary', { url }))
);

summaries.forEach(summary => {
  console.log(`${summary.title}: ${summary.keyPoints[0]}`);
});
```

## 🏎️ Performance Optimization

### MacBook Air Specific Settings
The server is optimized for MacBook Air with these defaults:

- **Concurrent Requests**: 3 (prevents overwhelming the system)
- **Cache Size**: 100 entries (balances memory usage and performance)
- **Request Timeout**: 10 seconds (reasonable for most content)
- **Content Limit**: 2MB (prevents memory issues with large pages)

### Memory Management
- LRU cache with automatic eviction
- Request deduplication to prevent duplicate fetches
- Streaming content processing to minimize memory footprint
- Configurable resource limits

### Caching Strategy
- Intelligent caching based on ETags and Last-Modified headers
- TTL-based expiration with configurable duration
- Cache hit rate monitoring
- Manual cache clearing for memory management

## 📊 Monitoring

### Performance Metrics
Monitor server performance with built-in metrics:

```javascript
const metrics = await mcpClient.callTool('get_performance_metrics', {});

console.log(`Cache Hit Rate: ${metrics.httpClient.cacheHitRate * 100}%`);
console.log(`Average Response Time: ${metrics.httpClient.averageResponseTime}ms`);
console.log(`Memory Usage: ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
```

### Error Handling
The server provides detailed error information:

- **NetworkError**: Connection issues, DNS failures
- **TimeoutError**: Request timeouts
- **ParseError**: Content parsing failures
- **WebContentError**: General content-related errors

## 🔗 Integration with Kilo Code

Add to your MCP settings in Kilo Code:

```json
{
  "mcpServers": {
    "web-content": {
      "command": "node",
      "args": ["./packages/web-content-mcp/dist/index.js"],
      "env": {
        "WEB_CONTENT_MAX_CONCURRENT_REQUESTS": "3",
        "WEB_CONTENT_ENABLE_SEMANTIC_ANALYSIS": "true"
      }
    }
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Performance tests
npm run test:performance
```

## 📝 Examples

See the `examples/` directory for:
- Codegen API documentation analysis
- Technology stack detection
- Content summarization workflows
- Performance monitoring setups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for Kilo Code** - Optimized for MacBook Air performance and lean resource usage.
