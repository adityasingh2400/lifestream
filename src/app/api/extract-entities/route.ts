import { NextRequest, NextResponse } from 'next/server';
import { 
  BedrockRuntimeClient, 
  ConverseCommand,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

// Set max duration for serverless function (for large documents)
export const maxDuration = 60;

// ============================================================================
// JSON REPAIR UTILITY
// ============================================================================

/**
 * Attempts to repair truncated JSON by closing open brackets/braces
 */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim();
  
  // Count open brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  
  for (const char of repaired) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }
  
  // If we're in a string, close it
  if (inString) {
    repaired += '"';
  }
  
  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');
  
  // Close any open brackets/braces
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }
  
  return repaired;
}

// ============================================================================
// TYPES
// ============================================================================

interface ExtractEntitiesRequest {
  content: string;
  source: 'notion' | 'chatgpt' | 'document';
  profileName?: string;
}

export interface ExtractedProfile {
  name: string;
  currentRole?: string;
  location?: string;
  age?: number;
  summary: string;
  coreIdentity: string[];  // Key traits, values, what defines this person
}

export interface ExtractedSkill {
  id: string;  // Unique identifier like "skill_python"
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'technical' | 'soft' | 'domain' | 'language';
  evidence: string;
  yearsOfExperience?: number;
  acquiredDate?: string;  // When skill was first learned (ISO date or year)
  confidence: number;     // 0-1 confidence score for this extraction
}

