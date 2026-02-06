/**
 * Notion Export Parser
 * 
 * Parses Notion workspace exports (ZIP files containing markdown + assets).
 * Extracts structured content from pages, databases, and nested structures.
 */

import JSZip from 'jszip';

// ============================================================================
// TYPES
// ============================================================================

export interface NotionPage {
  id: string;
  title: string;
  path: string;
  content: string;
  type: 'page' | 'database' | 'database-entry';
  parentPath: string | null;
  properties: Record<string, string>;
  createdAt?: Date;
  lastEditedAt?: Date;
}

export interface NotionDatabase {
  id: string;
  title: string;
  path: string;
  entries: NotionPage[];
  schema: DatabaseSchema;
}

export interface DatabaseSchema {
  columns: {
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'checkbox' | 'url' | 'email' | 'phone' | 'relation' | 'unknown';
  }[];
}

export interface NotionExport {
  pages: NotionPage[];
  databases: NotionDatabase[];
  totalFiles: number;
  parseErrors: string[];
}

export interface ParsedContent {
  title: string;
  headings: string[];
  paragraphs: string[];
  lists: string[][];
  links: { text: string; url: string }[];
  codeBlocks: { language: string; code: string }[];
  tables: string[][];
  rawText: string;
}

// ============================================================================
// MARKDOWN PARSING
// ============================================================================

