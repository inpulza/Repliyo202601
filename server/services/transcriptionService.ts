import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { log } from "../app";

class TranscriptionService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      if (!apiKey) {
        log("[TranscriptionService] No Gemini API key available", "sync");
        return null;
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async transcribeAudio(messageId: string): Promise<string | null> {
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

      const client = this.getClient();
      if (!client) {
        return null;
      }

      log(`[TranscriptionService] Fetching audio from: ${message.mediaUrl.substring(0, 100)}...`, "sync");

      const audioResponse = await fetch(message.mediaUrl);
      if (!audioResponse.ok) {
        log(`[TranscriptionService] Failed to fetch audio: ${audioResponse.status}`, "sync");
        return null;
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      
      let contentType = audioResponse.headers.get('content-type') || 'audio/mp4';
      
      // Normalize MIME type - Instagram sends audio as video/mp4 but it's actually audio
      if (contentType === 'video/mp4') {
        contentType = 'audio/mp4';
      }
      
      log(`[TranscriptionService] Transcribing audio (${Math.round(audioBuffer.byteLength / 1024)}KB, ${contentType})`, "sync");

      // Use gemini-2.0-flash for audio transcription
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

      // Parse response - try multiple methods to extract text
      let transcription: string = '[Transcripción no disponible]';
      
      // Method 1: Direct text property
      if (response.text) {
        transcription = response.text.trim();
      } 
      // Method 2: Parse from candidates array
      else if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content?.parts && candidate.content.parts.length > 0) {
          const textPart = candidate.content.parts.find((p: any) => p.text);
          if (textPart && textPart.text) {
            transcription = textPart.text.trim();
          }
        }
      }
      // Method 3: Try to access response as raw object
      else {
        const rawResponse = response as any;
        if (rawResponse.response?.text) {
          transcription = rawResponse.response.text.trim();
        } else if (rawResponse.content?.parts?.[0]?.text) {
          transcription = rawResponse.content.parts[0].text.trim();
        }
      }
      
      log(`[TranscriptionService] Transcription complete: "${transcription.substring(0, 100)}..."`, "sync");

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
        const result = await this.transcribeAudio(message.id);
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
