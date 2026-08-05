export const WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE = 4003;

export function shouldReconnectWebSocket(closeCode: number): boolean {
  return closeCode !== 1000 && closeCode !== WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE;
}
