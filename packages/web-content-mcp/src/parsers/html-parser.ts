import * as cheerio from 'cheerio';
import { WebContentAnalysis } from '../types.js';

/**
 * HTML parser for extracting structured content and metadata
 * Optimized for performance and memory efficiency
 */
export class HtmlParser {
  /**
   * Parse HTML content and extract structured information
   */
  static parse(html: string, url: string): Partial<WebContentAnalysis> {
    const $ = cheerio.load(html, {
      // Optimize for performance
      xmlMode: false,
      decodeEntities: true,
      lowerCaseAttributeNames: true,
    });

    return {
      url,
      title: this.extractTitle($),
      description: this.extractDescription($),
      content: this.extractContent($, html),
      structure: this.extractStructure($, url),
      metadata: this.extractMetadata($),
      technologies: this.detectTechnologies($, html),
    };
  }

  /**
   * Extract page title
   */
  private static extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try multiple sources for title
    const sources = [
      $('title').first().text(),
      $('meta[property="og:title"]').attr('content'),
      $('meta[name="twitter:title"]').attr('content'),
      $('h1').first().text(),
    ];

    return sources.find(title => title && title.trim().length > 0)?.trim();
  }

  /**
   * Extract page description
   */
  private static extractDescription($: cheerio.CheerioAPI): string | undefined {
    const sources = [
      $('meta[name="description"]').attr('content'),
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="twitter:description"]').attr('content'),
    ];

    return sources.find(desc => desc && desc.trim().length > 0)?.trim();
  }

  /**
   * Extract and clean main content
   */
  private static extractContent($: cheerio.CheerioAPI, html: string) {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
    
    // Try to find main content area
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '#main',
      '.post-content',
      '.entry-content',
    ];

    let contentElement = $('body');
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 100) {
        contentElement = element;
        break;
      }
    }

    const text = contentElement.text().replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      text,
      html,
      wordCount,
      readingTime,
    };
  }

  /**
   * Extract page structure (headings, links, images, forms)
   */
  private static extractStructure($: cheerio.CheerioAPI, baseUrl: string) {
    const baseUrlObj = new URL(baseUrl);

    // Extract headings
    const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => ({
      level: parseInt(el.tagName.charAt(1)),
      text: $(el).text().trim(),
    })).get();

    // Extract links
    const links = $('a[href]').map((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      let isInternal = false;

      try {
        const linkUrl = new URL(href, baseUrl);
        isInternal = linkUrl.hostname === baseUrlObj.hostname;
      } catch {
        // Relative or invalid URL - consider internal
        isInternal = !href.startsWith('http');
      }

      return { href, text, internal: isInternal };
    }).get();

    // Extract images
    const images = $('img[src]').map((_, el) => ({
      src: $(el).attr('src') || '',
      alt: $(el).attr('alt'),
      title: $(el).attr('title'),
    })).get();

    // Extract forms
    const forms = $('form').map((_, el) => ({
      action: $(el).attr('action'),
      method: $(el).attr('method')?.toLowerCase() || 'get',
      inputs: $(el).find('input, textarea, select').length,
    })).get();

    return {
      headings,
      links,
      images,
      forms,
    };
  }

  /**
   * Extract metadata from meta tags
   */
  private static extractMetadata($: cheerio.CheerioAPI) {
    const metadata: any = {};

    // Basic meta tags
    metadata.charset = $('meta[charset]').attr('charset') || 
                      $('meta[http-equiv="content-type"]').attr('content')?.match(/charset=([^;]+)/)?.[1];
    metadata.language = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
    metadata.author = $('meta[name="author"]').attr('content');
    metadata.viewport = $('meta[name="viewport"]').attr('content');
    metadata.robots = $('meta[name="robots"]').attr('content');
    metadata.canonical = $('link[rel="canonical"]').attr('href');

    // Keywords
    const keywordsContent = $('meta[name="keywords"]').attr('content');
    if (keywordsContent) {
      metadata.keywords = keywordsContent.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    // Open Graph
    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '');
      const content = $(el).attr('content');
      if (property && content) {
        openGraph[property] = content;
      }
    });
    if (Object.keys(openGraph).length > 0) {
      metadata.openGraph = openGraph;
    }

    // Twitter Card
    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '');
      const content = $(el).attr('content');
      if (name && content) {
        twitterCard[name] = content;
      }
    });
    if (Object.keys(twitterCard).length > 0) {
      metadata.twitterCard = twitterCard;
    }

    return metadata;
  }

  /**
   * Detect technologies used on the page
   */
  private static detectTechnologies($: cheerio.CheerioAPI, html: string) {
    const technologies = {
      frameworks: [] as string[],
      libraries: [] as string[],
      analytics: [] as string[],
      cms: undefined as string | undefined,
      server: undefined as string | undefined,
    };

    // Framework detection patterns
    const frameworkPatterns = [
      { name: 'React', patterns: ['react', '_react', 'ReactDOM'] },
      { name: 'Vue.js', patterns: ['vue', 'Vue', '__vue__'] },
      { name: 'Angular', patterns: ['angular', 'ng-', 'Angular'] },
      { name: 'jQuery', patterns: ['jquery', 'jQuery', '$'] },
      { name: 'Bootstrap', patterns: ['bootstrap', 'Bootstrap'] },
      { name: 'Tailwind CSS', patterns: ['tailwind', 'tw-'] },
      { name: 'Next.js', patterns: ['next', '_next', '__next'] },
      { name: 'Nuxt.js', patterns: ['nuxt', '_nuxt', '__nuxt'] },
    ];

    // Library detection
    const libraryPatterns = [
      { name: 'Lodash', patterns: ['lodash', '_'] },
      { name: 'Moment.js', patterns: ['moment'] },
      { name: 'Chart.js', patterns: ['chart.js', 'Chart'] },
      { name: 'D3.js', patterns: ['d3', 'D3'] },
      { name: 'Three.js', patterns: ['three.js', 'THREE'] },
    ];

    // Analytics detection
    const analyticsPatterns = [
      { name: 'Google Analytics', patterns: ['google-analytics', 'gtag', 'ga('] },
      { name: 'Google Tag Manager', patterns: ['googletagmanager', 'GTM-'] },
      { name: 'Facebook Pixel', patterns: ['facebook.net/tr', 'fbq('] },
      { name: 'Hotjar', patterns: ['hotjar'] },
      { name: 'Mixpanel', patterns: ['mixpanel'] },
    ];

    // CMS detection
    const cmsPatterns = [
      { name: 'WordPress', patterns: ['wp-content', 'wp-includes', 'wordpress'] },
      { name: 'Drupal', patterns: ['drupal', '/sites/default/'] },
      { name: 'Joomla', patterns: ['joomla', '/components/com_'] },
      { name: 'Shopify', patterns: ['shopify', 'cdn.shopify.com'] },
      { name: 'Squarespace', patterns: ['squarespace'] },
      { name: 'Wix', patterns: ['wix.com', 'wixstatic.com'] },
    ];

    // Check HTML content and script sources
    const allContent = html.toLowerCase();
    const scriptSources = $('script[src]').map((_, el) => $(el).attr('src') || '').get().join(' ').toLowerCase();
    const linkHrefs = $('link[href]').map((_, el) => $(el).attr('href') || '').get().join(' ').toLowerCase();
    const searchContent = `${allContent} ${scriptSources} ${linkHrefs}`;

    // Detect frameworks
    frameworkPatterns.forEach(({ name, patterns }) => {
      if (patterns.some(pattern => searchContent.includes(pattern.toLowerCase()))) {
        technologies.frameworks.push(name);
      }
    });

    // Detect libraries
    libraryPatterns.forEach(({ name, patterns }) => {
      if (patterns.some(pattern => searchContent.includes(pattern.toLowerCase()))) {
        technologies.libraries.push(name);
      }
    });

    // Detect analytics
    analyticsPatterns.forEach(({ name, patterns }) => {
      if (patterns.some(pattern => searchContent.includes(pattern.toLowerCase()))) {
        technologies.analytics.push(name);
      }
    });

    // Detect CMS
    for (const { name, patterns } of cmsPatterns) {
      if (patterns.some(pattern => searchContent.includes(pattern.toLowerCase()))) {
        technologies.cms = name;
        break;
      }
    }

    // Detect server from meta tags or headers
    const generator = $('meta[name="generator"]').attr('content');
    if (generator) {
      technologies.server = generator;
    }

    return technologies;
  }
}
