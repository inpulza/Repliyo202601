import { users, type User } from "@shared/schema";
import { db } from "../../db";
import { eq, or } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
// ADAPTED: Uses existing users table with replitId, profileImageUrl, authProvider fields
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  upsertUserFromOAuth(claims: OAuthClaims): Promise<User>;
}

export interface OAuthClaims {
  sub: string;  // Replit user ID
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.replitId, replitId));
    return user;
  }

  async upsertUserFromOAuth(claims: OAuthClaims): Promise<User> {
    const { sub: replitId, email, first_name, last_name, profile_image_url } = claims;
    
    // 1. Check if user already exists by replitId
    let existingUser = await this.getUserByReplitId(replitId);
    
    // 2. If not found by replitId, try to find by email (merge accounts)
    if (!existingUser && email) {
      const [userByEmail] = await db.select().from(users).where(eq(users.email, email));
      if (userByEmail) {
        // Link existing account with Replit ID
        const [updated] = await db.update(users)
          .set({
            replitId,
            profileImageUrl: profile_image_url || userByEmail.profileImageUrl,
            authProvider: 'replit',
          })
          .where(eq(users.id, userByEmail.id))
          .returning();
        return updated;
      }
    }
    
    // 3. If user exists by replitId, update their info
    if (existingUser) {
      const [updated] = await db.update(users)
        .set({
          profileImageUrl: profile_image_url || existingUser.profileImageUrl,
          name: first_name && last_name 
            ? `${first_name} ${last_name}` 
            : first_name || existingUser.name,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    }
    
    // 4. Create new OAuth user (no password, no brandId yet)
    const name = first_name && last_name 
      ? `${first_name} ${last_name}` 
      : first_name || email?.split('@')[0] || 'OAuth User';
    
    const [newUser] = await db.insert(users)
      .values({
        email: email || `${replitId}@replit.oauth`,
        name,
        replitId,
        profileImageUrl: profile_image_url,
        authProvider: 'replit',
        role: 'client', // Default role for OAuth users
        // password: null - implicitly null
        // brandId: null - OAuth users need admin to assign
      })
      .returning();
    
    return newUser;
  }
}

export const authStorage = new AuthStorage();
