/**
 * Document Parser
 * 
 * Parses various document formats (PDF, DOC, TXT, MD).
 * Extracts text content for processing.
 * 
 * Note: PDF parsing is done client-side only to avoid Node.js compatibility issues.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedDocument {
  id: string;
  filename: string;
  type: 'pdf' | 'doc' | 'txt' | 'md' | 'unknown';
  content: string;
  metadata: {
    title?: string;
    author?: string;
    createdAt?: Date;
    pageCount?: number;
    wordCount: number;
  };
  parseError?: string;
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parse a text file
 */
async function parseTextFile(file: File): Promise<string> {
  return await file.text();
}

/**
 * Parse a markdown file (same as text but we can extract structure)
 */
async function parseMarkdownFile(file: File): Promise<string> {
  const content = await file.text();
  return content;
}

/**
 * Parse a PDF file using PDF.js (client-side only)
 */
async function parsePDFFile(file: File): Promise<{ content: string; pageCount: number }> {
  // Only run on client side
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in the browser');
  }
  
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    
    return {
      content: textParts.join('\n\n'),
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse a DOC/DOCX file
 * Note: Full DOC parsing requires mammoth.js or similar library
 * For now, we'll try to read as text or return an error
 */
async function parseDocFile(file: File): Promise<string> {
  // Try to read as text (works for some simple doc files)
  try {
    const text = await file.text();
    // Check if it looks like actual text content
    if (text && text.length > 0 && !text.includes('\x00')) {
      return text;
    }
  } catch {
    // Ignore and fall through to error
  }
  
  throw new Error('DOC/DOCX files require conversion. Please export as PDF or TXT first.');
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  let type: ParsedDocument['type'] = 'unknown';
  let content = '';
  let parseError: string | undefined;
  let pageCount: number | undefined;
  
  try {
    switch (ext) {
      case 'txt':
        type = 'txt';
        content = await parseTextFile(file);
        break;
        
      case 'md':
      case 'markdown':
        type = 'md';
        content = await parseMarkdownFile(file);
        break;
        
      case 'pdf':
        type = 'pdf';
        const pdfResult = await parsePDFFile(file);
        content = pdfResult.content;
        pageCount = pdfResult.pageCount;
        break;
        
      case 'doc':
      case 'docx':
        type = 'doc';
        content = await parseDocFile(file);
        break;
        
      default:
        // Try to read as text
        try {
          content = await file.text();
          type = 'txt';
        } catch {
          parseError = `Unsupported file type: ${ext}`;
        }
    }
  } catch (error) {
    parseError = error instanceof Error ? error.message : 'Failed to parse document';
  }
  
  // Calculate word count
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  
  // Try to extract title from content
  let title: string | undefined;
  const firstLine = content.split('\n')[0]?.trim();
  if (firstLine && firstLine.length < 100) {
    // Remove markdown heading markers
    title = firstLine.replace(/^#+\s*/, '');
  }
  
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filename,
    type,
    content,
    metadata: {
      title: title || filename.replace(/\.[^.]+$/, ''),
      wordCount,
      pageCount,
    },
    parseError,
  };
}

/**
 * Parse multiple documents
 */
export async function parseDocuments(files: File[]): Promise<ParsedDocument[]> {
  const results: ParsedDocument[] = [];
  
  for (const file of files) {
    const doc = await parseDocument(file);
    results.push(doc);
  }
  
  return results;
}

/**
 * Extract all text from parsed documents
 */
export function extractAllText(documents: ParsedDocument[]): string {
  return documents
    .filter(doc => !doc.parseError)
    .map(doc => `# ${doc.metadata.title}\n\n${doc.content}`)
    .join('\n\n---\n\n');
}