export interface ExtractedProject {
  id: string;
  name: string;
  description: string;
  status: 'idea' | 'in-progress' | 'completed' | 'abandoned';
  technologies: string[];
  outcomes: string[];
  timeframe?: string;
  startDate?: string;     // ISO date or year
  endDate?: string;       // ISO date or year
  role?: string;
  impact?: string;
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedGoal {
  id: string;
  description: string;
  type: 'career' | 'financial' | 'personal' | 'learning' | 'health' | 'relationship';
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  targetDate?: string;    // When goal should be achieved (ISO date or year)
  motivation?: string;
  progress?: string;
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedDecision {
  id: string;
  description: string;
  date?: string;
  context: string;
  outcome?: string;
  consequenceDate?: string;  // When outcome was realized
  category: 'career' | 'education' | 'financial' | 'personal' | 'technical' | 'relationship';
  impact: 'high' | 'medium' | 'low';
  lessonsLearned?: string;
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedPerson {
  id: string;
  name: string;
  relationship: 'colleague' | 'mentor' | 'friend' | 'family' | 'professional-contact' | 'manager' | 'report' | 'collaborator' | 'other';
  context: string;
  firstMetDate?: string;  // When first met (ISO date or year)
  influence?: string;  // How they've influenced the person
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedCompany {
  id: string;
  name: string;
  relationship: 'employer' | 'client' | 'partner' | 'target' | 'founded' | 'invested' | 'other';
  role?: string;
  timeframe?: string;
  startDate?: string;     // ISO date or year
  endDate?: string;       // ISO date or year
  achievements?: string[];
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedEvent {
  id: string;
  description: string;
  date?: string;
  endDate?: string;       // For events that span a period
  type: 'milestone' | 'achievement' | 'setback' | 'transition' | 'learning' | 'breakthrough';
  impact: 'high' | 'medium' | 'low';
  significance: string;
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedInterest {
  id: string;
  topic: string;
  depth: 'casual' | 'moderate' | 'deep' | 'obsessive';
  startedDate?: string;   // When interest began (ISO date or year)
  evidence: string;
  relatedTo?: string;  // What life area it connects to
  confidence: number;     // 0-1 confidence score
}

export interface ExtractedRelationship {
  from: string;  // Entity ID like "skill_python" or "project_ml_pipeline"
  to: string;    // Entity ID
  type: string;  // Relationship type like "used_in", "led_to", "enabled", "collaborated_on"
  context?: string;
}

export interface ExtractedEntities {
  profile: ExtractedProfile;
  skills: ExtractedSkill[];
  projects: ExtractedProject[];
  goals: ExtractedGoal[];
  decisions: ExtractedDecision[];
  people: ExtractedPerson[];
  companies: ExtractedCompany[];
  events: ExtractedEvent[];
  interests: ExtractedInterest[];
  relationships: ExtractedRelationship[];
}

// ============================================================================
// BEDROCK CLIENT
// ============================================================================

function getBedrockClient() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

// ============================================================================
// COMPREHENSIVE EXTRACTION PROMPT
// ============================================================================

function buildExtractionPrompt(content: string, source: string, profileName?: string): string {
  return `You are an expert life analyst building a comprehensive knowledge graph of a person's life. Your goal is to deeply understand this person - their skills, experiences, relationships, decisions, goals, and how everything connects.

DOCUMENT SOURCE: ${source}
${profileName ? `PERSON'S NAME: ${profileName}` : ''}

CONTENT TO ANALYZE:
---
${content}
---

Your task is to extract a COMPREHENSIVE and INTERCONNECTED view of this person's life. Think deeply about:
- What defines this person? What are their core strengths and values?
- What is their career trajectory and key professional experiences?
- What projects have they worked on and what skills did they use/develop?
- Who are the important people in their life and how have they influenced them?
- What major decisions have shaped their path?
- What are they working towards? What motivates them?
- How do all these elements connect to each other?

=== QUALITY RULES (CRITICAL - FOLLOW STRICTLY) ===

1. COMPLETENESS: Only extract entities with CLEAR, COMPLETE names. NO fragments or partial words.
   - GOOD: "Python", "Machine Learning", "Stanford University"
   - BAD: "Pyth", "ML", "Stan", "the project", "that skill"

2. EVIDENCE REQUIRED: Each entity MUST have supporting evidence from the text.
   - Every skill needs evidence of how it was demonstrated
   - Every project needs a clear description
   - Every person needs context about the relationship

3. MERGE DUPLICATES: Combine variations of the same entity into ONE entry.
   - "Python", "Python3", "Python programming" → ONE skill: "Python"
   - "ML", "Machine Learning", "machine-learning" → ONE skill: "Machine Learning"

4. CONFIDENCE SCORING: Assign a confidence score (0.0 to 1.0) to each entity:
   - 0.9-1.0: Explicitly stated with clear evidence
   - 0.7-0.89: Strongly implied with good context
   - 0.5-0.69: Inferred but less certain
   - Below 0.5: DO NOT INCLUDE - too uncertain

5. MINIMUM QUALITY: Only include entities with confidence >= 0.7

6. NAME LENGTH: Entity names must be at least 3 characters. No single letters or abbreviations without expansion.

7. TEMPORAL DATA: Extract dates whenever mentioned or implied:
   - Use ISO format (YYYY-MM-DD) when exact date is known
   - Use year only (YYYY) when only year is mentioned
   - Use relative terms like "2 years ago" only if no better date available

8. PREFER QUALITY OVER QUANTITY: It's better to have 5 high-quality entities than 20 low-quality ones.

=== END QUALITY RULES ===

CRITICAL: You must also extract RELATIONSHIPS between entities. For example:
- A skill was "used_in" a project
- A decision "led_to" a new role at a company
- A person "mentored" them on a skill
- A project "achieved" a goal
- An event "triggered" a decision

Generate unique IDs for each entity using this format:
- Skills: skill_[lowercase_name] (e.g., skill_python, skill_leadership)
- Projects: project_[short_name] (e.g., project_ml_pipeline, project_startup)
- Goals: goal_[short_description] (e.g., goal_yc_acceptance, goal_learn_rust)
- Decisions: decision_[short_description] (e.g., decision_quit_job, decision_move_sf)
- People: person_[firstname_lastname] (e.g., person_john_smith)
- Companies: company_[name] (e.g., company_google, company_my_startup)
- Events: event_[short_description] (e.g., event_promotion, event_graduation)
- Interests: interest_[topic] (e.g., interest_ai, interest_philosophy)

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "profile": {
    "name": "Person's full name",
    "currentRole": "Current job title or situation",
    "location": "Where they're based",
    "age": null or number,
    "summary": "2-3 sentence summary of who this person is",
    "coreIdentity": ["trait1", "trait2", "trait3"]
  },
  "skills": [
    {
      "id": "skill_example",
      "name": "Skill Name (complete, not abbreviated)",
      "level": "beginner|intermediate|advanced|expert",
      "category": "technical|soft|domain|language",
      "evidence": "Specific evidence from the text showing this skill",
      "yearsOfExperience": null or number,
      "acquiredDate": "YYYY or YYYY-MM-DD if known",
      "confidence": 0.7 to 1.0
    }
  ],
  "projects": [
    {
      "id": "project_example",
      "name": "Project Name (complete, descriptive)",
      "description": "Clear description of what the project is about",
      "status": "idea|in-progress|completed|abandoned",
      "technologies": ["tech1", "tech2"],
      "outcomes": ["outcome1", "outcome2"],
      "timeframe": "When (if mentioned)",
      "startDate": "YYYY or YYYY-MM-DD if known",
      "endDate": "YYYY or YYYY-MM-DD if known",
      "role": "Their role in the project",
      "impact": "The impact or significance",
      "confidence": 0.7 to 1.0
    }
  ],
  "goals": [
    {
      "id": "goal_example",
      "description": "Clear, complete goal description",
      "type": "career|financial|personal|learning|health|relationship",
      "timeframe": "short-term|medium-term|long-term",
      "targetDate": "YYYY or YYYY-MM-DD if known",
      "motivation": "Why this goal matters to them",
      "progress": "Current progress if mentioned",
      "confidence": 0.7 to 1.0
    }
  ],
  "decisions": [
    {
      "id": "decision_example",
      "description": "Clear decision description",
      "date": "YYYY or YYYY-MM-DD if known",
      "context": "Why this decision was made",
      "outcome": "What resulted from it",
      "consequenceDate": "When outcome was realized",
      "category": "career|education|financial|personal|technical|relationship",
      "impact": "high|medium|low",
      "lessonsLearned": "What they learned from this",
      "confidence": 0.7 to 1.0
    }
  ],
  "people": [
    {
      "id": "person_example",
      "name": "Person's Full Name",
      "relationship": "colleague|mentor|friend|family|professional-contact|manager|report|collaborator|other",
      "context": "How they know this person",
      "firstMetDate": "YYYY or YYYY-MM-DD if known",
      "influence": "How this person has influenced them",
      "confidence": 0.7 to 1.0
    }
  ],
  "companies": [
    {
      "id": "company_example",
      "name": "Company Full Name",
      "relationship": "employer|client|partner|target|founded|invested|other",
      "role": "Their role at this company",
      "timeframe": "When they were involved",
      "startDate": "YYYY or YYYY-MM-DD if known",
      "endDate": "YYYY or YYYY-MM-DD if known",
      "achievements": ["achievement1", "achievement2"],
      "confidence": 0.7 to 1.0
    }
  ],
  "events": [
    {
      "id": "event_example",
      "description": "Clear event description",
      "date": "YYYY or YYYY-MM-DD if known",
      "endDate": "YYYY or YYYY-MM-DD if event spans time",
      "type": "milestone|achievement|setback|transition|learning|breakthrough",
      "impact": "high|medium|low",
      "significance": "Why this event matters",
      "confidence": 0.7 to 1.0
    }
  ],
  "interests": [
    {
      "id": "interest_example",
      "topic": "Interest topic (complete name)",
      "depth": "casual|moderate|deep|obsessive",
      "startedDate": "YYYY or YYYY-MM-DD if known",
      "evidence": "How this interest is shown",
      "relatedTo": "What life area it connects to",
      "confidence": 0.7 to 1.0
    }
  ],
  "relationships": [
    {
      "from": "entity_id_1",
      "to": "entity_id_2",
      "type": "relationship_type",
      "context": "Brief explanation of the relationship"
    }
  ]
}

IMPORTANT RELATIONSHIP TYPES TO LOOK FOR:
- used_in: skill was used in a project
- developed_through: skill was developed through a project/experience
- led_to: decision/event led to another outcome
- enabled: one thing enabled another
- collaborated_with: worked with a person on something
- mentored_by: learned from someone
- works_at: person works at company
- founded: person founded company
- achieved: project/decision achieved a goal
- triggered: event triggered a decision
- related_to: general connection between entities

Extract as many meaningful relationships as you can find. The goal is to create a rich, interconnected graph of this person's life.

REMEMBER: Quality over quantity. Only include entities with confidence >= 0.7 and complete, clear names.

If information is not present, use empty arrays. Be thorough but accurate - only extract what's clearly present or strongly implied.`;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check for credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const body: ExtractEntitiesRequest = await request.json();
    
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const client = getBedrockClient();
    const prompt = buildExtractionPrompt(body.content, body.source, body.profileName);
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    console.log(`Extracting entities from ${body.source} content (${body.content.length} chars)`);
    
    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 16384,  // Increased significantly for large documents
        temperature: 0.1,  // Lower temperature for consistent JSON output
      },
    });

    const response = await client.send(command);
    
    // Check if response was truncated
    const stopReason = response.stopReason;
    if (stopReason === 'max_tokens') {
      console.warn('Response was truncated due to max tokens limit');
    }
    
    const outputMessage = response.output?.message;
    if (!outputMessage?.content) {
      throw new Error('No content in Bedrock response');
    }

    const textBlock = outputMessage.content.find(
      (block): block is ContentBlock.TextMember => 'text' in block
    );
    
    if (!textBlock?.text) {
      throw new Error('No text content in Bedrock response');
    }

    let content = textBlock.text;
    
    // Strip markdown code fences if present
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    // Parse the JSON response
    let entities: ExtractedEntities;
    try {
      // Try to find complete JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      let jsonStr = jsonMatch[0];
      
      // If JSON is truncated, try to repair it
      if (stopReason === 'max_tokens') {
        jsonStr = repairTruncatedJson(jsonStr);
      }
      
      entities = JSON.parse(jsonStr);
      
      // Validate and ensure all required fields exist
      if (!entities.profile) {
        entities.profile = {
          name: body.profileName || 'Unknown',
          summary: 'Profile extracted from document',
          coreIdentity: [],
        };
      }
      
      const arrayFields = ['skills', 'projects', 'goals', 'decisions', 'people', 'companies', 'events', 'interests', 'relationships'] as const;
      for (const field of arrayFields) {
        if (!Array.isArray((entities as unknown as Record<string, unknown>)[field])) {
          (entities as unknown as Record<string, unknown[]>)[field] = [];
        }
      }
      
      console.log(`Extracted: ${entities.skills.length} skills, ${entities.projects.length} projects, ${entities.goals.length} goals, ${entities.relationships.length} relationships`);
      
    } catch (parseError) {
      console.error('Failed to parse extraction response:', content.substring(0, 500));
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response as JSON - response may have been truncated');
    }

    return NextResponse.json({ entities });

  } catch (error) {
    console.error('Entity extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to extract entities: ${errorMessage}` },
      { status: 500 }
    );
  }
}
