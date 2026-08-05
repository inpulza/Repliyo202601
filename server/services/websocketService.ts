import { WebSocketServer, WebSocket } from 'ws';
import {
  WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE,
  WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE,
  WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE,
} from '@shared/websocketAccess';
import { Server, IncomingMessage } from 'http';
import cookie from 'cookie';
import signature from 'cookie-signature';
import { log } from '../logger';
import { sessionSecret } from '../sessionConfig';
import { evaluateSessionAccess, type SessionAccessRecord } from '../security/sessionAccess';

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

type WebSocketAuthenticationResult =
  | {
      allowed: true;
      userId: string;
      role: string;
      brandId: string | null;
    }
  | {
      allowed: false;
      closeCode: number;
      reason: string;
    };

type WebSocketAuthenticationStage =
  | 'connection_authentication'
  | 'session_store_lookup'
  | 'authorization_lookup';

class WebSocketAuthenticationFailure extends Error {
  constructor(
    readonly stage: WebSocketAuthenticationStage,
    cause: unknown,
  ) {
    super('WebSocket authentication failed', { cause });
    this.name = 'WebSocketAuthenticationFailure';
  }
}

export interface WebSocketServiceOptions {
  sessionSecret?: string;
  getSessionUserId?: (sessionId: string) => Promise<string | null>;
  getSessionAccessByUserId?: (userId: string) => Promise<SessionAccessRecord | null | undefined>;
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
  private readonly findSessionAccess: (userId: string) => Promise<SessionAccessRecord | null | undefined>;
  private readonly logger: typeof log;

  constructor(options: WebSocketServiceOptions = {}) {
    this.sessionSecret = options.sessionSecret || sessionSecret;
    this.findSessionUserId = options.getSessionUserId || ((sessionId) => this.getSessionUserIdFromStore(sessionId));
    this.findSessionAccess = options.getSessionAccessByUserId || (async (userId) => {
      const { storage } = await import('../storage');
      return storage.getSessionAccessByUserId(userId);
    });
    this.logger = options.logger || log;
  }

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        const authentication = await this.authenticateConnection(req);

        if (!authentication.allowed) {
          this.logger(`[WebSocket] Connection rejected - ${authentication.reason}`, 'ws');
          ws.close(authentication.closeCode, authentication.reason);
          return;
        }

        const sessionData = authentication;

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
        this.logger(JSON.stringify(webSocketAuthenticationFailureContext(error)), 'ws');
        ws.close(WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE, 'Try again later');
      }
    });

    this.logger('[WebSocket] Service initialized on /ws (authenticated)', 'ws');
  }

  private async authenticateConnection(req: IncomingMessage): Promise<WebSocketAuthenticationResult> {
    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionCookie = cookies['connect.sid'];

    if (!sessionCookie) {
      return this.authenticationRequired();
    }

    if (!sessionCookie.startsWith('s:')) {
      this.logger('[WebSocket] Unsigned session cookie rejected', 'ws');
      return this.authenticationRequired();
    }

    const sessionId = signature.unsign(sessionCookie.slice(2), this.sessionSecret);
    if (!sessionId) {
      this.logger('[WebSocket] Invalid session signature', 'ws');
      return this.authenticationRequired();
    }

    let userId: string | null;
    try {
      userId = await this.findSessionUserId(sessionId);
    } catch (error) {
      throw new WebSocketAuthenticationFailure('session_store_lookup', error);
    }

    if (!userId) {
      return this.authenticationRequired();
    }

    let accessRecord: SessionAccessRecord | null | undefined;
    try {
      accessRecord = await this.findSessionAccess(userId);
    } catch (error) {
      throw new WebSocketAuthenticationFailure('authorization_lookup', error);
    }

    if (!accessRecord) {
      return this.accessRevoked();
    }

    const decision = evaluateSessionAccess(accessRecord);
    if (!decision.allowed) {
      this.logger(`[WebSocket] Connection rejected - ${decision.code}`, 'ws');
      return this.accessRevoked();
    }

    const { user } = accessRecord;

    return {
      allowed: true,
      userId: user.id,
      role: user.role,
      brandId: user.brandId,
    };
  }

  private authenticationRequired(): WebSocketAuthenticationResult {
    return {
      allowed: false,
      closeCode: WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE,
      reason: 'Not authenticated',
    };
  }

  private accessRevoked(): WebSocketAuthenticationResult {
    return {
      allowed: false,
      closeCode: WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE,
      reason: 'Access revoked',
    };
  }

  private async getSessionUserIdFromStore(sessionId: string): Promise<string | null> {
    const { sessionStore } = await import('../sessionStore');
    if (!sessionStore?.get) {
      throw new Error('Session store unavailable');
    }

    return new Promise((resolve, reject) => {
      sessionStore.get(sessionId, (error: unknown, session?: { userId?: string } | null) => {
        if (error) {
          reject(new Error('Session store lookup failed', { cause: error }));
          return;
        }

        resolve(session?.userId || null);
      });
    });
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

  disconnectUser(userId: string): number {
    return this.disconnectClients(
      (client) => client.userId === userId,
      'User access revoked',
    );
  }

  disconnectBrand(brandId: string): number {
    return this.disconnectClients(
      (client) => client.userRole !== 'admin' && client.userBrandId === brandId,
      'Brand access revoked',
    );
  }

  private disconnectClients(
    matches: (client: ConnectedClient) => boolean,
    reason: string,
  ): number {
    let disconnected = 0;

    this.clients.forEach((client, socket) => {
      if (!matches(client)) return;

      this.clients.delete(socket);
      socket.close(WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE, reason);
      disconnected += 1;
    });

    return disconnected;
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

function webSocketAuthenticationFailureContext(error: unknown) {
  const stage = error instanceof WebSocketAuthenticationFailure
    ? error.stage
    : 'connection_authentication';
  const rootError = getRootError(error);
  const code = getSafeErrorCode(rootError);

  return {
    event: 'websocket_authentication_failed',
    stage,
    outcome: 'retryable_close',
    closeCode: WEBSOCKET_TRANSIENT_FAILURE_CLOSE_CODE,
    error: {
      name: getSafeErrorName(rootError),
      ...(code ? { code } : {}),
      message: getSafeErrorMessage(rootError),
    },
  };
}

function getRootError(error: unknown): unknown {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!(current instanceof Error) || !(current.cause instanceof Error)) break;
    current = current.cause;
  }

  return current;
}

function getSafeErrorName(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';

  const safeName = error.name.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64);
  return safeName || 'Error';
}

function getSafeErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('code' in error)) return undefined;

  const code = (error as Error & { code?: unknown }).code;
  if (typeof code !== 'string' && typeof code !== 'number') return undefined;

  const safeCode = String(code).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64);
  return safeCode || undefined;
}

function getSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Non-Error thrown';

  return redactSensitiveErrorText(error.message).slice(0, 240) || 'No error message';
}

function redactSensitiveErrorText(message: string): string {
  return message
    .replace(/\b(?:cookie|authorization)\s*[:=]\s*[^\r\n]*/gi, '[redacted-header]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi, '[redacted-url]')
    .replace(
      /\b(cookie|connect\.sid|session(?:[_-]?id)?|token|password|secret|authorization|api[_-]?key|request[_-]?body|body|payload)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1=[redacted]',
    )
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[redacted-token]')
    .replace(/\b[a-zA-Z0-9_-]{24,}\b/g, '[redacted-value]');
}

export const websocketService = new WebSocketService();
