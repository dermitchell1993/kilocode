/**
 * Example: Analyzing Codegen API Documentation
 * 
 * This example demonstrates how to use the Web Content MCP Server
 * to analyze and understand the Codegen API documentation.
 */

import { WebContentMcpServer } from '../src/index.js';

async function analyzeCodegenApiDocs() {
  console.log('🚀 Starting Codegen API Documentation Analysis...\n');

  // Initialize the MCP server with MacBook Air optimized settings
  const server = new WebContentMcpServer({
    maxConcurrentRequests: 3,
    requestTimeout: 15000, // Longer timeout for documentation
    maxCacheSize: 50,
    enableSemanticAnalysis: true,
    enablePerformanceMonitoring: true,
  });

  try {
    // Start the server
    await server.start();

    // Analyze the main API documentation page
    console.log('📖 Fetching Codegen API documentation...');
    const apiDocsUrl = 'https://docs.codegen.com/api-reference/agent-run-logs';
    
    // Get complete analysis
    const fullAnalysis = await server['handleFetchPageContent']({
      url: apiDocsUrl,
      options: {
        timeout: 15000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      }
    });

    const analysis = JSON.parse(fullAnalysis.content[0].text);

    // Display key insights
    console.log('\n📊 Analysis Results:');
    console.log('===================');
    console.log(`📄 Title: ${analysis.title}`);
    console.log(`📝 Description: ${analysis.description}`);
    console.log(`🎯 Purpose: ${analysis.semantic.purpose}`);
    console.log(`📂 Category: ${analysis.semantic.category}`);
    console.log(`📈 Complexity: ${analysis.semantic.complexity}`);
    console.log(`⏱️  Load Time: ${analysis.performance.loadTime}ms`);
    console.log(`📏 Content Size: ${Math.round(analysis.performance.contentSize / 1024)}KB`);
    console.log(`📖 Word Count: ${analysis.content.wordCount}`);
    console.log(`⏰ Reading Time: ${analysis.content.readingTime} minutes`);

    // Show main topics
    console.log('\n🏷️  Main Topics:');
    analysis.semantic.mainTopics.slice(0, 5).forEach((topic: string, index: number) => {
      console.log(`   ${index + 1}. ${topic}`);
    });

    // Show detected technologies
    console.log('\n🔧 Detected Technologies:');
    if (analysis.technologies.frameworks.length > 0) {
      console.log(`   Frameworks: ${analysis.technologies.frameworks.join(', ')}`);
    }
    if (analysis.technologies.libraries.length > 0) {
      console.log(`   Libraries: ${analysis.technologies.libraries.join(', ')}`);
    }
    if (analysis.technologies.cms) {
      console.log(`   CMS: ${analysis.technologies.cms}`);
    }

    // Show structure overview
    console.log('\n🏗️  Page Structure:');
    console.log(`   📋 Headings: ${analysis.structure.headings.length}`);
    console.log(`   🔗 Links: ${analysis.structure.links.length}`);
    console.log(`   🖼️  Images: ${analysis.structure.images.length}`);
    console.log(`   📝 Forms: ${analysis.structure.forms.length}`);

    // Show key headings
    console.log('\n📋 Key Headings:');
    analysis.structure.headings
      .filter((h: any) => h.level <= 3)
      .slice(0, 8)
      .forEach((heading: any) => {
        const indent = '  '.repeat(heading.level - 1);
        console.log(`   ${indent}H${heading.level}: ${heading.text}`);
      });

    // Get a quick summary for comparison
    console.log('\n📄 Quick Summary:');
    const summaryResult = await server['handleGetPageSummary']({
      url: apiDocsUrl
    });

    const summary = JSON.parse(summaryResult.content[0].text);
    console.log(`   Main Content Preview: ${summary.mainContent.substring(0, 200)}...`);
    
    console.log('\n🔑 Key Points:');
    summary.keyPoints.forEach((point: string, index: number) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    // Analyze related documentation pages
    console.log('\n🔍 Analyzing Related Pages...');
    const relatedUrls = analysis.structure.links
      .filter((link: any) => 
        link.internal && 
        link.href.includes('/api-reference/') &&
        link.href !== apiDocsUrl
      )
      .slice(0, 3)
      .map((link: any) => link.href);

    for (const url of relatedUrls) {
      try {
        const relatedSummary = await server['handleGetPageSummary']({ url });
        const related = JSON.parse(relatedSummary.content[0].text);
        console.log(`   📄 ${related.title}: ${related.category || 'Documentation'}`);
      } catch (error) {
        console.log(`   ❌ Failed to analyze: ${url}`);
      }
    }

    // Get performance metrics
    console.log('\n📊 Server Performance:');
    const metricsResult = await server['handleGetPerformanceMetrics']();
    const metrics = JSON.parse(metricsResult.content[0].text);
    
    console.log(`   🎯 Cache Hit Rate: ${Math.round(metrics.httpClient.cacheHitRate * 100)}%`);
    console.log(`   ⚡ Avg Response Time: ${Math.round(metrics.httpClient.averageResponseTime)}ms`);
    console.log(`   💾 Memory Usage: ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   📈 Total Requests: ${metrics.httpClient.requestCount}`);

    console.log('\n✅ Analysis Complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  } finally {
    await server.stop();
  }
}

// Example of using the server for multiple documentation pages
async function batchAnalyzeDocumentation() {
  console.log('\n🔄 Batch Documentation Analysis...\n');

  const server = new WebContentMcpServer({
    maxConcurrentRequests: 2, // Lower for batch processing
    enableSemanticAnalysis: true,
  });

  const docUrls = [
    'https://docs.codegen.com/api-reference/agent-run-logs',
    'https://docs.codegen.com/getting-started',
    'https://docs.codegen.com/features/mcp',
  ];

  try {
    await server.start();

    console.log('📚 Analyzing multiple documentation pages...');
    
    const results = await Promise.allSettled(
      docUrls.map(async (url) => {
        const result = await server['handleGetPageSummary']({ url });
        return {
          url,
          summary: JSON.parse(result.content[0].text)
        };
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { url, summary } = result.value;
        console.log(`\n📄 ${summary.title}`);
        console.log(`   🔗 URL: ${url}`);
        console.log(`   📂 Category: ${summary.category || 'Documentation'}`);
        console.log(`   ⏱️  Load Time: ${summary.loadTime}ms`);
        console.log(`   🔑 Key Point: ${summary.keyPoints[0] || 'No key points extracted'}`);
      } else {
        console.log(`\n❌ Failed to analyze: ${docUrls[index]}`);
        console.log(`   Error: ${result.reason.message}`);
      }
    });

  } catch (error) {
    console.error('❌ Batch analysis error:', error.message);
  } finally {
    await server.stop();
  }
}

// Run the examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Web Content MCP Server - Codegen API Analysis Example\n');
  
  analyzeCodegenApiDocs()
    .then(() => batchAnalyzeDocumentation())
    .then(() => {
      console.log('\n🎉 All examples completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}
