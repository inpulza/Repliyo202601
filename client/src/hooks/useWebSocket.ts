import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPayload {
  type: 'new_message' | 'sync_complete' | 'agent_reply' | 'agent_cooldown' | 'crisis_alert' | 'subscribed' | 'connected' | 'error';
  brandId?: string;
  data?: any;
  message?: string;
  userId?: string;
}

interface UseWebSocketOptions {
  brandId?: string;
  userId?: string;
  onNewMessage?: (data: any) => void;
  onSyncComplete?: (data: any) => void;
  onAgentReply?: (data: any) => void;
  onAgentCooldown?: (data: any) => void;
  onCrisisAlert?: (data: any) => void;
  showToasts?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { brandId, userId, onNewMessage, onSyncComplete, onAgentReply, onAgentCooldown, onCrisisAlert, showToasts = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const onNewMessageRef = useRef(onNewMessage);
  const onSyncCompleteRef = useRef(onSyncComplete);
  const onAgentReplyRef = useRef(onAgentReply);
  const onAgentCooldownRef = useRef(onAgentCooldown);
  const onCrisisAlertRef = useRef(onCrisisAlert);
  const showToastsRef = useRef(showToasts);
  const brandIdRef = useRef(brandId);
  const userIdRef = useRef(userId);

  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete; }, [onSyncComplete]);
  useEffect(() => { onAgentReplyRef.current = onAgentReply; }, [onAgentReply]);
  useEffect(() => { onAgentCooldownRef.current = onAgentCooldown; }, [onAgentCooldown]);
  useEffect(() => { onCrisisAlertRef.current = onCrisisAlert; }, [onCrisisAlert]);
  useEffect(() => { showToastsRef.current = showToasts; }, [showToasts]);
  useEffect(() => { brandIdRef.current = brandId; }, [brandId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const sendSubscribe = useCallback(() => {
    const currentBrandId = brandIdRef.current;
    const currentUserId = userIdRef.current;
    if (wsRef.current?.readyState === WebSocket.OPEN && (currentBrandId || currentUserId)) {
      console.log('[useWebSocket] Sending subscribe message for brandId:', currentBrandId);
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        brandId: currentBrandId,
        userId: currentUserId
      }));
    }
  }, []);

  const connect = useCallback(() => {
    console.log('[useWebSocket] connect() called | Current state:', wsRef.current?.readyState);
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[useWebSocket] Already connected or connecting, skipping');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      console.log('[useWebSocket] Creating new WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useWebSocket] Connection opened');
        setIsConnected(true);
        sendSubscribe();
      };

      ws.onmessage = (event) => {
        try {
          const payload: NotificationPayload = JSON.parse(event.data);
          setLastMessage(payload);

          const currentBrandId = brandIdRef.current;

          switch (payload.type) {
            case 'new_message':
              if (currentBrandId && payload.brandId && payload.brandId !== currentBrandId) {
                console.debug('[WebSocket] Ignoring message for different brand:', payload.brandId, 'vs active:', currentBrandId);
                break;
              }
              onNewMessageRef.current?.(payload.data);
              break;
            case 'sync_complete':
              onSyncCompleteRef.current?.(payload.data);
              break;
            case 'agent_reply':
              onAgentReplyRef.current?.(payload.data);
              break;
            case 'agent_cooldown':
              onAgentCooldownRef.current?.(payload.data);
              if (showToastsRef.current && payload.data?.remainingSeconds !== undefined) {
                toast({
                  title: "Mensaje omitido por cooldown",
                  description: `El agente esperará ${payload.data.remainingSeconds ?? 0}s antes de responder`,
                  variant: "default",
                });
              }
              break;
            case 'crisis_alert':
              onCrisisAlertRef.current?.(payload.data);
              if (showToastsRef.current) {
                const severity = payload.data?.severity || 'P1';
                toast({
                  title: `⚠️ Alerta ${severity} detectada`,
                  description: payload.data?.messagePreview?.substring(0, 80) || 'Nuevo mensaje crítico requiere atención',
                  variant: "destructive",
                });
              }
              break;
            case 'subscribed':
            case 'connected':
              break;
            case 'error':
              console.error('[WebSocket] Server error:', payload.message);
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('[useWebSocket] Connection closed | code:', event.code, '| reason:', event.reason, '| wasClean:', event.wasClean);
        setIsConnected(false);
        wsRef.current = null;
        
        if (event.code !== 1000) {
          console.log('[useWebSocket] Scheduling reconnect in 5 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [sendSubscribe, toast]);

  const disconnect = useCallback(() => {
    console.log('[useWebSocket] disconnect() called');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    console.log('[useWebSocket] EFFECT: Initial connection');
    connect();
    return () => {
      console.log('[useWebSocket] EFFECT: Cleanup - disconnecting');
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && brandId) {
      console.log('[useWebSocket] EFFECT: Brand changed, re-subscribing to:', brandId);
      sendSubscribe();
    }
  }, [brandId, userId, sendSubscribe]);

  return {
    isConnected,
    lastMessage,
    disconnect,
    reconnect: connect
  };
}
