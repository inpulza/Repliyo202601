import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { log } from '../app';
import { storage } from '../storage';
import cookie from 'cookie';
import signature from 'cookie-signature';

interface NotificationPayload {
  type: 'new_message' | 'sync_complete' | 'agent_reply';
  brandId: string;
  data: any;
}

interface ConnectedClient {
  ws: WebSocket;
  brandId: string | null;
  userId: string;
  userRole: string;
  userBrandId: string | null;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private sessionSecret: string = process.env.SESSION_SECRET || "dev-secret-change-in-production";

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        const sessionData = await this.authenticateConnection(req);
        
        if (!sessionData) {
          log('[WebSocket] Connection rejected - not authenticated', 'ws');
          ws.close(4001, 'Not authenticated');
          return;
        }

        log(`[WebSocket] Client connected - user: ${sessionData.userId}`, 'ws');
        
        this.clients.set(ws, { 
          ws, 
          brandId: null, 
          userId: sessionData.userId,
          userRole: sessionData.role,
          userBrandId: sessionData.brandId
        });

        ws.send(JSON.stringify({ 
          type: 'connected', 
          userId: sessionData.userId 
        }));

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
      } catch (error) {
        log(`[WebSocket] Connection error: ${error}`, 'ws');
        ws.close(4000, 'Connection error');
      }
    });

    log('[WebSocket] Service initialized on /ws (authenticated)', 'ws');
  }

  private async authenticateConnection(req: IncomingMessage): Promise<{ userId: string; role: string; brandId: string | null } | null> {
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const sessionCookie = cookies['connect.sid'];
      
      if (!sessionCookie) {
        return null;
      }

      let sessionId = sessionCookie;
      if (sessionCookie.startsWith('s:')) {
        const unsigned = signature.unsign(sessionCookie.slice(2), this.sessionSecret);
        if (!unsigned) {
          log('[WebSocket] Invalid session signature', 'ws');
          return null;
        }
        sessionId = unsigned;
      }

      const userId = await this.getSessionUserId(sessionId);
      if (!userId) {
        return null;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        role: user.role,
        brandId: user.brandId
      };
    } catch (error) {
      log(`[WebSocket] Auth error: ${error}`, 'ws');
      return null;
    }
  }

  private async getSessionUserId(sessionId: string): Promise<string | null> {
    try {
      const { sessionStore } = await import('../sessionStore');
      return new Promise((resolve) => {
        if (sessionStore && sessionStore.get) {
          sessionStore.get(sessionId, (err: any, session: any) => {
            if (err || !session) {
              resolve(null);
            } else {
              resolve(session.userId || null);
            }
          });
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      return null;
    }
  }

  private handleMessage(ws: WebSocket, data: any): void {
    const client = this.clients.get(ws);
    if (!client) return;

    if (data.type === 'subscribe') {
      const requestedBrandId = data.brandId;
      
      if (client.userRole === 'admin') {
        client.brandId = requestedBrandId || null;
        log(`[WebSocket] Admin subscribed to brand: ${client.brandId || 'all'}`, 'ws');
      } else {
        if (requestedBrandId && requestedBrandId !== client.userBrandId) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Access denied to this brand' 
          }));
          return;
        }
        client.brandId = client.userBrandId;
        log(`[WebSocket] Client subscribed to own brand: ${client.brandId}`, 'ws');
      }
      
      ws.send(JSON.stringify({ 
        type: 'subscribed', 
        brandId: client.brandId 
      }));
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
        const canAccess = client.userRole === 'admin' || 
                         !client.brandId || 
                         client.brandId === payload.brandId;
        
        if (canAccess) {
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
