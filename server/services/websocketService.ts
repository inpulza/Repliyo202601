import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from '../app';

interface NotificationPayload {
  type: 'new_message' | 'sync_complete' | 'agent_reply';
  brandId: string;
  data: any;
}

interface ConnectedClient {
  ws: WebSocket;
  brandId: string | null;
  userId: string | null;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ConnectedClient> = new Map();

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      log('[WebSocket] Client connected', 'ws');
      
      this.clients.set(ws, { ws, brandId: null, userId: null });

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          log('[WebSocket] Error parsing message', 'ws');
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        log('[WebSocket] Client disconnected', 'ws');
      });

      ws.on('error', (error) => {
        log(`[WebSocket] Error: ${error.message}`, 'ws');
        this.clients.delete(ws);
      });
    });

    log('[WebSocket] Service initialized on /ws', 'ws');
  }

  private handleMessage(ws: WebSocket, data: any): void {
    if (data.type === 'subscribe') {
      const client = this.clients.get(ws);
      if (client) {
        client.brandId = data.brandId || null;
        client.userId = data.userId || null;
        log(`[WebSocket] Client subscribed to brand: ${client.brandId}`, 'ws');
        
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          brandId: client.brandId 
        }));
      }
    }
  }

  notifyNewMessage(brandId: string, messageData: any): void {
    this.broadcast({
      type: 'new_message',
      brandId,
      data: messageData
    });
  }

  notifySyncComplete(brandId: string, stats: { newMessages: number; totalMessages: number }): void {
    this.broadcast({
      type: 'sync_complete',
      brandId,
      data: stats
    });
  }

  notifyAgentReply(brandId: string, replyData: any): void {
    this.broadcast({
      type: 'agent_reply',
      brandId,
      data: replyData
    });
  }

  private broadcast(payload: NotificationPayload): void {
    if (!this.wss) return;

    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!client.brandId || client.brandId === payload.brandId) {
          client.ws.send(message);
          sentCount++;
        }
      }
    });

    if (sentCount > 0) {
      log(`[WebSocket] Broadcast ${payload.type} to ${sentCount} clients`, 'ws');
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getClientsByBrand(brandId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.brandId === brandId) count++;
    });
    return count;
  }
}

export const websocketService = new WebSocketService();
