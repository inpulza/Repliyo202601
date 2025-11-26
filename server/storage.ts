import { brands, users, messages, type Brand, type InsertBrand, type User, type InsertUser, type Message, type InsertMessage, type UpdateMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  getBrandByBlogId(blogId: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getMessages(brandId?: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: UpdateMessage): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(desc(brands.createdAt));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand || undefined;
  }

  async getBrandByBlogId(blogId: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.metricoolBlogId, blogId));
    return brand || undefined;
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const [brand] = await db
      .insert(brands)
      .values(insertBrand)
      .returning();
    return brand;
  }

  async updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set(updates)
      .where(eq(brands.id, id))
      .returning();
    return brand || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getMessages(brandId?: string): Promise<Message[]> {
    if (brandId) {
      return await db.select().from(messages).where(eq(messages.brandId, brandId)).orderBy(desc(messages.timestamp));
    }
    return await db.select().from(messages).orderBy(desc(messages.timestamp));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessageByMetricoolId(metricoolId: string, brandId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.metricoolId, metricoolId));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async updateMessage(id: string, updates: UpdateMessage): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return message || undefined;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }
}

export const storage = new DatabaseStorage();
