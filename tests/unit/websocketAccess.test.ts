import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canReceiveBrandEvent } from "../../server/services/websocketService";
import {
  shouldReconnectWebSocket,
  WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE,
} from "../../shared/websocketAccess";

describe("WebSocket brand event access", () => {
  it("scopes a client to the brand in its authenticated session", () => {
    const client = {
      userRole: "client",
      userBrandId: "brand-a",
      brandId: "brand-a",
    };

    assert.equal(canReceiveBrandEvent(client, "brand-a"), true);
    assert.equal(canReceiveBrandEvent(client, "brand-b"), false);
  });

  it("never treats a missing client brand as wildcard access", () => {
    const client = {
      userRole: "client",
      userBrandId: null,
      brandId: null,
    };

    assert.equal(canReceiveBrandEvent(client, "brand-a"), false);
  });

  it("lets an unsubscribed administrator receive every brand", () => {
    const admin = {
      userRole: "admin",
      userBrandId: null,
      brandId: null,
    };

    assert.equal(canReceiveBrandEvent(admin, "brand-a"), true);
    assert.equal(canReceiveBrandEvent(admin, "brand-b"), true);
  });

  it("honors an administrator's explicit brand subscription", () => {
    const admin = {
      userRole: "admin",
      userBrandId: null,
      brandId: "brand-a",
    };

    assert.equal(canReceiveBrandEvent(admin, "brand-a"), true);
    assert.equal(canReceiveBrandEvent(admin, "brand-b"), false);
  });
});

describe("WebSocket reconnect policy", () => {
  it("reconnects after a transient transport close", () => {
    assert.equal(shouldReconnectWebSocket(1006), true);
  });

  it("does not reconnect after a normal close or revoked access", () => {
    assert.equal(shouldReconnectWebSocket(1000), false);
    assert.equal(shouldReconnectWebSocket(WEBSOCKET_ACCESS_REVOKED_CLOSE_CODE), false);
  });
});
