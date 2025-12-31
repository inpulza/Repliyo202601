import { type MessageAnalysis } from "@shared/schema";

const GRATITUDE_KEYWORDS_ES = [
  'gracias', 'muchas gracias', 'mil gracias', 'te agradezco', 'agradezco',
  'agradecido', 'agradecida', 'excelente', 'perfecto', 'genial', 'super',
  'buenísimo', 'ok perfecto', 'vale gracias', 'ok gracias', 'listo gracias',
  'entendido', 'ya entendi', 'me queda claro', 'todo claro', 'de acuerdo',
  'ok', 'vale', 'listo', 'bien', 'bueno', 'ya vi', 'ya veo', 'anotado'
];

const GRATITUDE_KEYWORDS_EN = [
  'thanks', 'thank you', 'thx', 'ty', 'thank u', 'thanks a lot', 'thanks so much',
  'appreciate it', 'appreciated', 'great', 'perfect', 'awesome', 'excellent',
  'got it', 'understood', 'makes sense', 'i see', 'clear', 'okay', 'ok', 'alright',
  'sounds good', 'noted', 'will do'
];

const QUESTION_INDICATORS = ['?', '¿', 'pregunta', 'question', 'cómo', 'cuándo', 'dónde', 'qué', 'cuál', 'cuánto', 'por qué', 'how', 'when', 'where', 'what', 'which', 'why', 'who'];

const NEW_REQUEST_INDICATORS = [
  'pero', 'además', 'también', 'otra cosa', 'y otra', 'y además', 'necesito',
  'quiero', 'puedes', 'podrías', 'quisiera', 'me gustaría', 'tengo otra', 'una duda más',
  'but', 'also', 'another', 'i need', 'i want', 'can you', 'could you', 'i would like',
  'one more thing', 'another question'
];

export interface ThankYouDetectorConfig {
  maxWords?: number;
  useAI?: boolean;
}

export class ThankYouDetector {
  private maxWords: number;
  private useAI: boolean;

  constructor(config: ThankYouDetectorConfig = {}) {
    this.maxWords = config.maxWords || 15;
    this.useAI = config.useAI || false;
  }

  analyzeMessage(message: string): MessageAnalysis {
    const normalizedMessage = message.toLowerCase().trim();
    const words = normalizedMessage.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    const hasQuestion = this.detectQuestion(normalizedMessage);
    const hasNewRequest = this.detectNewRequest(normalizedMessage);
    const isGratitudeExpression = this.detectGratitude(normalizedMessage);

    if (hasQuestion) {
      return {
        isThankYou: false,
        confidence: 0.95,
        hasQuestion: true,
        hasNewRequest: hasNewRequest,
        reasoning: 'Message contains a question indicator'
      };
    }

    if (hasNewRequest) {
      return {
        isThankYou: false,
        confidence: 0.90,
        hasQuestion: false,
        hasNewRequest: true,
        reasoning: 'Message contains a new request indicator'
      };
    }

    if (wordCount > this.maxWords) {
      return {
        isThankYou: false,
        confidence: 0.70,
        hasQuestion: false,
        hasNewRequest: false,
        reasoning: `Message is too long (${wordCount} words > ${this.maxWords} max) - likely contains additional content`
      };
    }

    if (isGratitudeExpression) {
      const confidence = this.calculateGratitudeConfidence(normalizedMessage, wordCount);
      return {
        isThankYou: true,
        confidence,
        hasQuestion: false,
        hasNewRequest: false,
        reasoning: 'Message matches gratitude/confirmation pattern'
      };
    }

    return {
      isThankYou: false,
      confidence: 0.50,
      hasQuestion: false,
      hasNewRequest: false,
      reasoning: 'Message does not match known patterns'
    };
  }

  private detectQuestion(message: string): boolean {
    for (const indicator of QUESTION_INDICATORS) {
      if (message.includes(indicator)) {
        return true;
      }
    }
    return false;
  }

  private detectNewRequest(message: string): boolean {
    for (const indicator of NEW_REQUEST_INDICATORS) {
      if (message.includes(indicator)) {
        return true;
      }
    }
    return false;
  }

  private detectGratitude(message: string): boolean {
    const allKeywords = [...GRATITUDE_KEYWORDS_ES, ...GRATITUDE_KEYWORDS_EN];
    
    for (const keyword of allKeywords) {
      if (message.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  private calculateGratitudeConfidence(message: string, wordCount: number): number {
    let confidence = 0.80;
    
    if (message.startsWith('gracias') || message.startsWith('thanks') || message.startsWith('thank')) {
      confidence += 0.10;
    }
    
    if (wordCount <= 3) {
      confidence += 0.05;
    } else if (wordCount <= 5) {
      confidence += 0.02;
    } else if (wordCount > 10) {
      confidence -= 0.10;
    }
    
    const emojis = ['😊', '🙂', '👍', '🙏', '❤️', '💯', '✅', '👌'];
    for (const emoji of emojis) {
      if (message.includes(emoji)) {
        confidence += 0.05;
        break;
      }
    }
    
    return Math.min(confidence, 0.99);
  }

  async analyzeWithAI(message: string): Promise<MessageAnalysis> {
    console.log('[ThankYouDetector] AI analysis requested but not yet implemented, falling back to heuristics');
    return this.analyzeMessage(message);
  }
}

export const thankYouDetector = new ThankYouDetector();
