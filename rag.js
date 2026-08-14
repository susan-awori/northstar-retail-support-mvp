/**
 * ============================================================================
 * NORTHSTAR RETAIL CO. - POLICY RAG RETRIEVAL ENGINE (rag.js)
 * ============================================================================
 * 
 * BEGINNER ARCHITECTURE NOTE:
 * What is RAG (Retrieval-Augmented Generation)?
 * Standard AI models can "hallucinate" or answer with out-of-date generic knowledge.
 * RAG fixes this by first fetching (retrieving) official reference documents (chunks)
 * from a trusted database, and forcing the AI to answer using ONLY those retrieved chunks.
 * 
 * DEMO VS PRODUCTION DIFFERENCES (PLEASE READ):
 * 1. DEMO IMPLEMENTATION (This File):
 *    - Uses simple keyword matching and word overlap scoring inside the browser.
 *    - Reads 3 static Markdown files in the /policies folder.
 *    - Requires zero external services, APIs, or vector databases.2. PRODUCTION IMPLEMENTATION (Phase 2 Go-Live):
 *    - Uses real semantic vector embeddings (e.g. OpenAI text-embedding-3 or Claude embeddings API).
 *    - Stores chunks in a Vector Database (e.g., Pinecone, PGVector, or Qdrant).
 *    - Syncs automatically whenever Northstar updates their live CMS/Help Center pages.
 * 
 * SCOPE BOUNDARY RULE:
 * - RAG is used ONLY for general policy and FAQ questions (e.g. "Can I change my address?").
 * - Structured transactional data (Order Status, Return Eligibility for #NS-123456, Refund Tracking)
 *   MUST stay on the structured mockData.json lookup handlers in app.js for 100% precision.
 * ============================================================================
 */

class PolicyRAG {
  constructor() {
    // Array of indexed policy chunks: { file: string, title: string, text: string, keywords: Set }
    this.chunks = [];
    this.isInitialized = false;

    // Common English stop words to ignore during keyword scoring
    this.stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
      'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
      'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
      'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
      'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
      'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
      'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only',
      'or', 'other', 'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should',
      'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then',
      'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
      'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
      'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
    ]);
  }
 /**
   * Initializes the RAG engine by fetching and indexing the policy Markdown files.
   */
  async init() {
    if (this.isInitialized) return;

    const policyFiles = [
      { name: 'Returns Policy', path: 'policies/returns-policy.md' },
      { name: 'Shipping Policy', path: 'policies/shipping-policy.md' },
      { name: 'FAQ', path: 'policies/faq.md' }
    ];

    try {
      for (const policy of policyFiles) {
        const response = await fetch(policy.path);
        if (!response.ok) {
          console.warn(`[RAG Warning] Could not fetch ${policy.path}. Status: ${response.status}`);
          continue;
        }
        const text = await response.text();
        this.chunkAndIndexFile(policy.name, text);
      }
          this.isInitialized = true;
      console.log(`[RAG System] Successfully indexed ${this.chunks.length} policy chunks.`);
    } catch (err) {
      console.error('[RAG Error] Failed to initialize policy RAG index:', err);
    }
  }
 /**
   * Splits a Markdown document into readable paragraph chunks and indexes their terms.
   * @param {string} fileName - Friendly label of the policy document
   * @param {string} rawMarkdown - Unprocessed Markdown string
   */
  chunkAndIndexFile(fileName, rawMarkdown) {
    // Split Markdown document by double line breaks (paragraphs) or headers
    const rawParagraphs = rawMarkdown
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30); // Skip tiny headings or empty lines

    let currentSectionTitle = fileName;

    for (const paragraph of rawParagraphs) {
      // Check if paragraph is a Markdown heading (e.g. ### Can I change my address?)
      if (paragraph.startsWith('#')) {
        currentSectionTitle = paragraph.replace(/^#+\s*/, '').trim();
      }

      // Extract cleaned word tokens for keyword matching
      const words = this.tokenize(paragraph);

      this.chunks.push({
        file: fileName,
        title: currentSectionTitle,
        text: paragraph,
        keywords: new Set(words)
      });
    }
  }