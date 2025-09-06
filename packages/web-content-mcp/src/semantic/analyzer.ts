import { WebContentAnalysis } from '../types.js';

/**
 * Semantic analyzer for understanding website purpose and content
 * Provides virtual understanding without visual rendering
 */
export class SemanticAnalyzer {
  /**
   * Analyze content semantically to understand purpose and meaning
   */
  static analyze(analysis: Partial<WebContentAnalysis>): WebContentAnalysis['semantic'] {
    const { content, structure, metadata, technologies } = analysis;
    
    if (!content?.text) {
      return { mainTopics: [] };
    }

    return {
      purpose: this.determinePurpose(analysis),
      category: this.categorizeContent(analysis),
      mainTopics: this.extractMainTopics(content.text, structure?.headings || []),
      sentiment: this.analyzeSentiment(content.text),
      complexity: this.assessComplexity(analysis),
    };
  }

  /**
   * Determine the primary purpose of the website
   */
  private static determinePurpose(analysis: Partial<WebContentAnalysis>): string {
    const { content, structure, metadata, technologies } = analysis;
    const text = content?.text?.toLowerCase() || '';
    const title = analysis.title?.toLowerCase() || '';
    const description = analysis.description?.toLowerCase() || '';
    const headings = structure?.headings?.map(h => h.text.toLowerCase()).join(' ') || '';
    const allText = `${title} ${description} ${headings} ${text}`.toLowerCase();

    // E-commerce indicators
    if (this.containsKeywords(allText, ['shop', 'buy', 'cart', 'checkout', 'price', 'product', 'store', 'purchase']) ||
        technologies?.cms === 'Shopify' ||
        structure?.forms?.some(f => f.action?.includes('cart') || f.action?.includes('checkout'))) {
      return 'E-commerce/Shopping';
    }

    // Documentation/API indicators
    if (this.containsKeywords(allText, ['api', 'documentation', 'docs', 'reference', 'guide', 'tutorial', 'endpoint']) ||
        structure?.headings?.some(h => h.text.toLowerCase().includes('api')) ||
        title.includes('docs') || title.includes('documentation')) {
      return 'Documentation/API Reference';
    }

    // Blog/News indicators
    if (this.containsKeywords(allText, ['blog', 'article', 'post', 'news', 'published', 'author', 'read more']) ||
        metadata?.openGraph?.type === 'article' ||
        structure?.headings?.some(h => h.text.toLowerCase().includes('blog'))) {
      return 'Blog/News/Content';
    }

    // Portfolio/Personal indicators
    if (this.containsKeywords(allText, ['portfolio', 'about me', 'my work', 'projects', 'resume', 'cv', 'contact me']) ||
        structure?.headings?.some(h => ['about', 'portfolio', 'projects', 'contact'].includes(h.text.toLowerCase()))) {
      return 'Portfolio/Personal Website';
    }

    // Corporate/Business indicators
    if (this.containsKeywords(allText, ['company', 'business', 'services', 'solutions', 'enterprise', 'corporate', 'about us']) ||
        structure?.headings?.some(h => ['services', 'solutions', 'about us'].includes(h.text.toLowerCase()))) {
      return 'Corporate/Business Website';
    }

    // Landing page indicators
    if (this.containsKeywords(allText, ['sign up', 'get started', 'free trial', 'download', 'subscribe', 'join now']) ||
        structure?.forms?.length === 1 && structure.forms[0].inputs <= 3) {
      return 'Landing Page/Lead Generation';
    }

    // Educational indicators
    if (this.containsKeywords(allText, ['learn', 'course', 'education', 'tutorial', 'lesson', 'study', 'university', 'school']) ||
        structure?.headings?.some(h => h.text.toLowerCase().includes('course'))) {
      return 'Educational/Learning Platform';
    }

    return 'General Website';
  }

  /**
   * Categorize content by type
   */
  private static categorizeContent(analysis: Partial<WebContentAnalysis>): string {
    const { content, technologies } = analysis;
    const text = content?.text?.toLowerCase() || '';
    const wordCount = content?.wordCount || 0;

    // Technical content
    if (this.containsKeywords(text, ['code', 'programming', 'development', 'software', 'technical', 'api', 'framework']) ||
        technologies?.frameworks?.length > 0) {
      return 'Technical';
    }

    // Business content
    if (this.containsKeywords(text, ['business', 'marketing', 'sales', 'revenue', 'profit', 'strategy', 'management'])) {
      return 'Business';
    }

    // Creative content
    if (this.containsKeywords(text, ['design', 'creative', 'art', 'photography', 'visual', 'portfolio', 'gallery'])) {
      return 'Creative';
    }

    // News/Editorial
    if (this.containsKeywords(text, ['news', 'breaking', 'report', 'journalist', 'editor', 'published', 'updated'])) {
      return 'News/Editorial';
    }

    // Educational
    if (this.containsKeywords(text, ['education', 'learning', 'course', 'tutorial', 'guide', 'how to', 'step by step'])) {
      return 'Educational';
    }

    // Entertainment
    if (this.containsKeywords(text, ['entertainment', 'fun', 'game', 'movie', 'music', 'video', 'streaming'])) {
      return 'Entertainment';
    }

    // Health/Medical
    if (this.containsKeywords(text, ['health', 'medical', 'doctor', 'treatment', 'medicine', 'wellness', 'fitness'])) {
      return 'Health/Medical';
    }

    // Based on content length
    if (wordCount > 2000) {
      return 'Long-form Content';
    } else if (wordCount < 200) {
      return 'Minimal Content';
    }

    return 'General';
  }

