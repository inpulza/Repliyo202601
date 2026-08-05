import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import cookie from 'cookie';
import signature from 'cookie-signature';
import { log } from '../logger';
import { sessionSecret } from '../sessionConfig';

interface NotificationPayload {
  type: 'new_message' | 'sync_complete' | 'agent_reply' | 'agent_cooldown' | 'crisis_alert';
  brandId: string;
  data: any;
}

export interface ConnectedClientAccess {
  brandId: string | null;
  userRole: string;
  userBrandId: string | null;
}

interface ConnectedClient extends ConnectedClientAccess {
  ws: WebSocket;
  userId: string;
}

interface WebSocketUser {
  id: string;
  role: string;
  brandId: string | null;
}

export interface WebSocketServiceOptions {
  sessionSecret?: string;
  getSessionUserId?: (sessionId: string) => Promise<string | null>;
  getUser?: (userId: string) => Promise<WebSocketUser | null | undefined>;
  logger?: typeof log;
}

export function canReceiveBrandEvent(
  client: ConnectedClientAccess,
  payloadBrandId: string,
): boolean {
  if (client.userRole === 'admin') {
    return client.brandId === null || client.brandId === payloadBrandId;
  }

  return Boolean(client.userBrandId) && client.userBrandId === payloadBrandId;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private readonly sessionSecret: string;
  private readonly findSessionUserId: (sessionId: string) => Promise<string | null>;
  private readonly findUser: (userId: string) => Promise<WebSocketUser | null | undefined>;
  private readonly logger: typeof log;

  constructor(options: WebSocketServiceOptions = {}) {
    this.sessionSecret = options.sessionSecret || sessionSecret;
    this.findSessionUserId = options.getSessionUserId || ((sessionId) => this.getSessionUserIdFromStore(sessionId));
    this.findUser = options.getUser || (async (userId) => {
      const { storage } = await import('../storage');
      return storage.getUser(userId);
    });
    this.logger = options.logger || log;
  }

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        const sessionData = await this.authenticateConnection(req);
        
        if (!sessionData) {
          this.logger('[WebSocket] Connection rejected - not authenticated', 'ws');
          ws.close(4001, 'Not authenticated');
          return;
        }

        this.logger(`[WebSocket] Client connected - user: ${sessionData.userId}`, 'ws');
        
        this.clients.set(ws, { 
          ws, 
          brandId: sessionData.role === 'admin' ? null : sessionData.brandId,
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
            this.logger('[WebSocket] Error parsing message', 'ws');
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          this.logger('[WebSocket] Client disconnected', 'ws');
        });

        ws.on('error', (error) => {
          this.logger(`[WebSocket] Error: ${error.message}`, 'ws');
          this.clients.delete(ws);
        });
      } catch (error) {
        this.logger(`[WebSocket] Connection error: ${error}`, 'ws');
        ws.close(4000, 'Connection error');
      }
    });

    this.logger('[WebSocket] Service initialized on /ws (authenticated)', 'ws');
  }

  private async authenticateConnection(req: IncomingMessage): Promise<{ userId: string; role: string; brandId: string | null } | null> {
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const sessionCookie = cookies['connect.sid'];
      
      if (!sessionCookie) {
        return null;
      }

      if (!sessionCookie.startsWith('s:')) {
        this.logger('[WebSocket] Unsigned session cookie rejected', 'ws');
        return null;
      }

      const sessionId = signature.unsign(sessionCookie.slice(2), this.sessionSecret);
      if (!sessionId) {
        this.logger('[WebSocket] Invalid session signature', 'ws');
        return null;
      }

      const userId = await this.findSessionUserId(sessionId);
      if (!userId) {
        return null;
      }

      const user = await this.findUser(userId);
      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        role: user.role,
        brandId: user.brandId
      };
    } catch (error) {
      this.logger(`[WebSocket] Auth error: ${error}`, 'ws');
      return null;
    }
  }

  private async getSessionUserIdFromStore(sessionId: string): Promise<string | null> {
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
      if (data.brandId !== undefined && data.brandId !== null && typeof data.brandId !== 'string') {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid brand subscription',
        }));
        return;
      }

      const requestedBrandId = typeof data.brandId === 'string' && data.brandId.trim()
        ? data.brandId.trim()
        : null;
      
      if (client.userRole === 'admin') {
        client.brandId = requestedBrandId || null;
        this.logger(`[WebSocket] Admin subscribed to brand: ${client.brandId || 'all'}`, 'ws');
      } else {
        if (requestedBrandId && requestedBrandId !== client.userBrandId) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Access denied to this brand' 
          }));
          return;
        }
        client.brandId = client.userBrandId;
        this.logger(`[WebSocket] Client subscribed to own brand: ${client.brandId}`, 'ws');
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

  notifyAgentCooldown(brandId: string, cooldownData: {
    messageId: string;
    conversationId: string;
    remainingSeconds: number;
    platform: string;
  }): void {
    this.broadcast({
      type: 'agent_cooldown',
      brandId,
      data: cooldownData
    });
  }

  private broadcast(payload: NotificationPayload): void {
    if (!this.wss) return;

    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        const canAccess = canReceiveBrandEvent(client, payload.brandId);
        
        if (canAccess) {
          client.ws.send(message);
          sentCount++;
        }
      }
    });

    if (sentCount > 0) {
      this.logger(`[WebSocket] Broadcast ${payload.type} to ${sentCount} clients`, 'ws');
    }
  }

  notifyCrisisAlert(brandId: string, alertData: any): void {
    this.broadcast({
      type: 'crisis_alert',
      brandId,
      data: alertData
    });
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

  async shutdown(gracePeriodMs = 1_000): Promise<void> {
    const wss = this.wss;
    if (!wss) return;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        error ? reject(error) : resolve();
      };
      const timeout = setTimeout(() => {
        wss.clients.forEach((client) => client.terminate());
        finish();
      }, gracePeriodMs);

      wss.close((error) => finish(error));
      this.clients.forEach((client) => {
        client.ws.close(1001, 'Server shutting down');
      });
    });

    this.clients.clear();
    this.wss = null;
  }
}

export const websocketService = new WebSocketService();
