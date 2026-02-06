/**
 * ChatGPT Export Parser
 * 
 * Parses ChatGPT conversation exports (JSON files from Settings > Data Controls > Export).
 * Extracts conversations, messages, and metadata.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ChatGPTMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  model?: string;
}

export interface ChatGPTConversation {
  id: string;
  title: string;
  createTime: Date;
  updateTime: Date;
  messages: ChatGPTMessage[];
  messageCount: number;
  model?: string;
}

export interface ChatGPTExport {
  conversations: ChatGPTConversation[];
  totalMessages: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  } | null;
  parseErrors: string[];
}

// Raw types from ChatGPT export format
interface RawChatGPTExport {
  conversations?: RawConversation[];
}

interface RawConversation {
  id?: string;
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, RawMessageNode>;
  current_node?: string;
}

interface RawMessageNode {
  id?: string;
  message?: {
    id?: string;
    author?: {
      role?: string;
    };
    content?: {
      content_type?: string;
      parts?: string[];
    };
    create_time?: number;
    metadata?: {
      model_slug?: string;
    };
  };
  parent?: string;
  children?: string[];
}

// ============================================================================
// PARSER
// ============================================================================

export async function parseChatGPTExport(file: File): Promise<ChatGPTExport> {
  const result: ChatGPTExport = {
    conversations: [],
    totalMessages: 0,
    dateRange: null,
    parseErrors: [],
  };
  
  try {
    const text = await file.text();
    const data: RawChatGPTExport = JSON.parse(text);
    
    if (!data.conversations || !Array.isArray(data.conversations)) {
      // Try alternative format - might be an array directly
      const altData = JSON.parse(text);
      if (Array.isArray(altData)) {
        data.conversations = altData;
      } else {
        result.parseErrors.push('Invalid ChatGPT export format: no conversations array found');
        return result;
      }
    }
    
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;
    
    for (const rawConv of data.conversations) {
      try {
        const conversation = parseConversation(rawConv);
        if (conversation) {
          result.conversations.push(conversation);
          result.totalMessages += conversation.messageCount;
          
          // Track date range
          if (!earliestDate || conversation.createTime < earliestDate) {
            earliestDate = conversation.createTime;
          }
          if (!latestDate || conversation.updateTime > latestDate) {
            latestDate = conversation.updateTime;
          }
        }
      } catch (error) {
        result.parseErrors.push(
          `Failed to parse conversation "${rawConv.title || 'Unknown'}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    
    if (earliestDate && latestDate) {
      result.dateRange = { earliest: earliestDate, latest: latestDate };
    }
    
  } catch (error) {
    result.parseErrors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

function parseConversation(raw: RawConversation): ChatGPTConversation | null {
  if (!raw.mapping) return null;
  
  const messages: ChatGPTMessage[] = [];
  let model: string | undefined;
  
  // Build message tree and extract in order
  const messageNodes = Object.values(raw.mapping).filter(node => 
    node.message?.content?.parts && 
    node.message.content.parts.length > 0 &&
    node.message.author?.role
  );
  
  // Sort by create_time if available
  messageNodes.sort((a, b) => {
    const timeA = a.message?.create_time || 0;
    const timeB = b.message?.create_time || 0;
    return timeA - timeB;
  });
  
  for (const node of messageNodes) {
    const msg = node.message!;
    const role = msg.author?.role as 'user' | 'assistant' | 'system';
    
    // Skip system messages and empty content
    if (role === 'system') continue;
    
    const content = msg.content?.parts?.join('\n') || '';
    if (!content.trim()) continue;
    
    // Track model
    if (msg.metadata?.model_slug && !model) {
      model = msg.metadata.model_slug;
    }
    
    messages.push({
      id: msg.id || node.id || `msg-${messages.length}`,
      role,
      content,
      timestamp: msg.create_time ? new Date(msg.create_time * 1000) : undefined,
      model: msg.metadata?.model_slug,
    });
  }
  
  if (messages.length === 0) return null;
  
  return {
    id: raw.id || `conv-${Date.now()}`,
    title: raw.title || 'Untitled Conversation',
    createTime: raw.create_time ? new Date(raw.create_time * 1000) : new Date(),
    updateTime: raw.update_time ? new Date(raw.update_time * 1000) : new Date(),
    messages,
    messageCount: messages.length,
    model,
  };
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

/**
 * Extract all text content from ChatGPT export for processing
 */
export function extractAllText(chatgptExport: ChatGPTExport): string {
  const texts: string[] = [];
  
  for (const conv of chatgptExport.conversations) {
    texts.push(`# Conversation: ${conv.title}`);
    texts.push(`Date: ${conv.createTime.toISOString().split('T')[0]}`);
    texts.push('');
    
    for (const msg of conv.messages) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      texts.push(`**${roleLabel}:**`);
      texts.push(msg.content);
      texts.push('');
    }
    
    texts.push('---');
    texts.push('');
  }
  
  return texts.join('\n');
}

/**
 * Extract only user messages (useful for understanding user's interests/questions)
 */
export function extractUserMessages(chatgptExport: ChatGPTExport): string[] {
  const messages: string[] = [];
  
  for (const conv of chatgptExport.conversations) {
    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        messages.push(msg.content);
      }
    }
  }
  
  return messages;
}

/**
 * Get conversation topics/titles for quick overview
 */
export function getConversationTopics(chatgptExport: ChatGPTExport): { title: string; date: Date; messageCount: number }[] {
  return chatgptExport.conversations.map(conv => ({
    title: conv.title,
    date: conv.createTime,
    messageCount: conv.messageCount,
  }));
}

/**
 * Search conversations by keyword
 */
export function searchConversations(chatgptExport: ChatGPTExport, query: string): ChatGPTConversation[] {
  const queryLower = query.toLowerCase();
  
  return chatgptExport.conversations.filter(conv => {
    // Check title
    if (conv.title.toLowerCase().includes(queryLower)) return true;
    
    // Check messages
    return conv.messages.some(msg => 
      msg.content.toLowerCase().includes(queryLower)
    );
  });
}
