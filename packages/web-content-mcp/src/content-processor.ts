import { Response } from 'node-fetch';
import { HtmlParser } from './parsers/html-parser.js';
import { SemanticAnalyzer } from './semantic/analyzer.js';
import { 
  WebContentAnalysis, 
  WebContentSummary, 
  Config, 
  ParseError 
} from './types.js';

/**
 * Content processor that orchestrates parsing and analysis
 * Optimized for streaming and memory efficiency
 */
export class ContentProcessor {
  constructor(private config: Config) {}

  /**
   * Process web response into full analysis
   */
  async processResponse(response: Response, startTime: number): Promise<WebContentAnalysis> {
    try {
      const html = await response.text();
      const url = response.url;

      // Parse HTML structure and content
      const parsed = HtmlParser.parse(html, url);

      // Add performance metrics
      const performance = {
        loadTime: Date.now() - startTime,
        contentSize: html.length,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      };

      // Create base analysis
      const baseAnalysis: Partial<WebContentAnalysis> = {
        ...parsed,
        performance,
      };

      // Add semantic analysis if enabled
      let semantic = { mainTopics: [] };
      if (this.config.enableSemanticAnalysis) {
        semantic = SemanticAnalyzer.analyze(baseAnalysis);
      }

      return {
        url,
        title: parsed.title,
        description: parsed.description,
        content: parsed.content || { text: '', html, wordCount: 0, readingTime: 0 },
        structure: parsed.structure || { headings: [], links: [], images: [], forms: [] },
        metadata: parsed.metadata || {},
        technologies: parsed.technologies || { frameworks: [], libraries: [], analytics: [] },
        performance,
        semantic,
      };

    } catch (error) {
      throw new ParseError(`Failed to process content: ${error.message}`, response.url);
    }
  }

  /**
   * Process response into lightweight summary
   */
  async processSummary(response: Response, startTime: number): Promise<WebContentSummary> {
    try {
      const html = await response.text();
      const url = response.url;

      // Quick parse for essential information
      const parsed = HtmlParser.parse(html, url);
      
      // Extract key points from content
      const keyPoints = this.extractKeyPoints(parsed.content?.text || '');
      
      // Determine category quickly
      let category: string | undefined;
      if (this.config.enableSemanticAnalysis) {
        const semantic = SemanticAnalyzer.analyze(parsed);
        category = semantic.category;
      }

      return {
        url,
        title: parsed.title,
        description: parsed.description,
        mainContent: this.truncateContent(parsed.content?.text || '', 1000),
        keyPoints,
        category,
        loadTime: Date.now() - startTime,
      };

    } catch (error) {
      throw new ParseError(`Failed to process summary: ${error.message}`, response.url);
    }
  }

  /**
   * Extract key points from content text
   */
  private extractKeyPoints(text: string): string[] {
    if (!text || text.length < 100) return [];

    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200);

    // Score sentences based on position and content
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;
      
      // Position scoring (earlier sentences are more important)
      if (index < 3) score += 3;
      else if (index < 10) score += 2;
      else if (index < 20) score += 1;

      // Length scoring (medium length sentences preferred)
      if (sentence.length > 50 && sentence.length < 150) score += 2;
      else if (sentence.length > 30 && sentence.length < 200) score += 1;

      // Keyword scoring
      const importantWords = [
        'important', 'key', 'main', 'primary', 'essential', 'critical',
        'first', 'second', 'third', 'finally', 'conclusion', 'summary',
        'because', 'therefore', 'however', 'moreover', 'furthermore'
      ];
      
      const lowerSentence = sentence.toLowerCase();
      importantWords.forEach(word => {
        if (lowerSentence.includes(word)) score += 1;
      });

      // Avoid sentences with too many numbers or special characters
      if (/\d{4,}/.test(sentence) || sentence.split(/\W+/).length < 5) {
        score -= 2;
      }

      return { sentence, score };
    });

    // Return top 5 sentences
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.sentence);
  }

  /**
   * Truncate content to specified length while preserving word boundaries
   */
  private truncateContent(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Validate content size and type
   */
  validateContent(response: Response): boolean {
    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    // Check content type
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return false;
    }

    // Check content size
    if (contentLength > this.config.maxContentLength) {
      return false;
    }

    return true;
  }

  /**
   * Extract metadata only (lightweight operation)
   */
  async extractMetadata(response: Response): Promise<Partial<WebContentAnalysis>> {
    try {
      const html = await response.text();
      const url = response.url;

      // Parse only metadata and basic info
      const parsed = HtmlParser.parse(html, url);

      return {
        url,
        title: parsed.title,
        description: parsed.description,
        metadata: parsed.metadata,
        performance: {
          loadTime: 0,
          contentSize: html.length,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        },
      };

    } catch (error) {
      throw new ParseError(`Failed to extract metadata: ${error.message}`, response.url);
    }
  }

  /**
   * Check if content has changed (for caching)
   */
  hasContentChanged(response: Response, cachedEtag?: string, cachedLastModified?: string): boolean {
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    if (etag && cachedEtag && etag === cachedEtag) {
      return false;
    }

    if (lastModified && cachedLastModified && lastModified === cachedLastModified) {
      return false;
    }

    return true;
  }
}
