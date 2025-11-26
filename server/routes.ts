import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBrandSchema, insertUserSchema, insertMessageSchema, updateMessageSchema } from "@shared/schema";
import { hashPassword, verifyPassword, sanitizeUser, sanitizeBrand, type AuthenticatedUser } from "./auth";
import { MetricoolService } from "./services/metricool";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "User not found" });
  }

  req.user = sanitizeUser(user);
  next();
};

// Normalize provider names to match frontend types
function normalizePlatform(provider: string): string {
  const normalized = provider.toLowerCase();
  const platformMap: Record<string, string> = {
    'tiktokbusiness': 'tiktok',
    'gmb': 'google-business',
    'google_business': 'google-business',
  };
  return platformMap[normalized] || normalized;
}

// We keep 'conversation' and 'comment' in DB (matches schema)
// Frontend will convert 'conversation' -> 'dm' when displaying

const filterByBrand = (brandIdParam?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const brandId = brandIdParam || req.query.brandId as string || req.body.brandId;
    
    if (!req.user.brandId) {
      return res.status(403).json({ error: "User not associated with any brand" });
    }

    if (brandId && brandId !== req.user.brandId) {
      return res.status(403).json({ error: "Access denied to this brand" });
    }

    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(['admin', 'client']).default('client'),
    brandId: z.string().nullable().optional(),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  app.post("/api/auth/register", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can create users" });
      }

      const { email, password, name, role, brandId } = registerSchema.parse(req.body);

      if (role === 'admin') {
        return res.status(403).json({ 
          error: "Creating admin users is restricted. Contact system administrator." 
        });
      }

      if (role === 'client' && !brandId) {
        return res.status(400).json({ 
          error: "Client users must be associated with a brand" 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        brandId: brandId || null,
      });

      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      res.status(400).json({ error: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(req.user);
  });

  app.get("/api/metricool/brands", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can fetch Metricool brands" });
      }

      const userToken = process.env.METRICOOL_USER_TOKEN;
      const userId = process.env.METRICOOL_USER_ID;

      if (!userToken || !userId) {
        return res.status(500).json({ 
          error: "Metricool credentials not configured on server. Please set METRICOOL_USER_TOKEN and METRICOOL_USER_ID environment variables." 
        });
      }

      const metricool = new MetricoolService({ userToken, userId });
      const metricoolBrands = await metricool.getBrands();

      const formattedBrands = metricoolBrands.map(brand => ({
        id: brand.blogId,
        name: brand.name,
        industry: 'Social Media',
        avatar: brand.avatar || null,
        blogId: brand.blogId,
      }));

      res.json(formattedBrands);
    } catch (error: any) {
      console.error('Error fetching Metricool brands:', error);
      res.status(500).json({ error: `Failed to fetch Metricool brands: ${error.message}` });
    }
  });

  app.post("/api/brands/import", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can import brands" });
      }

      const { name, industry, avatar, blogId, agentName, tone, businessContext } = req.body;

      if (!name || !blogId) {
        return res.status(400).json({ error: "name and blogId are required" });
      }

      const userToken = process.env.METRICOOL_USER_TOKEN;
      const userId = process.env.METRICOOL_USER_ID;

      if (!userToken || !userId) {
        return res.status(500).json({ 
          error: "Metricool credentials not configured on server" 
        });
      }

      const existingBrand = await storage.getBrandByBlogId(blogId);
      if (existingBrand) {
        return res.status(409).json({ 
          error: "Brand already exists",
          brand: sanitizeBrand(existingBrand)
        });
      }

      const brand = await storage.createBrand({
        name,
        industry: industry || null,
        avatar: avatar || null,
        metricoolToken: userToken,
        metricoolUserId: userId,
        metricoolBlogId: blogId,
        agentName: agentName || `${name}Bot`,
        tone: tone || 'professional',
        businessContext: businessContext || null,
      });

      res.status(201).json(sanitizeBrand(brand));
    } catch (error: any) {
      console.error('Error importing brand:', error);
      res.status(500).json({ error: `Failed to import brand: ${error.message}` });
    }
  });
  
  app.get("/api/brands", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === 'admin') {
        const brands = await storage.getBrands();
        return res.json(brands.map(sanitizeBrand));
      }
      
      if (req.user!.brandId) {
        const brand = await storage.getBrand(req.user!.brandId);
        return res.json(brand ? [sanitizeBrand(brand)] : []);
      }
      
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  app.get("/api/brands/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === 'client' && req.params.id !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(sanitizeBrand(brand));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brand" });
    }
  });

  app.post("/api/brands", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can create brands" });
      }
      
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(validatedData);
      res.status(201).json(sanitizeBrand(brand));
    } catch (error) {
      res.status(400).json({ error: "Invalid brand data" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can list users" });
      }

      const users = await storage.getUsers();
      const sanitizedUsers = users.map(sanitizeUser);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.params.id !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can create users" });
      }

      const { password, ...validatedData } = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.get("/api/messages", requireAuth, filterByBrand(), async (req, res) => {
    try {
      let brandId = req.query.brandId as string | undefined;
      
      if (req.user!.role === 'client' && req.user!.brandId) {
        brandId = req.user!.brandId;
      }
      
      const messages = await storage.getMessages(brandId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (req.user!.role === 'client' && message.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.post("/api/messages", requireAuth, filterByBrand(), async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      if (req.user!.role === 'client' && validatedData.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.patch("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (req.user!.role === 'client' && message.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = updateMessageSchema.parse(req.body);
      const updatedMessage = await storage.updateMessage(req.params.id, validatedData);
      res.json(updatedMessage);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (req.user!.role === 'client' && message.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteMessage(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.post("/api/sync-brand/:brandId", requireAuth, async (req, res) => {
    try {
      const { brandId } = req.params;
      
      if (req.user!.role === 'client' && brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (!brand.metricoolToken || !brand.metricoolUserId || !brand.metricoolBlogId) {
        return res.status(400).json({ error: "Brand not properly configured with Metricool credentials" });
      }

      console.log(`🔄 Starting sync for brand: ${brand.name} (${brand.metricoolBlogId})`);

      const metricool = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId,
      });

      const { conversations, comments } = await metricool.getAllInboxData(brand.metricoolBlogId);

      let conversationsCount = 0;
      let commentsCount = 0;

      for (const conv of conversations) {
        if (!conv.messages || conv.messages.length === 0) continue;

        for (const msg of conv.messages) {
          try {
            let author = 'Unknown';
            let authorAvatar = null;
            let content = msg.message || msg.text || '';
            let timestamp = msg.created_time || msg.publicationDateTime || msg.timestamp || Date.now();

            // Instagram, LinkedIn, and TikTok use participants array
            if (conv.provider === 'INSTAGRAM' || conv.provider === 'LINKEDIN' || conv.provider === 'TIKTOKBUSINESS') {
              const fromId = msg.from;
              const participants = conv.participants || [];
              const fromParticipant = participants.find((p: any) => p.id === fromId);
              
              author = fromParticipant?.name || `Unknown ${conv.provider} User`;
              authorAvatar = fromParticipant?.imageProfileUrl || null;
            } else {
              // Generic fallback for other providers
              author = msg.from?.name || msg.sender?.name || 'Unknown';
              authorAvatar = msg.from?.picture || msg.sender?.picture || null;
            }

            await storage.upsertMessage({
              brandId: brand.id,
              metricoolId: `conv_${conv.id}_${msg.id || msg.timestamp}`,
              platform: normalizePlatform(conv.provider),
              type: 'conversation',
              author,
              authorAvatar,
              content,
              timestamp: new Date(timestamp),
              status: 'unread',
              rawData: { conversation: conv, message: msg },
            });
            conversationsCount++;
          } catch (error: any) {
            console.error(`Error upserting conversation message:`, error.message);
          }
        }
      }

      for (const comment of comments) {
        try {
          await storage.upsertMessage({
            brandId: brand.id,
            metricoolId: comment.id,
            platform: normalizePlatform(comment.provider),
            type: 'comment',
            author: comment.author,
            authorAvatar: comment.authorAvatar || null,
            content: comment.content,
            timestamp: new Date(comment.timestamp),
            status: 'unread',
            sourceUrl: comment.postUrl || null,
            rawData: comment.rawData || comment,
          });
          commentsCount++;
        } catch (error: any) {
          console.error(`Error upserting comment:`, error.message);
        }
      }

      console.log(`✅ Sync completed: ${conversationsCount} conversation messages, ${commentsCount} comments`);

      res.json({
        success: true,
        stats: {
          conversationsProcessed: conversations.length,
          conversationMessages: conversationsCount,
          commentsProcessed: comments.length,
          totalMessages: conversationsCount + commentsCount,
        },
      });
    } catch (error: any) {
      console.error('Error syncing brand:', error);
      res.status(500).json({ error: `Sync failed: ${error.message}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
