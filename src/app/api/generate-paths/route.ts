import { NextRequest, NextResponse } from 'next/server';
import { 
  BedrockRuntimeClient, 
  ConverseCommand,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

// ============================================================================
// TYPES
// ============================================================================

interface GeneratePathsRequest {
  userContext: {
    age: number;
    situation: string;
    currentIncome?: number;
    currentSavings?: number;
    currentDebt?: number;
    skills?: string[];
    education?: string;
    location?: string;
    goals?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  currentOutcome?: {
    jobTitle?: string;
    company?: string;
    salary?: number;
    netWorth?: number;
    narrative?: string;
  };
  depth?: number;
  generateInitialNarrative?: boolean;
  // Rich knowledge context from personal data
  knowledgeContext?: {
    profile?: {
      name: string;
      age?: number;
      currentRole?: string;
      location?: string;
    };
    topSkills?: {
      name: string;
      level: string;
      category: string;
    }[];
    activeProjects?: {
      name: string;
      status: string;
      technologies: string[];
    }[];
    currentGoals?: {
      description: string;
      type: string;
      timeframe: string;
    }[];
    recentDecisions?: {
      description: string;
      category: string;
      outcome?: string;
    }[];
    workHistory?: {
      company: string;
      role?: string;
      relationship: string;
    }[];
    network?: {
      name: string;
      relationship: string;
    }[];
    interests?: {
      topic: string;
      depth: string;
    }[];
    stats?: {
      totalSkills: number;
      totalProjects: number;
      totalGoals: number;
      totalConnections: number;
    };
  };
}

interface DecisionPath {
  id: string;
  label: string;
  description: string;
  probability: number;
  requirements?: string[];
  tradeoffs: string[];
  outcome: {
    jobTitle: string;
    company?: string;
    companyType?: string;
    salary: number;
    equity?: number;
    location?: string;
    lifestyle: string;
    netWorth: number;
    monthlyBurn: number;
    savingsRate: number;
    workLifeBalance: 'poor' | 'average' | 'good' | 'excellent';
    careerGrowth: 'stagnant' | 'slow' | 'moderate' | 'fast' | 'explosive';
    fulfillment: 'low' | 'medium' | 'high';
    stress: 'low' | 'medium' | 'high' | 'extreme';
    narrative: string;
    keyEvents: string[];
  };
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
// PROMPT ENGINEERING
// ============================================================================

function buildPrompt(request: GeneratePathsRequest): string {
  const { userContext, currentOutcome, depth, knowledgeContext } = request;
  
  const currentState = currentOutcome 
    ? `
Current Position:
- Job: ${currentOutcome.jobTitle || 'Unknown'}
- Company: ${currentOutcome.company || 'Unknown'}
- Salary: $${currentOutcome.salary?.toLocaleString() || 0}/year
- Net Worth: $${currentOutcome.netWorth?.toLocaleString() || 0}
- Context: ${currentOutcome.narrative || 'N/A'}
`
    : `Starting point - no current position yet.`;

  // Build rich knowledge context section if available
  let knowledgeSection = '';
  if (knowledgeContext) {
    const sections: string[] = [];
    
    if (knowledgeContext.topSkills && knowledgeContext.topSkills.length > 0) {
      sections.push(`VERIFIED SKILLS (from personal data):
${knowledgeContext.topSkills.map(s => `- ${s.name} (${s.level}, ${s.category})`).join('\n')}`);
    }
    
    if (knowledgeContext.activeProjects && knowledgeContext.activeProjects.length > 0) {
      sections.push(`ACTIVE PROJECTS:
${knowledgeContext.activeProjects.map(p => `- ${p.name} (${p.status}): ${p.technologies.join(', ')}`).join('\n')}`);
    }
    
    if (knowledgeContext.currentGoals && knowledgeContext.currentGoals.length > 0) {
      sections.push(`STATED GOALS:
${knowledgeContext.currentGoals.map(g => `- ${g.description} (${g.type}, ${g.timeframe})`).join('\n')}`);
    }
    
    if (knowledgeContext.workHistory && knowledgeContext.workHistory.length > 0) {
      sections.push(`WORK HISTORY:
${knowledgeContext.workHistory.map(w => `- ${w.company}${w.role ? ` as ${w.role}` : ''}`).join('\n')}`);
    }
    
    if (knowledgeContext.recentDecisions && knowledgeContext.recentDecisions.length > 0) {
      sections.push(`RECENT DECISIONS:
${knowledgeContext.recentDecisions.map(d => `- ${d.description} (${d.category})${d.outcome ? `: ${d.outcome}` : ''}`).join('\n')}`);
    }
    
    if (knowledgeContext.interests && knowledgeContext.interests.length > 0) {
      sections.push(`INTERESTS:
${knowledgeContext.interests.map(i => `- ${i.topic} (${i.depth} interest)`).join('\n')}`);
    }
    
    if (knowledgeContext.network && knowledgeContext.network.length > 0) {
      sections.push(`PROFESSIONAL NETWORK:
${knowledgeContext.network.slice(0, 5).map(n => `- ${n.name} (${n.relationship})`).join('\n')}`);
    }
    
    if (sections.length > 0) {
      knowledgeSection = `
RICH PERSONAL CONTEXT (extracted from user's actual data):
${sections.join('\n\n')}

IMPORTANT: Use this rich context to make predictions MORE ACCURATE and PERSONALIZED. 
- Factor in their actual skill levels when calculating probabilities
- Consider their stated goals when suggesting paths
- Reference their work history for realistic career progressions
- Use their interests to suggest fulfilling paths
`;
    }
  }

  return `You are a life path advisor generating realistic career and life decision paths.

USER CONTEXT:
- Age: ${userContext.age}
- Situation: ${userContext.situation}
- Current Income: $${userContext.currentIncome?.toLocaleString() || 0}/year
- Savings: $${userContext.currentSavings?.toLocaleString() || 0}
- Debt: $${userContext.currentDebt?.toLocaleString() || 0}
- Skills: ${userContext.skills?.join(', ') || 'Not specified'}
- Education: ${userContext.education || 'Not specified'}
- Location: ${userContext.location || 'Not specified'}
- Goals: ${userContext.goals?.join(', ') || 'Not specified'}
- Risk Tolerance: ${userContext.riskTolerance || 'medium'}
${knowledgeSection}
${currentState}

DEPTH IN TREE: ${depth || 0} (0 = starting point)

Generate 4-6 realistic decision paths this person could take from their current position. Each path should be:
1. SPECIFIC - Real job titles, realistic company types, actual salary ranges for their market
2. REALISTIC - Based on their actual skills, education, and constraints
3. DIVERSE - Include safe options, risky options, and unconventional paths
4. CONSEQUENTIAL - Show real tradeoffs and outcomes

For each path, provide detailed outcomes including:
- Specific job title and company type
- Realistic salary based on market rates
- Net worth projection (accounting for expenses, taxes, savings)
- Quality of life metrics
- A narrative paragraph describing what this path looks like day-to-day
- 3-4 key events that would happen on this path

IMPORTANT: Be realistic about probabilities. Not everyone gets into FAANG. Not every startup succeeds. Factor in their actual background.

Respond with ONLY valid JSON in this exact format (no markdown, no explanation, no code blocks):
{
  "paths": [
    {
      "id": "unique-id",
      "label": "Short decision label",
      "description": "2-3 sentence description of this choice",
      "probability": 0.0-1.0,
      "requirements": ["requirement 1", "requirement 2"],
      "tradeoffs": ["tradeoff 1", "tradeoff 2"],
      "outcome": {
        "jobTitle": "Specific Job Title",
        "company": "Company Name or Type",
        "companyType": "FAANG/Startup/Finance/etc",
        "salary": 150000,
        "equity": 50000,
        "location": "City",
        "lifestyle": "Description of daily life",
        "netWorth": 50000,
        "monthlyBurn": 5000,
        "savingsRate": 0.3,
        "workLifeBalance": "average",
        "careerGrowth": "fast",
        "fulfillment": "high",
        "stress": "high",
        "narrative": "Detailed paragraph about this path...",
        "keyEvents": ["Event 1", "Event 2", "Event 3"]
      }
    }
  ]
}`;
}

function buildInitialNarrativePrompt(userContext: GeneratePathsRequest['userContext']): string {
  const netWorth = (userContext.currentSavings || 0) - (userContext.currentDebt || 0);
  
  return `You are a life narrator creating a vivid, engaging description of someone's current life situation.

USER CONTEXT:
- Age: ${userContext.age}
- Situation: ${userContext.situation}
- Current Income: $${userContext.currentIncome?.toLocaleString() || 0}/year
- Savings: $${userContext.currentSavings?.toLocaleString() || 0}
- Debt: $${userContext.currentDebt?.toLocaleString() || 0}
- Net Worth: $${netWorth.toLocaleString()}
- Skills: ${userContext.skills?.join(', ') || 'Not specified'}
- Education: ${userContext.education || 'Not specified'}
- Location: ${userContext.location || 'Not specified'}
- Goals: ${userContext.goals?.join(', ') || 'Not specified'}
- Risk Tolerance: ${userContext.riskTolerance || 'medium'}

Write a compelling, personalized narrative about this person's current life situation. This is the STARTING POINT of their journey - describe where they are RIGHT NOW, not where they're going.

The narrative should:
1. Be written in second person ("You are...")
2. Paint a vivid picture of their daily life
3. Acknowledge their current challenges and opportunities
4. Feel personal and specific to their situation
5. Be 3-4 sentences long

Also provide:
- A short lifestyle description (1 sentence)
- 2-3 key events/facts about their current situation

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "narrative": "Your compelling narrative here...",
  "lifestyle": "Brief lifestyle description",
  "keyEvents": ["Current fact 1", "Current fact 2", "Current fact 3"]
}`;
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

    const body: GeneratePathsRequest = await request.json();
    
    // Validate request
    if (!body.userContext?.situation) {
      return NextResponse.json(
        { error: 'User situation is required' },
        { status: 400 }
      );
    }

    const client = getBedrockClient();
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    // Handle initial narrative generation
    if (body.generateInitialNarrative) {
      const prompt = buildInitialNarrativePrompt(body.userContext);
      
      console.log('Generating initial narrative with model:', modelId);
      
      const command = new ConverseCommand({
        modelId,
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
        inferenceConfig: {
          maxTokens: 1024,
          temperature: 0.7,
        },
      });

      const response = await client.send(command);
      
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

      const content = textBlock.text;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        const parsed = JSON.parse(jsonMatch[0]);
        
        return NextResponse.json({ 
          initialNarrative: {
            narrative: parsed.narrative,
            lifestyle: parsed.lifestyle,
            keyEvents: parsed.keyEvents,
          }
        });
      } catch (parseError) {
        console.error('Failed to parse initial narrative:', content.substring(0, 500));
        // Return a default narrative
        return NextResponse.json({ 
          initialNarrative: {
            narrative: `You're ${body.userContext.age} years old. ${body.userContext.situation}`,
            lifestyle: 'Your current situation',
            keyEvents: ['Starting your journey'],
          }
        });
      }
    }

    // Regular path generation
    const prompt = buildPrompt(body);

    console.log('Calling Bedrock with model:', modelId);
    
    const command = new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
      },
    });

    const response = await client.send(command);
    
    // Extract text from response
    const outputMessage = response.output?.message;
    if (!outputMessage?.content) {
      throw new Error('No content in Bedrock response');
    }

    // Find the text content block
    const textBlock = outputMessage.content.find(
      (block): block is ContentBlock.TextMember => 'text' in block
    );
    
    if (!textBlock?.text) {
      throw new Error('No text content in Bedrock response');
    }

    const content = textBlock.text;
    console.log('Received response length:', content.length);

    // Parse the JSON from Claude's response
    let paths: DecisionPath[];
    try {
      // Try to extract JSON from the response (in case there's any extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', content.substring(0, 500));
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      paths = parsed.paths;
      
      if (!paths || !Array.isArray(paths)) {
        throw new Error('Invalid paths array in response');
      }
      
      console.log('Successfully parsed', paths.length, 'paths');
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.substring(0, 1000));
      throw new Error('Failed to parse AI response as JSON');
    }

    return NextResponse.json({ paths });

  } catch (error) {
    console.error('Bedrock API error:', error);
    
    // Return a more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to generate paths: ${errorMessage}` },
      { status: 500 }
    );
  }
}
