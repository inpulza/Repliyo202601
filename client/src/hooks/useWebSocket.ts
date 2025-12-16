import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPayload {
  type: 'new_message' | 'sync_complete' | 'agent_reply' | 'subscribed' | 'connected' | 'error';
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
  showToasts?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { brandId, userId, onNewMessage, onSyncComplete, onAgentReply, showToasts = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<NotificationPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        
        if (brandId || userId) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            brandId,
            userId
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload: NotificationPayload = JSON.parse(event.data);
          setLastMessage(payload);

          switch (payload.type) {
            case 'new_message':
              // Only process messages for the currently active brand to prevent cross-brand data bleed
              if (brandId && payload.brandId && payload.brandId !== brandId) {
                console.debug('[WebSocket] Ignoring message for different brand:', payload.brandId, 'vs active:', brandId);
                break;
              }
              onNewMessage?.(payload.data);
              if (showToasts) {
                toast({
                  title: 'Nuevo mensaje',
                  description: `${payload.data?.author}: ${payload.data?.content?.substring(0, 50)}...`,
                });
              }
              break;
            case 'sync_complete':
              onSyncComplete?.(payload.data);
              break;
            case 'agent_reply':
              onAgentReply?.(payload.data);
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

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [brandId, userId, onNewMessage, onSyncComplete, onAgentReply, showToasts, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && brandId) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        brandId,
        userId
      }));
    }
  }, [brandId, userId]);

  return {
    isConnected,
    lastMessage,
    disconnect,
    reconnect: connect
  };
}
