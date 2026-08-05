import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAssignUserToBrand,
  canAccessBrand,
  getAccessibleBrandResource,
} from "../../server/security/brandAccess";

describe("brand access", () => {
  it("allows a client to access its own brand", () => {
    assert.equal(
      canAccessBrand({ role: "client", brandId: "brand-a" }, "brand-a"),
      true,
    );
  });

  it("denies a client access to another brand", () => {
    assert.equal(
      canAccessBrand({ role: "client", brandId: "brand-a" }, "brand-b"),
      false,
    );
  });

  it("denies an unassigned client", () => {
    assert.equal(
      canAccessBrand({ role: "client", brandId: null }, "brand-a"),
      false,
    );
  });

  it("allows an administrator to access any brand", () => {
    assert.equal(
      canAccessBrand({ role: "admin", brandId: null }, "brand-b"),
      true,
    );
  });

  it("obscures inaccessible resources as missing", () => {
    const foreignMessage = { id: "message-b", brandId: "brand-b" };

    assert.equal(
      getAccessibleBrandResource(
        { role: "client", brandId: "brand-a" },
        foreignMessage,
      ),
      undefined,
    );
    assert.equal(
      getAccessibleBrandResource(
        { role: "client", brandId: "brand-b" },
        foreignMessage,
      ),
      foreignMessage,
    );
  });

  it("only assigns active users from the conversation brand", () => {
    assert.equal(
      canAssignUserToBrand({ brandId: "brand-a", status: "active" }, "brand-a"),
      true,
    );
    assert.equal(
      canAssignUserToBrand({ brandId: "brand-b", status: "active" }, "brand-a"),
      false,
    );
    assert.equal(
      canAssignUserToBrand({ brandId: "brand-a", status: "suspended" }, "brand-a"),
      false,
    );
    assert.equal(canAssignUserToBrand(null, "brand-a"), false);
    assert.equal(canAssignUserToBrand(undefined, "brand-a"), false);
    assert.equal(
      canAssignUserToBrand({ brandId: null, status: "active" }, "brand-a"),
      false,
    );
  });
});
