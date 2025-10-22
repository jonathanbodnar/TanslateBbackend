import OpenAI from 'openai';
import { supabaseService } from './supabase.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QuizCard {
  cardNumber: number;
  cardType: 'reflexes' | 'frustrations' | 'fears' | 'hopes' | 'derails' | 'conditional';
  question: string;
  inputType: 'text' | 'multi_select' | 'single_select' | 'slider';
  options?: string[]; // For select types
  placeholder?: string; // For text input
  sliderLabels?: { min: string; max: string }; // For slider
}

export interface QuizAnalysis {
  communicationStyle: {
    directness: number;
    formality: number;
    warmth: number;
    supportMode: number;
    humor: number;
    teasing: number;
    metaCommunication: number;
    boundaryStrength: number;
    structureVsStory: number;
    validationVsSolutioning: number;
    encouragementVsChallenge: number;
    detailDepth: number;
    concreteVsAbstract: number;
    questionDensity: number;
    complimentRequestRatio: number;
  };
  keyInsights: string[];
  patterns: string[];
  suggestions: string[];
}

export interface QuizResponse {
  cardNumber: number;
  cardType: string;
  question: string;
  inputType: string;
  answer: any;
}

export class RelationshipQuizService {
  /**
   * Generate adaptive quiz questions based on user profile and contact info
   */
  async generateQuizQuestions(
    userId: string,
    contactId: string,
    relationshipType: string,
    userProfile?: any
  ): Promise<QuizCard[]> {
    // Base cards that are always asked
    const cards: QuizCard[] = [
      // Card 1: Communication Reflexes
      {
        cardNumber: 1,
        cardType: 'reflexes',
        question: await this.adaptQuestionWording(
          `When you're communicating with this person, what's your default reflex?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'multi_select',
        options: [
          'Get straight to the point',
          'Cushion with warmth first',
          'Check in emotionally',
          'Lead with humor',
          'Mirror their energy',
          'Ask clarifying questions',
        ],
      },

      // Card 2: Relationship Frustrations
      {
        cardNumber: 2,
        cardType: 'frustrations',
        question: await this.adaptQuestionWording(
          `What tends to frustrate you most in this relationship?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'multi_select',
        options: [
          'Not feeling heard',
          'Misunderstandings',
          'Different communication pace',
          'Unmet expectations',
          'Lack of vulnerability',
          'Feeling judged',
          'Not enough depth',
          'Too much intensity',
        ],
      },

      // Card 3: Core Fears
      {
        cardNumber: 3,
        cardType: 'fears',
        question: await this.adaptQuestionWording(
          `What do you worry about most with this person?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'multi_select',
        options: [
          'Being misunderstood',
          'Overwhelming them',
          'Being too vulnerable',
          'Causing conflict',
          'Losing connection',
          'Being judged',
          'Saying the wrong thing',
          'Not being enough',
        ],
      },

      // Card 4: Relationship Hopes
      {
        cardNumber: 4,
        cardType: 'hopes',
        question: await this.adaptQuestionWording(
          `What do you hope for in this relationship?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'multi_select',
        options: [
          'Deeper understanding',
          'More ease in communication',
          'Greater trust',
          'More authenticity',
          'Better conflict resolution',
          'Shared growth',
          'More fun together',
          'Emotional safety',
        ],
      },

      // Card 5: Common Derails
      {
        cardNumber: 5,
        cardType: 'derails',
        question: await this.adaptQuestionWording(
          `What usually derails conversations with this person?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'multi_select',
        options: [
          'Defensiveness',
          'Mismatched energy',
          'Assumptions',
          'Interruptions',
          'Different priorities',
          'Emotional overwhelm',
          'Lack of context',
          'Timing issues',
        ],
      },
    ];

    // Card 6 is conditional based on previous responses
    // For now, we'll generate it after the first 5 are submitted
    // But we'll prepare the structure here

    return cards;
  }

  /**
   * Generate conditional card based on previous responses
   */
  async generateConditionalCard(
    responses: QuizResponse[],
    userProfile?: any
  ): Promise<QuizCard | null> {
    // Analyze responses to determine what conditional card to show
    const frustrations = responses.find((r) => r.cardType === 'frustrations')?.answer || [];
    const fears = responses.find((r) => r.cardType === 'fears')?.answer || [];

    // If user selected conflict-related issues, ask about conflict style
    const hasConflictIssues =
      frustrations.includes('Unmet expectations') ||
      frustrations.includes('Feeling judged') ||
      fears.includes('Causing conflict');

    if (hasConflictIssues) {
      return {
        cardNumber: 6,
        cardType: 'conditional',
        question: await this.adaptQuestionWording(
          `When conflict arises with this person, how do you typically respond?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'single_select',
        options: [
          'Address it immediately',
          'Need time to process first',
          'Try to smooth things over',
          'Withdraw and reflect',
          'Seek to understand their side',
          'Defend my position',
        ],
      };
    }

    // If user selected vulnerability/depth issues, ask about openness
    const hasVulnerabilityIssues =
      frustrations.includes('Lack of vulnerability') ||
      frustrations.includes('Not enough depth') ||
      fears.includes('Being too vulnerable');

    if (hasVulnerabilityIssues) {
      return {
        cardNumber: 6,
        cardType: 'conditional',
        question: await this.adaptQuestionWording(
          `How comfortable are you being vulnerable with this person?`,
          userProfile?.cognitive?.processing_fingerprint || 'balanced'
        ),
        inputType: 'slider',
        sliderLabels: { min: 'Very guarded', max: 'Completely open' },
      };
    }

    // Default: ask about communication pace
    return {
      cardNumber: 6,
      cardType: 'conditional',
      question: await this.adaptQuestionWording(
        `What communication pace feels best with this person?`,
        userProfile?.cognitive?.processing_fingerprint || 'balanced'
      ),
      inputType: 'single_select',
      options: [
        'Quick, frequent check-ins',
        'Longer, deeper conversations',
        'Sporadic but meaningful',
        'Consistent and predictable',
        'Flexible and spontaneous',
      ],
    };
  }

  /**
   * Adapt question wording based on user's processing fingerprint
   */
  async adaptQuestionWording(question: string, processingType: string): Promise<string> {
    // Map processing types to communication preferences
    const adaptations: Record<string, string> = {
      'detail-oriented': question, // Keep concrete and specific
      analytical: question, // Keep structured
      intuitive: question.replace('what', 'how'), // More abstract
      empathetic: question, // Already emotionally aware
      balanced: question, // No change needed
    };

    return adaptations[processingType] || question;
  }

  /**
   * Analyze quiz responses and generate slider recommendations + insights
   */
  async analyzeQuizResponses(
    userId: string,
    contactId: string,
    responses: QuizResponse[]
  ): Promise<QuizAnalysis> {
    // Fetch user profile if available
    const { data: userProfileData } = await supabaseService
      .from('intake_sessions')
      .select('profile_snapshot')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const userProfile = userProfileData?.profile_snapshot;

    const prompt = `You are an expert relationship communication analyst. Based on the user's quiz responses about a specific relationship, generate personalized communication slider recommendations and insights.

User Profile: ${JSON.stringify(userProfile, null, 2)}

Quiz Responses:
${responses
  .map(
    (r) => `
Q: ${r.question}
Type: ${r.cardType}
Answer: ${JSON.stringify(r.answer)}
`
  )
  .join('\n')}

Please analyze these responses and provide:

1. **Recommended Slider Values** (0-100 for each):
   - directness (0=cushioning, 100=direct)
   - formality (0=casual, 100=formal)
   - warmth (0=neutral, 100=warm)
   - supportMode (0=solution-focused, 100=empathy-focused)
   - humor (0=serious, 100=playful)
   - teasing (0=gentle, 100=edgy)
   - metaCommunication (0=implicit, 100=explicit)
   - boundaryStrength (0=flexible, 100=firm)
   - structureVsStory (0=structured, 100=narrative)
   - validationVsSolutioning (0=validate first, 100=solve first)
   - encouragementVsChallenge (0=encourage, 100=challenge)
   - detailDepth (0=high-level, 100=detailed)
   - concreteVsAbstract (0=concrete, 100=abstract)
   - questionDensity (0=few questions, 100=many questions)
   - complimentRequestRatio (0=more compliments, 100=more requests)

2. **Key Insights** (3-5 bullet points about the relationship dynamics)

3. **Patterns** (2-4 recurring themes or tendencies)

4. **Suggestions** (2-4 actionable communication tips)

Return ONLY valid JSON in this exact format:
{
  "communicationStyle": {
    "directness": 50,
    "formality": 40,
    "warmth": 70,
    "supportMode": 60,
    "humor": 50,
    "teasing": 30,
    "metaCommunication": 40,
    "boundaryStrength": 50,
    "structureVsStory": 60,
    "validationVsSolutioning": 70,
    "encouragementVsChallenge": 40,
    "detailDepth": 50,
    "concreteVsAbstract": 45,
    "questionDensity": 50,
    "complimentRequestRatio": 60
  },
  "keyInsights": [
    "You value emotional safety and tend to cushion direct feedback",
    "There's a desire for deeper vulnerability in this relationship"
  ],
  "patterns": [
    "Communication tends to derail when expectations aren't explicitly stated",
    "You worry about overwhelming this person with intensity"
  ],
  "suggestions": [
    "Try meta-communicating your fears before sharing something vulnerable",
    "Use more explicit check-ins to ensure you're both on the same page"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower for more consistent recommendations
    });

    const content = response.choices[0].message.content || '{}';

    // Parse and validate the response
    try {
      const analysis: QuizAnalysis = JSON.parse(content);

      // Ensure all slider values are within 0-100
      Object.keys(analysis.communicationStyle).forEach((key) => {
        const value = analysis.communicationStyle[key as keyof typeof analysis.communicationStyle];
        if (value < 0 || value > 100) {
          analysis.communicationStyle[key as keyof typeof analysis.communicationStyle] = Math.max(
            0,
            Math.min(100, value)
          );
        }
      });

      return analysis;
    } catch (error) {
      console.error('Failed to parse quiz analysis:', error);
      // Return default neutral values
      return {
        communicationStyle: {
          directness: 50,
          formality: 50,
          warmth: 50,
          supportMode: 50,
          humor: 50,
          teasing: 50,
          metaCommunication: 50,
          boundaryStrength: 50,
          structureVsStory: 50,
          validationVsSolutioning: 50,
          encouragementVsChallenge: 50,
          detailDepth: 50,
          concreteVsAbstract: 50,
          questionDensity: 50,
          complimentRequestRatio: 50,
        },
        keyInsights: ['Analysis in progress - try again in a moment'],
        patterns: [],
        suggestions: [],
      };
    }
  }

  /**
   * Store quiz response in database
   */
  async storeQuizResponse(
    userId: string,
    contactId: string,
    cardNumber: number,
    cardType: string,
    question: string,
    inputType: string,
    answer: any
  ): Promise<void> {
    const { error } = await supabaseService.from('relationship_quiz_responses').insert({
      user_id: userId,
      contact_id: contactId,
      card_number: cardNumber,
      card_type: cardType,
      question,
      input_type: inputType,
      answer,
    });

    if (error) {
      console.error('Failed to store quiz response:', error);
      throw new Error('Failed to store quiz response');
    }
  }

  /**
   * Get previous quiz responses for a contact
   */
  async getQuizResponses(userId: string, contactId: string): Promise<QuizResponse[]> {
    const { data, error } = await supabaseService
      .from('relationship_quiz_responses')
      .select('card_number, card_type, question, input_type, answer')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('card_number', { ascending: true });

    if (error) {
      console.error('Failed to fetch quiz responses:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      cardNumber: row.card_number,
      cardType: row.card_type,
      question: row.question,
      inputType: row.input_type,
      answer: row.answer,
    }));
  }

  /**
   * Check if user has completed quiz for a contact
   */
  async hasCompletedQuiz(userId: string, contactId: string): Promise<boolean> {
    const { data, error } = await supabaseService
      .from('relationship_quiz_responses')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_id', contactId);

    if (error) return false;
    return (data || []).length >= 5; // At least 5 cards completed
  }
}

export const relationshipQuizService = new RelationshipQuizService();

