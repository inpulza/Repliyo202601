import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { storage } from "../storage";
import { log } from "../app";

type TranscriptionProvider = 'gemini' | 'openai';

class TranscriptionService {
  private geminiClient: GoogleGenAI | null = null;
  private openaiClient: OpenAI | null = null;

  private getGeminiClient(): GoogleGenAI | null {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      if (!apiKey) {
        log("[TranscriptionService] No Gemini API key available", "sync");
        return null;
      }
      this.geminiClient = new GoogleGenAI({ apiKey });
    }
    return this.geminiClient;
  }

  private getOpenAIClient(): OpenAI | null {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!apiKey) {
        log("[TranscriptionService] No OpenAI API key available", "sync");
        return null;
      }
      this.openaiClient = new OpenAI({ apiKey });
    }
    return this.openaiClient;
  }

  private async getProviderForBrand(brandId: string): Promise<TranscriptionProvider> {
    try {
      const agent = await storage.getAiAgentByBrand(brandId);
      if (agent?.transcriptionProvider) {
        const provider = agent.transcriptionProvider.toLowerCase();
        if (provider === 'openai') {
          return 'openai';
        }
        if (provider === 'gemini') {
          return 'gemini';
        }
      }
    } catch (error) {
      log(`[TranscriptionService] Error getting provider for brand: ${error}`, "sync");
    }
    return 'gemini';
  }

  private async transcribeWithGemini(audioBase64: string, contentType: string): Promise<string> {
    const client = this.getGeminiClient();
    if (!client) {
      throw new Error("Gemini client not available");
    }

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: contentType,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe this audio message exactly as spoken. Only output the transcription text, nothing else. If you cannot understand the audio or it's empty, respond with '[Audio no reconocible]'.",
            },
          ],
        },
      ],
    });

    let transcription: string = '[Transcripción no disponible]';
    
    if (response.text) {
      transcription = response.text.trim();
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content?.parts && candidate.content.parts.length > 0) {
        const textPart = candidate.content.parts.find((p: any) => p.text);
        if (textPart && textPart.text) {
          transcription = textPart.text.trim();
        }
      }
    } else {
      const rawResponse = response as any;
      if (rawResponse.response?.text) {
        transcription = rawResponse.response.text.trim();
      } else if (rawResponse.content?.parts?.[0]?.text) {
        transcription = rawResponse.content.parts[0].text.trim();
      }
    }

    return transcription;
  }

  private async transcribeWithOpenAI(audioBuffer: ArrayBuffer, contentType: string): Promise<string> {
    const client = this.getOpenAIClient();
    if (!client) {
      throw new Error("OpenAI client not available");
    }

    const extension = contentType.includes('mp4') ? 'mp4' : 
                      contentType.includes('mpeg') ? 'mp3' :
                      contentType.includes('wav') ? 'wav' :
                      contentType.includes('webm') ? 'webm' : 'mp4';
    
    const audioFile = new File(
      [audioBuffer], 
      `audio.${extension}`,
      { type: contentType }
    );

    try {
      const response = await client.audio.transcriptions.create({
        model: "gpt-4o-transcribe",
        file: audioFile,
        response_format: "text",
      });

      return response || '[Transcripción no disponible]';
    } catch (error: any) {
      if (error.message?.includes('gpt-4o-transcribe')) {
        log("[TranscriptionService] gpt-4o-transcribe not available, trying whisper-1", "sync");
        const response = await client.audio.transcriptions.create({
          model: "whisper-1",
          file: audioFile,
          response_format: "text",
        });
        return response || '[Transcripción no disponible]';
      }
      throw error;
    }
  }

  async transcribeAudio(messageId: string, brandId?: string): Promise<string | null> {
    try {
      const message = await storage.getMessage(messageId);
      if (!message) {
        log(`[TranscriptionService] Message ${messageId} not found`, "sync");
        return null;
      }

      if (message.mediaType !== 'audio') {
        log(`[TranscriptionService] Message ${messageId} is not audio type`, "sync");
        return null;
      }

      if (!message.mediaUrl) {
        log(`[TranscriptionService] Message ${messageId} has no media URL`, "sync");
        return null;
      }

      if (message.mediaTranscription) {
        log(`[TranscriptionService] Message ${messageId} already has transcription`, "sync");
        return message.mediaTranscription;
      }

      const effectiveBrandId = brandId || message.brandId;
      const provider = await this.getProviderForBrand(effectiveBrandId);
      
      log(`[TranscriptionService] Using ${provider.toUpperCase()} for transcription`, "sync");
      log(`[TranscriptionService] Fetching audio from: ${message.mediaUrl.substring(0, 100)}...`, "sync");

      const audioResponse = await fetch(message.mediaUrl);
      if (!audioResponse.ok) {
        log(`[TranscriptionService] Failed to fetch audio: ${audioResponse.status}`, "sync");
        return null;
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      
      let contentType = audioResponse.headers.get('content-type') || 'audio/mp4';
      
      if (contentType === 'video/mp4') {
        contentType = 'audio/mp4';
      }
      
      log(`[TranscriptionService] Transcribing audio (${Math.round(audioBuffer.byteLength / 1024)}KB, ${contentType}) with ${provider}`, "sync");

      let transcription: string;
      
      if (provider === 'openai') {
        transcription = await this.transcribeWithOpenAI(audioBuffer, contentType);
      } else {
        transcription = await this.transcribeWithGemini(audioBase64, contentType);
      }
      
      log(`[TranscriptionService] Transcription complete (${provider}): "${transcription.substring(0, 100)}..."`, "sync");

      await storage.updateMessage(messageId, {
        mediaTranscription: transcription,
        content: transcription,
      });

      return transcription;
    } catch (error: any) {
      log(`[TranscriptionService] Error transcribing audio: ${error.message}`, "sync");
      return null;
    }
  }

  async transcribePendingAudios(brandId: string, limit: number = 5): Promise<number> {
    try {
      const pendingMessages = await storage.getMessagesWithPendingTranscription(brandId, limit);
      
      if (pendingMessages.length === 0) {
        return 0;
      }

      log(`[TranscriptionService] Found ${pendingMessages.length} audio messages to transcribe for brand ${brandId}`, "sync");

      let transcribedCount = 0;
      for (const message of pendingMessages) {
        const result = await this.transcribeAudio(message.id, brandId);
        if (result) {
          transcribedCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return transcribedCount;
    } catch (error: any) {
      log(`[TranscriptionService] Error processing pending audios: ${error.message}`, "sync");
      return 0;
    }
  }
}

export const transcriptionService = new TranscriptionService();