function parseMarkdownContent(markdown: string): ParsedContent {
  const lines = markdown.split('\n');
  const result: ParsedContent = {
    title: '',
    headings: [],
    paragraphs: [],
    lists: [],
    links: [],
    codeBlocks: [],
    tables: [],
    rawText: '',
  };
  
  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = '';
  let inTable = false;
  let currentTable: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.codeBlocks.push({ language: codeBlockLang, code: codeBlockContent.trim() });
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // Title (first h1)
    if (line.startsWith('# ') && !result.title) {
      result.title = line.slice(2).trim();
      continue;
    }
    
    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      result.headings.push(headingMatch[2].trim());
      continue;
    }
    
    // Tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      // Skip separator rows
      if (!line.match(/^\|[\s-:|]+\|$/)) {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        currentTable.push(cells.join(' | '));
      }
      continue;
    } else if (inTable) {
      if (currentTable.length > 0) {
        result.tables.push(currentTable);
      }
      inTable = false;
      currentTable = [];
    }
    
    // Lists
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      currentList.push(listMatch[2].trim());
      continue;
    } else if (currentList.length > 0) {
      result.lists.push([...currentList]);
      currentList = [];
    }
    
    // Links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      result.links.push({ text: linkMatch[1], url: linkMatch[2] });
    }
    
    // Paragraphs (non-empty lines that aren't special)
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('|')) {
      // Remove markdown formatting for raw text
      const cleanLine = trimmedLine
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
        .replace(/\*([^*]+)\*/g, '$1')       // Italic
        .replace(/`([^`]+)`/g, '$1')         // Inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
      
      if (cleanLine) {
        result.paragraphs.push(cleanLine);
      }
    }
  }
  
  // Flush remaining lists
  if (currentList.length > 0) {
    result.lists.push(currentList);
  }
  
  // Build raw text
  result.rawText = [
    result.title,
    ...result.headings,
    ...result.paragraphs,
    ...result.lists.flat(),
  ].filter(Boolean).join('\n');
  
  return result;
}

// ============================================================================
// CSV PARSING (for Notion databases)
// ============================================================================

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  
  return { headers, rows };
}

// ============================================================================
// MAIN PARSER
// ============================================================================

export async function parseNotionExport(file: File): Promise<NotionExport> {
  const result: NotionExport = {
    pages: [],
    databases: [],
    totalFiles: 0,
    parseErrors: [],
  };
  
  try {
    const zip = await JSZip.loadAsync(file);
    const files = Object.keys(zip.files);
    result.totalFiles = files.length;
    
    // Group files by directory to identify databases
    const filesByDir = new Map<string, string[]>();
    
    for (const filePath of files) {
      if (zip.files[filePath].dir) continue;
      
      const dir = filePath.split('/').slice(0, -1).join('/');
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, []);
      }
      filesByDir.get(dir)!.push(filePath);
    }
    
    // Process each file
    for (const filePath of files) {
      const zipFile = zip.files[filePath];
      if (zipFile.dir) continue;
      
      const fileName = filePath.split('/').pop() || '';
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      try {
        if (ext === 'md') {
          // Markdown file - could be a page or database entry
          const content = await zipFile.async('string');
          const parsed = parseMarkdownContent(content);
          
          // Extract title from filename if not in content
          const title = parsed.title || fileName.replace('.md', '').replace(/ [a-f0-9]{32}$/, '');
          
          // Determine if this is a database entry (has CSV sibling)
          const dir = filePath.split('/').slice(0, -1).join('/');
          const siblingFiles = filesByDir.get(dir) || [];
          const hasCSV = siblingFiles.some(f => f.endsWith('.csv'));
          
          const page: NotionPage = {
            id: filePath.replace(/[^a-zA-Z0-9]/g, '-'),
            title,
            path: filePath,
            content: parsed.rawText,
            type: hasCSV ? 'database-entry' : 'page',
            parentPath: dir || null,
            properties: {},
          };
          
          result.pages.push(page);
          
        } else if (ext === 'csv') {
          // CSV file - database export
          const content = await zipFile.async('string');
          const { headers, rows } = parseCSV(content);
          
          const dbTitle = fileName.replace('.csv', '').replace(/ [a-f0-9]{32}$/, '');
          const dir = filePath.split('/').slice(0, -1).join('/');
          
          // Create database entries from CSV rows
          const entries: NotionPage[] = rows.map((row, index) => {
            const properties: Record<string, string> = {};
            headers.forEach((header, i) => {
              if (row[i]) properties[header] = row[i];
            });
            
            return {
              id: `${filePath}-row-${index}`,
              title: row[0] || `Entry ${index + 1}`,
              path: `${filePath}#row-${index}`,
              content: row.join(' | '),
              type: 'database-entry' as const,
              parentPath: dir,
              properties,
            };
          });
          
          const database: NotionDatabase = {
            id: filePath.replace(/[^a-zA-Z0-9]/g, '-'),
            title: dbTitle,
            path: filePath,
            entries,
            schema: {
              columns: headers.map(name => ({
                name,
                type: inferColumnType(name, rows.map(r => r[headers.indexOf(name)])),
              })),
            },
          };
          
          result.databases.push(database);
        }
      } catch (error) {
        result.parseErrors.push(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    result.parseErrors.push(`Failed to read ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

// ============================================================================
// HELPERS
// ============================================================================

function inferColumnType(name: string, values: string[]): DatabaseSchema['columns'][0]['type'] {
  const nameLower = name.toLowerCase();
  
  // Check name hints
  if (nameLower.includes('date') || nameLower.includes('time') || nameLower.includes('created') || nameLower.includes('updated')) {
    return 'date';
  }
  if (nameLower.includes('email')) return 'email';
  if (nameLower.includes('url') || nameLower.includes('link')) return 'url';
  if (nameLower.includes('phone')) return 'phone';
  if (nameLower.includes('checkbox') || nameLower.includes('done') || nameLower.includes('complete')) return 'checkbox';
  
  // Check values
  const nonEmptyValues = values.filter(v => v && v.trim());
  if (nonEmptyValues.length === 0) return 'text';
  
  // Check if all values are numbers
  if (nonEmptyValues.every(v => !isNaN(Number(v)))) return 'number';
  
  // Check if all values are dates
  if (nonEmptyValues.every(v => !isNaN(Date.parse(v)))) return 'date';
  
  // Check if values look like checkboxes
  if (nonEmptyValues.every(v => ['yes', 'no', 'true', 'false', '✓', '✗', '☑', '☐'].includes(v.toLowerCase()))) {
    return 'checkbox';
  }
  
  return 'text';
}

/**
 * Extract all text content from a Notion export for processing
 */
export function extractAllText(notionExport: NotionExport): string {
  const texts: string[] = [];
  
  // Add page content
  for (const page of notionExport.pages) {
    texts.push(`# ${page.title}\n${page.content}`);
  }
  
  // Add database content
  for (const db of notionExport.databases) {
    texts.push(`# Database: ${db.title}`);
    for (const entry of db.entries) {
      const props = Object.entries(entry.properties)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      texts.push(`- ${entry.title}: ${props}`);
    }
  }
  
  return texts.join('\n\n');
}