  /**
   * Extract main topics from content
   */
  private static extractMainTopics(text: string, headings: Array<{ level: number; text: string }>): string[] {
    const topics = new Set<string>();

    // Extract from headings (high priority)
    headings.forEach(heading => {
      if (heading.level <= 3) { // Focus on h1, h2, h3
        const cleanHeading = this.cleanTopic(heading.text);
        if (cleanHeading.length > 2 && cleanHeading.length < 50) {
          topics.add(cleanHeading);
        }
      }
    });

    // Extract key phrases from content
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPhrases = this.extractKeyPhrases(sentences.slice(0, 10)); // First 10 sentences
    
    keyPhrases.forEach(phrase => {
      if (phrase.length > 3 && phrase.length < 40) {
        topics.add(phrase);
      }
    });

    return Array.from(topics).slice(0, 10); // Limit to top 10 topics
  }

  /**
   * Analyze sentiment of content
   */
  private static analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'best',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'success', 'win', 'achieve',
      'improve', 'better', 'quality', 'professional', 'reliable', 'trusted', 'innovative'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'problem',
      'issue', 'error', 'fail', 'failure', 'wrong', 'difficult', 'hard', 'impossible',
      'slow', 'expensive', 'cheap', 'poor', 'unreliable', 'broken', 'buggy'
    ];

    const words = text.toLowerCase().split(/\W+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 'neutral';

    const positiveRatio = positiveCount / totalSentimentWords;
    if (positiveRatio > 0.6) return 'positive';
    if (positiveRatio < 0.4) return 'negative';
    return 'neutral';
  }

  /**
   * Assess content complexity
   */
  private static assessComplexity(analysis: Partial<WebContentAnalysis>): 'low' | 'medium' | 'high' {
    const { content, structure, technologies } = analysis;
    
    let complexityScore = 0;

    // Word count factor
    const wordCount = content?.wordCount || 0;
    if (wordCount > 2000) complexityScore += 2;
    else if (wordCount > 500) complexityScore += 1;

    // Structure complexity
    const headingLevels = new Set(structure?.headings?.map(h => h.level) || []).size;
    if (headingLevels > 3) complexityScore += 2;
    else if (headingLevels > 1) complexityScore += 1;

    // Link complexity
    const linkCount = structure?.links?.length || 0;
    if (linkCount > 50) complexityScore += 2;
    else if (linkCount > 20) complexityScore += 1;

    // Technology complexity
    const techCount = (technologies?.frameworks?.length || 0) + 
                     (technologies?.libraries?.length || 0);
    if (techCount > 5) complexityScore += 2;
    else if (techCount > 2) complexityScore += 1;

    // Form complexity
    const formComplexity = structure?.forms?.reduce((sum, form) => sum + form.inputs, 0) || 0;
    if (formComplexity > 10) complexityScore += 2;
    else if (formComplexity > 3) complexityScore += 1;

    // Technical vocabulary
    const text = content?.text?.toLowerCase() || '';
    const technicalTerms = ['api', 'database', 'server', 'client', 'framework', 'library', 'algorithm', 'protocol'];
    const technicalCount = technicalTerms.filter(term => text.includes(term)).length;
    if (technicalCount > 5) complexityScore += 2;
    else if (technicalCount > 2) complexityScore += 1;

    if (complexityScore >= 6) return 'high';
    if (complexityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Check if text contains any of the keywords
   */
  private static containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Clean topic text for better readability
   */
  private static cleanTopic(topic: string): string {
    return topic
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract key phrases from sentences
   */
  private static extractKeyPhrases(sentences: string[]): string[] {
    const phrases = new Set<string>();
    
    sentences.forEach(sentence => {
      // Look for noun phrases (simplified approach)
      const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      
      // Extract 2-3 word phrases that might be important
      for (let i = 0; i < words.length - 1; i++) {
        const twoWordPhrase = `${words[i]} ${words[i + 1]}`;
        if (this.isLikelyKeyPhrase(twoWordPhrase)) {
          phrases.add(this.cleanTopic(twoWordPhrase));
        }
        
        if (i < words.length - 2) {
          const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (this.isLikelyKeyPhrase(threeWordPhrase)) {
            phrases.add(this.cleanTopic(threeWordPhrase));
          }
        }
      }
    });

    return Array.from(phrases);
  }

  /**
   * Determine if a phrase is likely to be a key phrase
   */
  private static isLikelyKeyPhrase(phrase: string): boolean {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    const words = phrase.split(' ');
    
    // Skip if starts with common word
    if (commonWords.includes(words[0])) return false;
    
    // Skip if all words are common
    if (words.every(word => commonWords.includes(word))) return false;
    
    // Skip if contains numbers only
    if (words.some(word => /^\d+$/.test(word))) return false;
    
    return true;
  }
}
