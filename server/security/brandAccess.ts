export interface BrandAccessPrincipal {
  role: string;
  brandId: string | null;
}

export interface BrandScopedResource {
  brandId: string;
}

export interface BrandAssignableUser {
  brandId: string | null;
  status: string;
}

export function canAccessBrand(
  user: BrandAccessPrincipal | null | undefined,
  resourceBrandId: string,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  return Boolean(user.brandId) && user.brandId === resourceBrandId;
}

export function getAccessibleBrandResource<T extends BrandScopedResource>(
  user: BrandAccessPrincipal | null | undefined,
  resource: T | null | undefined,
): T | undefined {
  if (!resource || !canAccessBrand(user, resource.brandId)) {
    return undefined;
  }

  return resource;
}

export function canAssignUserToBrand(
  user: BrandAssignableUser | null | undefined,
  resourceBrandId: string,
): boolean {
  return Boolean(
    user && user.status === "active" && user.brandId === resourceBrandId,
  );
}
