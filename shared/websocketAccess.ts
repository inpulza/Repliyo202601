export const WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE = 4001;
export const WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE = 4003;

export function isWebSocketAuthorizationCloseCode(closeCode: number): boolean {
  return closeCode === WEBSOCKET_AUTH_REQUIRED_CLOSE_CODE
    || closeCode === WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE;
}

export function shouldReconnectWebSocket(closeCode: number): boolean {
  return closeCode !== 1000 && !isWebSocketAuthorizationCloseCode(closeCode);
}
