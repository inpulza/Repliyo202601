import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBrandSchema, insertUserSchema, insertMessageSchema, updateMessageSchema, updateConversationSchema, insertSocialAccountSchema, updateReminderRulesSchema } from "@shared/schema";
import { hashPassword, verifyPassword, sanitizeUser, sanitizeBrand, type AuthenticatedUser } from "./auth";
import { MetricoolService } from "./services/metricool";
import { syncService } from "./services/syncService";
import { websocketService } from "./services/websocketService";
import { triggerSummaryUpdateAsync, checkAndUpdateSummary } from "./services/summaryService";
import { authRateLimiter, syncRateLimiter, aiRateLimiter, sendMessageRateLimiter } from "./middleware/rateLimiter";
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

const filterByBrand = (brandIdParamName?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let brandId = brandIdParamName 
      ? req.params[brandIdParamName] 
      : (req.query.brandId as string || req.body.brandId);
    
    if (req.user.role !== 'admin') {
      if (!req.user.brandId) {
        return res.status(403).json({ error: "User not associated with any brand" });
      }
      
      if (brandIdParamName && (!brandId || brandId.trim() === '')) {
        return res.status(400).json({ error: "Brand ID is required" });
      }
      
      if (brandId && brandId !== req.user.brandId) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }
      
      brandId = brandId || req.user.brandId;
    }
    
    if (brandId) {
      const brand = await storage.getBrand(brandId);
      if (brand && brand.status === 'archived') {
        return res.status(403).json({ 
          error: "Brand archived",
          message: "Esta marca ha sido archivada y no está disponible."
        });
      }
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

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
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

      if (user.role === 'client' && user.brandId) {
        const brand = await storage.getBrand(user.brandId);
        if (brand && brand.status === 'archived') {
          return res.status(403).json({ 
            error: "Account suspended",
            message: "Tu cuenta ha sido suspendida. Contacta al administrador para más información."
          });
        }
      }

      req.session.userId = user.id;
      
      // Force session save before responding
      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Session save error:', err);
          return res.status(500).json({ error: "Failed to create session" });
        }
        console.log(`[Auth] Login successful - userId: ${user.id}, sessionID: ${req.sessionID}`);
        res.json(sanitizeUser(user));
      });
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

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "La contraseña actual es incorrecta" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedNewPassword);

      res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Datos inválidos" });
      }
      console.error('Error changing password:', error);
      res.status(500).json({ error: "Error al cambiar la contraseña" });
    }
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
        detectedProviders: brand.detectedProviders || [],
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

      const { name, industry, avatar, blogId, agentName, tone, businessContext, detectedProviders, selectedProviders } = req.body;

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

      if (detectedProviders && Array.isArray(detectedProviders)) {
        const selectedSet = new Set(selectedProviders || []);
        
        for (const dp of detectedProviders) {
          await storage.upsertSocialAccount({
            brandId: brand.id,
            provider: dp.provider,
            isActive: selectedSet.has(dp.provider),
            accountName: dp.accountName || null,
            accountAvatar: dp.accountAvatar || null,
          });
        }
      }

      const socialAccounts = await storage.getSocialAccountsByBrand(brand.id);

      res.status(201).json({
        ...sanitizeBrand(brand),
        socialAccounts,
      });
    } catch (error: any) {
      console.error('Error importing brand:', error);
      res.status(500).json({ error: `Failed to import brand: ${error.message}` });
    }
  });

  // ========== SOCIAL ACCOUNTS ENDPOINTS ==========
  
  app.get("/api/brands/:id/social-accounts", requireAuth, async (req, res) => {
    try {
      const brandId = req.params.id;
      
      if (req.user!.role === 'client' && brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const socialAccounts = await storage.getSocialAccountsByBrand(brandId);
      res.json(socialAccounts);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
      res.status(500).json({ error: "Failed to fetch social accounts" });
    }
  });

  const updateSocialAccountStatusSchema = z.object({
    isActive: z.boolean(),
  });

  app.put("/api/brands/:id/social-accounts/:provider", requireAuth, async (req, res) => {
    try {
      const brandId = req.params.id;
      const provider = req.params.provider;
      
      if (req.user!.role === 'client' && brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied to this brand" });
      }

      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const existingAccount = await storage.getSocialAccount(brandId, provider);
      if (!existingAccount) {
        return res.status(404).json({ error: "Social account not found for this provider" });
      }

      const { isActive } = updateSocialAccountStatusSchema.parse(req.body);
      const updated = await storage.updateSocialAccountStatus(brandId, provider, isActive);

      res.json(updated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request body" });
      }
      console.error('Error updating social account:', error);
      res.status(500).json({ error: "Failed to update social account" });
    }
  });

  app.post("/api/brands/:id/social-accounts/refresh", requireAuth, async (req, res) => {
    try {
      const brandId = req.params.id;
      
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can refresh social accounts" });
      }

      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const metricoolService = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId
      });

      const metricoolBrands = await metricoolService.getBrands();
      const matchingBrand = metricoolBrands.find(b => b.blogId === brand.metricoolBlogId);

      if (!matchingBrand) {
        return res.status(404).json({ error: "Brand not found in Metricool" });
      }

      const detectedProviders = matchingBrand.detectedProviders || [];
      const existingAccounts = await storage.getSocialAccountsByBrand(brandId);
      const existingProviderMap = new Map(existingAccounts.map(a => [a.provider, a]));

      let newCount = 0;
      let updatedCount = 0;

      for (const dp of detectedProviders) {
        const existing = existingProviderMap.get(dp.provider);
        if (!existing) {
          await storage.upsertSocialAccount({
            brandId: brand.id,
            provider: dp.provider,
            isActive: false,
            accountName: dp.accountName || null,
            accountAvatar: dp.accountAvatar || null,
          });
          newCount++;
        } else if (dp.accountName !== existing.accountName || dp.accountAvatar !== existing.accountAvatar) {
          await storage.upsertSocialAccount({
            brandId: brand.id,
            provider: dp.provider,
            isActive: existing.isActive,
            accountName: dp.accountName || existing.accountName || null,
            accountAvatar: dp.accountAvatar || existing.accountAvatar || null,
          });
          updatedCount++;
        }
      }

      const updatedAccounts = await storage.getSocialAccountsByBrand(brandId);
      res.json({ 
        message: "Social accounts refreshed",
        detected: detectedProviders.length,
        newAccounts: newCount,
        updatedAccounts: updatedCount,
        accounts: updatedAccounts 
      });
    } catch (error: any) {
      console.error('Error refreshing social accounts:', error);
      res.status(500).json({ error: "Failed to refresh social accounts" });
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

  app.put("/api/brands/:id/archive", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can archive brands" });
      }

      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const archived = await storage.archiveBrand(req.params.id);
      res.json({ 
        message: "Brand archived successfully",
        brand: sanitizeBrand(archived!)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive brand" });
    }
  });

  app.put("/api/brands/:id/unarchive", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can unarchive brands" });
      }

      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const unarchived = await storage.unarchiveBrand(req.params.id);
      res.json({ 
        message: "Brand unarchived successfully",
        brand: sanitizeBrand(unarchived!)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to unarchive brand" });
    }
  });

  app.get("/api/brands/:id/sync-status", requireAuth, filterByBrand("id"), async (req, res) => {
    try {
      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Marca no encontrada" });
      }
      res.json({ syncPaused: brand.syncPaused });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener el estado de sincronización" });
    }
  });

  app.put("/api/brands/:id/sync-status", requireAuth, filterByBrand("id"), async (req, res) => {
    try {
      const { syncPaused } = req.body;
      if (typeof syncPaused !== 'boolean') {
        return res.status(400).json({ error: "syncPaused debe ser un valor booleano" });
      }

      const brand = await storage.getBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Marca no encontrada" });
      }

      const updated = await storage.updateSyncPaused(req.params.id, syncPaused);
      res.json({ 
        message: syncPaused ? "Sincronización pausada" : "Sincronización reanudada",
        syncPaused: updated?.syncPaused 
      });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar el estado de sincronización" });
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

  // ========== CONVERSATIONS ENDPOINTS ==========
  
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      let brandId = req.query.brandId as string | undefined;
      const platform = req.query.platform as string | undefined;
      const type = req.query.type as string | undefined;
      
      if (req.user!.role === 'client' && req.user!.brandId) {
        brandId = req.user!.brandId;
      }
      
      if (!brandId && req.user!.role !== 'admin') {
        return res.status(400).json({ error: "brandId is required" });
      }
      
      // Use getInboxThreads() to get deduplicated conversations grouped by socialPostId
      let conversationsList = brandId 
        ? await storage.getInboxThreads(brandId)
        : [];
      
      if (req.user!.role === 'admin' && !brandId) {
        const brands = await storage.getBrands();
        const allConversations = await Promise.all(
          brands.map(b => storage.getInboxThreads(b.id))
        );
        conversationsList = allConversations.flat();
      }
      
      if (platform) {
        conversationsList = conversationsList.filter(c => c.platform === platform);
      }
      
      if (type) {
        conversationsList = conversationsList.filter(c => c.type === type);
      }
      
      conversationsList.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      
      const conversationsWithSocialPost = await Promise.all(
        conversationsList.map(async (conv) => {
          let socialPost = null;
          if (conv.socialPostId) {
            socialPost = await storage.getSocialPost(conv.socialPostId);
          }
          return {
            ...conv,
            socialPost,
          };
        })
      );
      
      res.json(conversationsWithSocialPost);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (req.user!.role === 'client' && conversation.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      let socialPost = null;
      if (conversation.socialPostId) {
        socialPost = await storage.getSocialPost(conversation.socialPostId);
      }
      
      res.json({ ...conversation, socialPost });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (req.user!.role === 'client' && conversation.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      let allMessages: any[] = [];
      
      // If this conversation has a socialPostId, get messages from ALL conversations
      // that share the same socialPostId (grouped comment threads)
      if (conversation.socialPostId) {
        // Security: Only get conversations with the SAME socialPostId
        const relatedConversations = await storage.getConversationsBySocialPost(
          conversation.brandId, 
          conversation.socialPostId
        );
        
        // Get messages from all related conversations
        const messageArrays = await Promise.all(
          relatedConversations.map(c => storage.getMessagesByConversation(c.id))
        );
        allMessages = messageArrays.flat();
      } else {
        // DM: just get messages from this single conversation
        allMessages = await storage.getMessagesByConversation(req.params.id);
      }
      
      allMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      res.json(allMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation messages" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (req.user!.role === 'client' && conversation.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = updateConversationSchema.parse(req.body);
      const updatedConversation = await storage.updateConversation(req.params.id, validatedData);
      
      res.json(updatedConversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.post("/api/conversations/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (req.user!.role === 'client' && conversation.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // If this is a grouped comment thread, mark all related conversations as read
      if (conversation.socialPostId) {
        // Security: Only get conversations with the SAME socialPostId
        const relatedConversations = await storage.getConversationsBySocialPost(
          conversation.brandId, 
          conversation.socialPostId
        );
        
        for (const relatedConv of relatedConversations) {
          await storage.updateConversation(relatedConv.id, { unreadCount: 0 });
          const messages = await storage.getMessagesByConversation(relatedConv.id);
          for (const msg of messages) {
            if (msg.status === 'unread') {
              await storage.updateMessage(msg.id, { status: 'read' });
            }
          }
        }
      } else {
        // DM: just mark this single conversation as read
        await storage.updateConversation(req.params.id, { unreadCount: 0 });
        const messages = await storage.getMessagesByConversation(req.params.id);
        for (const msg of messages) {
          if (msg.status === 'unread') {
            await storage.updateMessage(msg.id, { status: 'read' });
          }
        }
      }
      
      const updatedConversation = await storage.getConversation(req.params.id);
      res.json(updatedConversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark conversation as read" });
    }
  });

  // ========== REPLY TO MESSAGE ENDPOINT ==========
  
  const replyToMessageSchema = z.object({
    messageId: z.string().min(1, "Message ID is required"),
    text: z.string().min(1, "Reply text is required"),
    includeMention: z.boolean().optional().default(true),
  });

  app.post("/api/inbox/reply", requireAuth, sendMessageRateLimiter, async (req, res) => {
    try {
      const { messageId, text, includeMention } = replyToMessageSchema.parse(req.body);
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Security: Verify brand ownership for all users (not just clients)
      if (req.user!.role === 'client' && message.brandId !== req.user!.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Security: Only allow replying to inbound messages
      if (message.direction === 'outbound') {
        return res.status(400).json({ error: "Cannot reply to your own messages" });
      }
      
      const brand = await storage.getBrand(message.brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const userToken = process.env.METRICOOL_USER_TOKEN;
      const userId = process.env.METRICOOL_USER_ID;
      
      if (!userToken || !userId) {
        return res.status(500).json({ error: "Metricool credentials not configured" });
      }
      
      const metricool = new MetricoolService({ userToken, userId });
      
      // Safely parse rawData - it may be stored as JSON string in database
      let rawData: any = null;
      try {
        if (message.rawData) {
          rawData = typeof message.rawData === 'string' 
            ? JSON.parse(message.rawData) 
            : message.rawData;
        }
      } catch (parseError) {
        console.warn(`[Reply] Failed to parse rawData for message ${messageId}:`, parseError);
      }
      
      if (!rawData) {
        return res.status(400).json({ error: "Message does not have raw data for reply. This message may have been imported without full metadata." });
      }
      
      // For YouTube nested comments, use parentId instead of the reply's own ID
      let metricoolId = rawData.id || message.metricoolId;
      if (message.platform?.toLowerCase() === 'youtube' && rawData.parentId) {
        metricoolId = rawData.parentId;
        console.log(`[Reply] YouTube nested comment detected, using parentId: ${metricoolId}`);
      }
      
      if (!metricoolId) {
        return res.status(400).json({ error: "Cannot determine Metricool comment ID for reply" });
      }
      
      // Derive provider from rawData or message platform, normalize format
      let provider = rawData.provider || message.platform;
      if (!provider) {
        return res.status(400).json({ error: "Cannot determine platform provider for reply" });
      }
      // Normalize provider name for Metricool API
      const providerMap: Record<string, string> = {
        'tiktok': 'TIKTOKBUSINESS',
        'instagram': 'instagram',
        'facebook': 'FACEBOOK',
        'linkedin': 'linkedin',
        'youtube': 'youtube',
        'google-business': 'GMB',
      };
      provider = providerMap[provider.toLowerCase()] || provider;
      
      const agent = await storage.getAiAgentByBrand(brand.id);
      const autoMentionEnabled = agent?.autoMentionEnabled ?? false;
      
      let mentionUsername: string | undefined = undefined;
      if (includeMention && autoMentionEnabled) {
        const participants = rawData.participants || [];
        const ownerId = rawData.root?.owner;
        const ownerParticipant = participants.find((p: any) => p.id === ownerId);
        mentionUsername = ownerParticipant?.name || message.author;
      }
      
      if (message.type === 'comment') {
        const result = await metricool.replyToComment({
          provider: provider,
          objectId: metricoolId,
          text: text,
          blogId: brand.metricoolBlogId || '',
          mentionUsername: mentionUsername,
        });
        
        if (!result.success) {
          return res.status(500).json({ 
            error: result.error || "Failed to send reply to Metricool",
            details: result.rawResponse 
          });
        }
        
        const outboundMessage = await storage.createMessage({
          brandId: message.brandId,
          conversationId: message.conversationId,
          platform: message.platform,
          type: message.type,
          author: brand.name,
          content: mentionUsername ? `@${mentionUsername} ${text}` : text,
          timestamp: new Date(),
          status: 'sent',
          direction: 'outbound',
          parentMessageId: message.id,
          metricoolId: result.messageId || null,
          rawData: result.rawResponse || null,
          source: 'repliyo',
          internalOrigin: 'manual',
        });
        
        if (message.conversationId) {
          await storage.updateConversation(message.conversationId, {
            lastMessageAt: new Date(),
            lastMessagePreview: text.substring(0, 100),
          });
          
          // Trigger async summary update for this user (Phase 2: Persistent Memory)
          if (message.author) {
            triggerSummaryUpdateAsync(message.conversationId, message.author, message.brandId);
          }
        }
        
        res.json({
          success: true,
          message: outboundMessage,
          metricoolResponse: result.rawResponse,
        });
        
      } else if (message.type === 'conversation' || message.type === 'dm') {
        // Get conversation data for DM replies
        const conversation = message.conversationId 
          ? await storage.getConversation(message.conversationId) 
          : null;
        
        // Get threadExternalId from conversation or rawData
        const threadExternalId = conversation?.threadExternalId || rawData?.conversation?.id || rawData?.id;
        
        // Get recipient - must be the OTHER participant (not self/brand account)
        // The 'from' field of an inbound message is the customer who wrote to us
        // The 'self' field in conversation.rawData is our brand account ID
        const convRawData = rawData?.conversation?.rawData || rawData?.conversation || {};
        const selfAccountId = convRawData?.self;
        const participants = convRawData?.participants || rawData?.conversation?.participants || [];
        
        // Find recipient: the participant who is NOT the self/brand account
        let recipient: string | undefined;
        if (message.direction === 'inbound') {
          // For inbound messages, the sender (from) is who we want to reply to
          recipient = rawData?.message?.from || rawData?.from;
        }
        // Fallback: find participant that isn't self
        if (!recipient && selfAccountId && participants.length > 0) {
          const otherParticipant = participants.find((p: any) => p.id !== selfAccountId);
          recipient = otherParticipant?.id;
        }
        // Final fallback
        if (!recipient) {
          recipient = rawData?.from?.id || rawData?.root?.owner;
        }
        
        console.log("[Reply] DM recipient resolution:", { 
          recipient, 
          selfAccountId, 
          messageFrom: rawData?.message?.from || rawData?.from,
          participants: participants.map((p: any) => ({ id: p.id, name: p.name })),
        });
        
        if (!threadExternalId || !recipient) {
          console.error("[Reply] DM reply missing data:", { 
            threadExternalId, 
            recipient, 
            conversationId: message.conversationId,
            hasConversation: !!conversation 
          });
          return res.status(400).json({ error: "Cannot determine conversation or recipient for DM reply" });
        }
        
        const result = await metricool.replyToConversation({
          provider: provider,
          conversationId: threadExternalId,
          recipient: recipient,
          text: text,
          blogId: brand.metricoolBlogId || '',
        });
        
        if (!result.success) {
          return res.status(500).json({ 
            error: result.error || "Failed to send DM reply to Metricool",
            details: result.rawResponse 
          });
        }
        
        const outboundMessage = await storage.createMessage({
          brandId: message.brandId,
          conversationId: message.conversationId,
          platform: message.platform,
          type: 'conversation',
          author: brand.name,
          content: text,
          timestamp: new Date(),
          status: 'sent',
          direction: 'outbound',
          parentMessageId: message.id,
          metricoolId: result.messageId || null,
          rawData: result.rawResponse || null,
          source: 'repliyo',
          internalOrigin: 'manual',
        });
        
        if (message.conversationId) {
          await storage.updateConversation(message.conversationId, {
            lastMessageAt: new Date(),
            lastMessagePreview: text.substring(0, 100),
          });
          
          // Trigger async summary update for this user (Phase 2: Persistent Memory)
          // For DMs, use the customer's author name from the inbound message
          if (message.author) {
            triggerSummaryUpdateAsync(message.conversationId, message.author, message.brandId);
          }
        }
        
        res.json({
          success: true,
          message: outboundMessage,
          metricoolResponse: result.rawResponse,
        });
        
      } else {
        return res.status(400).json({ error: `Unsupported message type: ${message.type}` });
      }
      
    } catch (error: any) {
      console.error("[Reply] Error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to send reply" });
    }
  });

  // ========== MESSAGES ENDPOINTS ==========

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

  app.post("/api/messages", requireAuth, filterByBrand(), sendMessageRateLimiter, async (req, res) => {
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

  app.post("/api/sync-brand/:brandId", requireAuth, syncRateLimiter, async (req, res) => {
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

      if (brand.syncPaused) {
        return res.status(400).json({ error: "Sincronización pausada para esta marca. Reanuda la sincronización para continuar." });
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
            
            // Detect message direction: outbound = from brand, inbound = from customer
            // 'self' contains the brand's account ID in Metricool conversations
            const rawConv = conv.rawData as any;
            const selfId = rawConv?.self;
            const fromId = msg.from;
            const isOutbound = selfId && fromId === selfId;

            // Instagram, LinkedIn, and TikTok use participants array
            if (conv.provider === 'INSTAGRAM' || conv.provider === 'LINKEDIN' || conv.provider === 'TIKTOKBUSINESS') {
              const participants = conv.participants || [];
              const fromParticipant = participants.find((p: any) => p.id === fromId);
              
              // For outbound messages, use the brand name as author
              if (isOutbound) {
                author = brand.name;
                authorAvatar = null; // Brand avatar will be handled by UI
              } else {
                author = fromParticipant?.name || `Unknown ${conv.provider} User`;
                authorAvatar = fromParticipant?.imageProfileUrl || null;
              }
            } else {
              // Generic fallback for other providers
              if (isOutbound) {
                author = brand.name;
                authorAvatar = null;
              } else {
                author = msg.from?.name || msg.sender?.name || 'Unknown';
                authorAvatar = msg.from?.picture || msg.sender?.picture || null;
              }
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
              threadId: conv.id,
              parentMessageId: null,
              direction: isOutbound ? 'outbound' : 'inbound',
              source: 'metricool_sync',
            });
            conversationsCount++;
          } catch (error: any) {
            console.error(`Error upserting conversation message:`, error.message);
          }
        }
      }

      for (const comment of comments) {
        try {
          // Extract threadId from post ID for grouping comments on the same post
          const threadId = comment.postId || comment.rawData?.root?.element?.id || null;
          
          // Upsert the main comment
          const savedComment = await storage.upsertMessage({
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
            threadId: threadId,
            parentMessageId: null,
          });
          commentsCount++;

          // Process nested replies (comments array in rawData)
          const nestedReplies = comment.replies || comment.rawData?.root?.comments || [];
          for (const reply of nestedReplies) {
            try {
              // Find author info for the reply from participants
              const replyOwnerId = reply.owner;
              const participants = comment.rawData?.participants || [];
              const replyAuthorParticipant = participants.find((p: any) => p.id === replyOwnerId);
              
              const replyAuthor = replyAuthorParticipant?.name || `Unknown Reply Author`;
              const replyAvatar = replyAuthorParticipant?.imageProfileUrl || null;
              const replyContent = reply.text || '';
              const replyTimestamp = reply.creationDate || comment.timestamp;

              await storage.upsertMessage({
                brandId: brand.id,
                metricoolId: reply.id,
                platform: normalizePlatform(comment.provider),
                type: 'comment',
                author: replyAuthor,
                authorAvatar: replyAvatar,
                content: replyContent,
                timestamp: new Date(replyTimestamp),
                status: 'unread',
                sourceUrl: reply.properties?.permalink || comment.postUrl || null,
                rawData: reply,
                threadId: threadId,
                parentMessageId: savedComment.id,
              });
              commentsCount++;
              console.log(`   ↳ Saved nested reply from ${replyAuthor}`);
            } catch (replyError: any) {
              console.error(`Error upserting reply:`, replyError.message);
            }
          }
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

  app.get("/api/sync/status", requireAuth, async (req, res) => {
    try {
      const status = syncService.getStatus();
      res.json({
        isRunning: status.isRunning,
        isSyncing: status.isSyncing,
        lastSyncTime: status.lastSyncTime?.toISOString() || null,
        cooldownBrands: status.cooldownBrands.map(cb => ({
          brandId: cb.brandId,
          cooldownUntil: cb.cooldownUntil.toISOString()
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync/trigger", requireAuth, syncRateLimiter, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: "Only admins can trigger manual sync" });
      }

      const result = await syncService.triggerManualSync();
      res.json({
        success: result.success,
        brandsSynced: result.brandsSynced,
        errors: result.errors,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== AI AGENT ENDPOINTS ==========
  
  // GET /api/ai-agent/:brandId - Obtener configuración del agente
  app.get("/api/ai-agent/:brandId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return res.json(null);
      }
      
      res.json(agent);
    } catch (error: any) {
      console.error('Error fetching AI agent:', error);
      res.status(500).json({ error: "Failed to fetch AI agent configuration" });
    }
  });

  // POST /api/ai-agent/:brandId - Crear o actualizar configuración del agente
  app.post("/api/ai-agent/:brandId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agentData = {
        ...req.body,
        brandId,
      };
      
      const agent = await storage.upsertAiAgent(agentData);
      res.json(agent);
    } catch (error: any) {
      console.error('Error saving AI agent:', error);
      res.status(500).json({ error: `Failed to save AI agent configuration: ${error.message}` });
    }
  });

  // POST /api/ai-agent/:brandId/generate-reply - Generar sugerencia de respuesta IA
  app.post("/api/ai-agent/:brandId/generate-reply", requireAuth, filterByBrand("brandId"), aiRateLimiter, async (req, res) => {
    try {
      const { brandId } = req.params;
      const { messageId, conversationId } = req.body;
      
      if (!messageId && !conversationId) {
        return res.status(400).json({ error: "messageId or conversationId is required" });
      }
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent || !agent.isActive) {
        return res.status(400).json({ error: "AI agent is not configured or not active for this brand" });
      }
      
      let targetMessage;
      let conversationMessages: any[] = [];
      let conversation;
      
      if (messageId) {
        targetMessage = await storage.getMessage(messageId);
        if (!targetMessage) {
          return res.status(404).json({ error: "Message not found" });
        }
        
        if (targetMessage.brandId !== brandId) {
          return res.status(403).json({ error: "Access denied to this message" });
        }
        
        if (targetMessage.conversationId) {
          conversation = await storage.getConversation(targetMessage.conversationId);
          conversationMessages = await storage.getMessagesByConversation(targetMessage.conversationId);
        }
      } else if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        
        if (conversation.brandId !== brandId) {
          return res.status(403).json({ error: "Access denied to this conversation" });
        }
        
        conversationMessages = await storage.getMessagesByConversation(conversationId);
        if (conversationMessages.length === 0) {
          return res.status(404).json({ error: "No messages found in conversation" });
        }
        conversationMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        targetMessage = conversationMessages[conversationMessages.length - 1];
      }
      
      const { createLLMProvider, PLATFORM_CHARACTER_LIMITS, LLMError } = await import("./services/llm");
      
      const llmProvider = createLLMProvider(agent, {});
      
      conversationMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Get the social post context (caption of the video/image being commented on)
      let socialPost = null;
      if (conversation?.socialPostId) {
        socialPost = await storage.getSocialPost(conversation.socialPostId);
      }
      
      try {
        const response = await llmProvider.generateReply({
          agent,
          message: targetMessage,
          conversation: conversation || undefined,
          brand,
          conversationHistory: conversationMessages,
          socialPost,
        });
        
        await storage.updateMessage(targetMessage.id, {
          aiSuggestedReply: response.text,
          aiReplyStatus: 'suggested',
          aiAgentId: agent.id,
        });
        
        const platformLimit = PLATFORM_CHARACTER_LIMITS[targetMessage.platform] || PLATFORM_CHARACTER_LIMITS.default;
        
        await storage.createAuditLog({
          agentId: agent.id,
          messageId: targetMessage.id,
          conversationId: targetMessage.conversationId || null,
          action: 'generate_reply',
          inputContent: targetMessage.content,
          outputContent: response.text,
          status: 'success',
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          platform: targetMessage.platform,
          characterCount: response.characterCount,
          wasCharacterLimited: response.wasCharacterLimited,
        });
        
        res.json({
          success: true,
          reply: response.text,
          characterCount: response.characterCount,
          platformLimit,
          wasCharacterLimited: response.wasCharacterLimited,
          usage: response.usage,
          model: agent.model || 'gpt-4o-mini',
          provider: agent.provider || 'openai',
        });
      } catch (llmError: any) {
        const errorMessage = llmError instanceof LLMError 
          ? llmError.message 
          : 'Error generating reply';
        
        await storage.createAuditLog({
          agentId: agent.id,
          messageId: targetMessage.id,
          conversationId: targetMessage.conversationId || null,
          action: 'generate_reply',
          inputContent: targetMessage.content,
          outputContent: null,
          status: 'error',
          errorReason: errorMessage,
          platform: targetMessage.platform,
        });
        
        return res.status(500).json({ error: errorMessage });
      }
    } catch (error: any) {
      console.error('Error generating AI reply:', error);
      res.status(500).json({ error: `Failed to generate reply: ${error.message}` });
    }
  });

  // POST /api/ai-agent/:brandId/test-generate - Probar generación de respuesta IA en playground
  app.post("/api/ai-agent/:brandId/test-generate", requireAuth, filterByBrand("brandId"), aiRateLimiter, async (req, res) => {
    try {
      const { brandId } = req.params;
      const { testMessage, platform = "instagram" } = req.body;
      
      if (!testMessage || testMessage.trim() === "") {
        return res.status(400).json({ error: "testMessage is required" });
      }
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return res.status(400).json({ error: "AI agent is not configured for this brand. Please save the configuration first." });
      }
      
      const { createLLMProvider, PLATFORM_CHARACTER_LIMITS } = await import("./services/llm");
      
      const llmProvider = createLLMProvider(agent, {});
      
      const mockMessage: any = {
        id: "test-playground",
        brandId,
        externalId: "test-playground",
        platform,
        type: "conversation",
        direction: "inbound",
        author: "Usuario de Prueba",
        content: testMessage.trim(),
        timestamp: new Date(),
        status: "pending",
        conversationId: null,
      };
      
      const response = await llmProvider.generateReply({
        agent,
        message: mockMessage,
        brand,
        conversationHistory: [],
      });
      
      const platformLimit = PLATFORM_CHARACTER_LIMITS[platform] || PLATFORM_CHARACTER_LIMITS.default;
      
      res.json({
        success: true,
        reply: response.text,
        characterCount: response.characterCount,
        platformLimit,
        wasCharacterLimited: response.wasCharacterLimited,
        usage: response.usage,
        model: response.model,
        provider: response.provider,
      });
    } catch (error: any) {
      console.error('Error in playground test-generate:', error);
      res.status(500).json({ error: `Failed to generate test reply: ${error.message}` });
    }
  });

  // GET /api/ai-agent/:brandId/audit-log - Obtener historial de auditoría
  app.get("/api/ai-agent/:brandId/audit-log", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return res.status(404).json({ error: "AI agent not configured for this brand" });
      }
      
      let logs;
      if (since) {
        logs = await storage.getAuditLogsAfterDate(agent.id, since);
      } else {
        logs = await storage.getAuditLogsByAgent(agent.id, limit);
      }
      
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // GET /api/inbox-stats/:brandId - Obtener estadísticas del inbox
  app.get("/api/inbox-stats/:brandId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const stats = await storage.getInboxStats(brandId, days);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching inbox stats:', error);
      res.status(500).json({ error: "Failed to fetch inbox stats" });
    }
  });

  // POST /api/ai-agent/:brandId/batch-generate - Procesar comentarios pendientes en lote
  app.post("/api/ai-agent/:brandId/batch-generate", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const { limit = 10, platform = 'instagram', dryRun = false } = req.body;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return res.status(400).json({ error: "AI agent not configured for this brand" });
      }
      
      const pendingMessages = await storage.getPendingCommentsForBatchProcessing(brandId, platform, limit);
      
      if (pendingMessages.length === 0) {
        return res.json({ 
          success: true, 
          message: "No pending comments found",
          processed: 0,
          results: []
        });
      }
      
      if (dryRun) {
        return res.json({
          success: true,
          dryRun: true,
          message: `Found ${pendingMessages.length} comments to process`,
          pendingMessages: pendingMessages.map(m => ({
            id: m.id,
            author: m.author,
            content: m.content?.substring(0, 100),
            platform: m.platform,
            timestamp: m.timestamp,
          }))
        });
      }
      
      const { createLLMProvider, PLATFORM_CHARACTER_LIMITS, LLMError } = await import("./services/llm");
      const llmProvider = createLLMProvider(agent, {});
      
      const results: any[] = [];
      
      for (const message of pendingMessages) {
        try {
          let conversation;
          let conversationMessages: any[] = [];
          
          if (message.conversationId) {
            conversation = await storage.getConversation(message.conversationId);
            conversationMessages = await storage.getMessagesByConversation(message.conversationId);
            conversationMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          }
          
          const response = await llmProvider.generateReply({
            agent,
            message,
            conversation: conversation || undefined,
            brand,
            conversationHistory: conversationMessages,
          });
          
          await storage.updateMessage(message.id, {
            aiSuggestedReply: response.text,
            aiReplyStatus: 'suggested',
            aiAgentId: agent.id,
          });
          
          await storage.createAuditLog({
            agentId: agent.id,
            messageId: message.id,
            conversationId: message.conversationId || null,
            action: 'batch_generate',
            inputContent: message.content,
            outputContent: response.text,
            status: 'success',
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            platform: message.platform,
            characterCount: response.characterCount,
            wasCharacterLimited: response.wasCharacterLimited,
          });
          
          results.push({
            messageId: message.id,
            author: message.author,
            input: message.content?.substring(0, 50),
            output: response.text,
            characterCount: response.characterCount,
            success: true,
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          console.error(`Batch processing error for message ${message.id}:`, error);
          
          await storage.createAuditLog({
            agentId: agent.id,
            messageId: message.id,
            conversationId: message.conversationId || null,
            action: 'batch_generate',
            inputContent: message.content,
            outputContent: null,
            status: 'error',
            errorReason: error.message,
            platform: message.platform,
          });
          
          results.push({
            messageId: message.id,
            author: message.author,
            input: message.content?.substring(0, 50),
            error: error.message,
            success: false,
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      res.json({
        success: true,
        message: `Processed ${successCount}/${results.length} comments`,
        processed: results.length,
        successCount,
        errorCount,
        results,
      });
      
    } catch (error: any) {
      console.error('Error in batch-generate:', error);
      res.status(500).json({ error: `Batch processing failed: ${error.message}` });
    }
  });

  // GET /api/ai-agent/:brandId/pending-count - Obtener conteo de comentarios pendientes
  app.get("/api/ai-agent/:brandId/pending-count", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const { platform = 'instagram' } = req.query;
      
      const count = await storage.getPendingCommentsCount(brandId, platform as string);
      
      res.json({ 
        pendingCount: count,
        platform,
        brandId
      });
    } catch (error: any) {
      console.error('Error getting pending count:', error);
      res.status(500).json({ error: "Failed to get pending count" });
    }
  });

  // GET /api/ai-agent/:brandId/metrics - Obtener métricas de uso de IA
  app.get("/api/ai-agent/:brandId/metrics", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      const brand = await storage.getBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      const metrics = await storage.getAiMetricsStats(brandId, days);
      res.json(metrics);
    } catch (error: any) {
      console.error('Error fetching AI metrics:', error);
      res.status(500).json({ error: "Failed to fetch AI metrics" });
    }
  });

  // POST /api/ai-agent/:brandId/generate-draft - Generar borrador para un mensaje específico
  app.post("/api/ai-agent/:brandId/generate-draft/:messageId", requireAuth, filterByBrand("brandId"), aiRateLimiter, async (req, res) => {
    try {
      const { brandId, messageId } = req.params;
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation || conversation.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied to this message" });
      }
      
      await storage.updateMessage(messageId, {
        aiReplyStatus: 'drafting',
      });
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
        return res.status(404).json({ error: "AI Agent not configured for this brand" });
      }
      
      const { generateReplyForMessage } = await import('./services/aiReplyGenerator');
      
      const MAX_RETRIES = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await generateReplyForMessage(agent, message, conversation, message.platform);
          
          if (result.success && result.reply) {
            await storage.updateMessage(messageId, {
              aiSuggestedReply: result.reply,
              aiReplyStatus: 'drafted',
              draftWasEdited: false,
            });
            
            // Create draft pending notification
            await storage.createDraftNotification(
              brandId,
              messageId,
              conversation.id,
              message.platform || 'unknown',
              message.author || 'Usuario',
              result.reply
            );
            
            return res.json({
              success: true,
              draft: result.reply,
              messageId,
              characterCount: result.characterCount,
              provider: result.provider,
              model: result.model,
            });
          }
          
          lastError = new Error(result.error || 'Unknown error');
        } catch (err: any) {
          lastError = err;
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      
      await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
      return res.status(500).json({ 
        error: lastError?.message || 'Failed to generate draft after multiple attempts',
        messageId,
      });
      
    } catch (error: any) {
      console.error('Error generating draft:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ai-agent/:brandId/regenerate-draft - Regenerar borrador (limpia el anterior)
  app.post("/api/ai-agent/:brandId/regenerate-draft/:messageId", requireAuth, filterByBrand("brandId"), aiRateLimiter, async (req, res) => {
    try {
      const { brandId, messageId } = req.params;
      const { confirmOverwrite = false } = req.body;
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation || conversation.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied to this message" });
      }
      
      if (message.draftWasEdited && !confirmOverwrite) {
        return res.status(409).json({ 
          error: "Draft was edited",
          requiresConfirmation: true,
          message: "Este borrador fue editado manualmente. ¿Deseas regenerarlo y perder los cambios?",
        });
      }
      
      await storage.updateMessage(messageId, {
        aiReplyStatus: 'drafting',
        aiSuggestedReply: null,
        draftWasEdited: false,
      });
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
        return res.status(404).json({ error: "AI Agent not configured for this brand" });
      }
      
      const { generateReplyForMessage } = await import('./services/aiReplyGenerator');
      const result = await generateReplyForMessage(agent, message, conversation, message.platform);
      
      if (result.success && result.reply) {
        await storage.updateMessage(messageId, {
          aiSuggestedReply: result.reply,
          aiReplyStatus: 'drafted',
          draftWasEdited: false,
        });
        
        // Create/update draft pending notification
        await storage.createDraftNotification(
          brandId,
          messageId,
          conversation.id,
          message.platform || 'unknown',
          message.author || 'Usuario',
          result.reply
        );
        
        return res.json({
          success: true,
          draft: result.reply,
          messageId,
          characterCount: result.characterCount,
        });
      }
      
      await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
      return res.status(500).json({ error: result.error || 'Failed to regenerate draft' });
      
    } catch (error: any) {
      console.error('Error regenerating draft:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ai-agent/:brandId/bulk-generate-drafts - Generar borradores en lote
  app.post("/api/ai-agent/:brandId/bulk-generate-drafts", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const { messageIds, limit = 10 } = req.body;
      
      const agent = await storage.getAiAgentByBrand(brandId);
      if (!agent) {
        return res.status(404).json({ error: "AI Agent not configured" });
      }
      
      let messagesToProcess: string[];
      
      if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
        messagesToProcess = messageIds.slice(0, 50);
      } else {
        const messages = await storage.getMessagesNeedingDrafts(brandId, Math.min(limit, 50));
        messagesToProcess = messages.map(m => m.id);
      }
      
      if (messagesToProcess.length === 0) {
        return res.json({
          success: true,
          message: "No messages need drafts",
          processed: 0,
          successCount: 0,
          errorCount: 0,
          results: [],
        });
      }
      
      for (const id of messagesToProcess) {
        await storage.updateMessage(id, { aiReplyStatus: 'drafting' });
      }
      
      const { generateReplyForMessage } = await import('./services/aiReplyGenerator');
      
      const results: Array<{ messageId: string; success: boolean; error?: string }> = [];
      
      for (const messageId of messagesToProcess) {
        try {
          const message = await storage.getMessage(messageId);
          if (!message) {
            results.push({ messageId, success: false, error: 'Message not found' });
            continue;
          }
          
          const conversation = await storage.getConversation(message.conversationId);
          if (!conversation) {
            results.push({ messageId, success: false, error: 'Conversation not found' });
            continue;
          }
          
          const result = await generateReplyForMessage(agent, message, conversation, message.platform);
          
          if (result.success && result.reply) {
            await storage.updateMessage(messageId, {
              aiSuggestedReply: result.reply,
              aiReplyStatus: 'drafted',
              draftWasEdited: false,
            });
            
            // Create draft pending notification
            await storage.createDraftNotification(
              brandId,
              messageId,
              conversation.id,
              message.platform || 'unknown',
              message.author || 'Usuario',
              result.reply
            );
            
            results.push({ messageId, success: true });
          } else {
            await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
            results.push({ messageId, success: false, error: result.error });
          }
          
          await new Promise(r => setTimeout(r, 200));
          
        } catch (err: any) {
          await storage.updateMessage(messageId, { aiReplyStatus: 'draft_error' });
          results.push({ messageId, success: false, error: err.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      res.json({
        success: true,
        message: `Generated ${successCount}/${results.length} drafts`,
        processed: results.length,
        successCount,
        errorCount,
        results,
      });
      
    } catch (error: any) {
      console.error('Error in bulk-generate-drafts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/ai-agent/:brandId/update-draft - Actualizar borrador (marca como editado)
  app.put("/api/ai-agent/:brandId/update-draft/:messageId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId, messageId } = req.params;
      const { draft } = req.body;
      
      if (!draft || typeof draft !== 'string') {
        return res.status(400).json({ error: "Draft content is required" });
      }
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation || conversation.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.updateMessage(messageId, {
        aiSuggestedReply: draft,
        aiReplyStatus: 'drafted',
        draftWasEdited: true,
      });
      
      res.json({ success: true, messageId, draft });
      
    } catch (error: any) {
      console.error('Error updating draft:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/ai-agent/:brandId/discard-draft - Descartar borrador
  app.delete("/api/ai-agent/:brandId/discard-draft/:messageId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId, messageId } = req.params;
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation || conversation.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.updateMessage(messageId, {
        aiSuggestedReply: null,
        aiReplyStatus: 'none',
        draftWasEdited: false,
      });
      
      // Delete draft notification when discarding
      await storage.deleteNotificationByMessageId(messageId);
      
      res.json({ success: true, messageId });
      
    } catch (error: any) {
      console.error('Error discarding draft:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/ai-agent/:brandId/send-draft - Enviar borrador a la red social
  app.post("/api/ai-agent/:brandId/send-draft/:messageId", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId, messageId } = req.params;
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation || conversation.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!message.aiSuggestedReply || message.aiSuggestedReply.trim() === '') {
        return res.status(400).json({ error: "No draft to send" });
      }
      
      const brand = await storage.getBrand(brandId);
      if (!brand || !brand.metricoolBlogId || !brand.metricoolToken || !brand.metricoolUserId) {
        return res.status(400).json({ error: "Brand not configured with Metricool" });
      }
      
      // Get the AI agent for audit logging
      const agent = await storage.getAiAgentByBrand(brandId);
      
      const metricoolService = new MetricoolService({
        userToken: brand.metricoolToken,
        userId: brand.metricoolUserId,
      });
      
      // For YouTube nested comments, we need to use the parent thread ID, not the reply ID
      // YouTube API requires replies to go to the parent comment thread
      let objectIdToUse = message.metricoolId || '';
      
      // Safely parse rawData - it may be stored as JSON string in database
      let parsedRawData: Record<string, any> | null = null;
      try {
        if (message.rawData) {
          parsedRawData = typeof message.rawData === 'string' 
            ? JSON.parse(message.rawData) 
            : message.rawData as Record<string, any>;
        }
      } catch (parseError) {
        console.warn(`[SendDraft] Failed to parse rawData for message ${messageId}:`, parseError);
      }
      
      if (message.platform?.toLowerCase() === 'youtube' && parsedRawData?.parentId) {
        objectIdToUse = parsedRawData.parentId;
        console.log(`[SendDraft] YouTube nested comment detected, using parentId: ${objectIdToUse} instead of ${message.metricoolId}`);
      }
      
      console.log(`[SendDraft] Sending draft for message ${messageId}:`, {
        platform: message.platform,
        type: message.type,
        metricoolId: message.metricoolId,
        objectIdToUse,
        isNestedYouTubeComment: !!(message.platform?.toLowerCase() === 'youtube' && parsedRawData?.parentId),
        draft: message.aiSuggestedReply?.substring(0, 50) + '...',
        characterCount: message.aiSuggestedReply?.length || 0,
      });
      
      let replyResult;
      
      if (message.type === 'comment' || message.type === 'mention' || message.type === 'story_reply') {
        const autoMentionEnabled = agent?.autoMentionEnabled ?? false;
        replyResult = await metricoolService.replyToComment({
          provider: message.platform,
          objectId: objectIdToUse,
          text: message.aiSuggestedReply,
          blogId: brand.metricoolBlogId,
          mentionUsername: autoMentionEnabled ? (message.author || undefined) : undefined,
        });
      } else if (message.type === 'dm' || message.type === 'conversation') {
        replyResult = await metricoolService.replyToConversation({
          provider: message.platform,
          conversationId: conversation.threadExternalId || '',
          recipient: conversation.customerId || '',
          text: message.aiSuggestedReply,
          blogId: brand.metricoolBlogId,
        });
      } else {
        return res.status(400).json({ error: `Unsupported message type: ${message.type}` });
      }
      
      if (!replyResult.success) {
        console.error(`[SendDraft] Failed to send:`, replyResult.error);
        
        // Log the error to audit log (wrapped in try/catch to not fail the response)
        if (agent) {
          try {
            await storage.createAuditLog({
              agentId: agent.id,
              messageId: message.id,
              conversationId: message.conversationId || null,
              action: 'send_draft',
              inputContent: message.content,
              outputContent: message.aiSuggestedReply,
              status: 'error',
              errorReason: replyResult.error || 'Failed to send reply',
              platform: message.platform,
            });
          } catch (auditError) {
            console.error('[SendDraft] Failed to create audit log entry:', auditError);
          }
        }
        
        return res.status(500).json({ error: replyResult.error || 'Failed to send reply' });
      }
      
      // Create a new outbound message with the sent draft content
      const replyMessage = await storage.createMessage({
        brandId: brand.id,
        conversationId: conversation.id,
        platform: message.platform,
        type: message.type as "conversation" | "comment",
        direction: "outbound",
        author: brand.name,
        authorAvatar: brand.avatar,
        content: message.aiSuggestedReply,
        timestamp: new Date(),
        status: "read",
        source: "repliyo",
        internalOrigin: "ai",
        parentMessageId: message.id,
        aiAgentId: null,
        aiSuggestedReply: message.aiSuggestedReply,
        aiReplyStatus: "sent",
        replyGroupId: null,
        partIndex: null,
        totalParts: null,
        urgency: null,
        intent: null,
        sentiment: null,
        aiSummary: null,
        draftResponse: null,
        sourceUrl: null,
        contextType: null,
        crmData: null,
        metricoolId: null,
        rawData: { 
          draftSent: true, 
          metricoolResponse: replyResult.rawResponse,
        },
        threadId: conversation.threadExternalId,
      });
      
      // Clear the draft from the original message
      await storage.updateMessage(messageId, {
        aiSuggestedReply: null,
        aiReplyStatus: 'none',
        draftWasEdited: false,
      });
      
      // Delete draft notification when sending
      await storage.deleteNotificationByMessageId(messageId);
      
      // Log success to audit log (wrapped in try/catch to not fail the response)
      if (agent) {
        try {
          await storage.createAuditLog({
            agentId: agent.id,
            messageId: message.id,
            conversationId: message.conversationId || null,
            action: 'send_draft',
            inputContent: message.content,
            outputContent: message.aiSuggestedReply,
            status: 'success',
            platform: message.platform,
          });
        } catch (auditError) {
          console.error('[SendDraft] Failed to create audit log entry:', auditError);
        }
      }
      
      console.log(`[SendDraft] Successfully sent draft for message ${messageId}, created reply message ${replyMessage.id}`);
      
      res.json({ 
        success: true, 
        messageId,
        replyMessageId: replyMessage.id,
        externalMessageId: replyResult.messageId,
      });
      
    } catch (error: any) {
      console.error('Error sending draft:', error);
      res.status(500).json({ error: error.message || 'Failed to send draft' });
    }
  });

  // GET /api/ai-agent/:brandId/drafts-count - Obtener conteo de mensajes pendientes de borrador
  app.get("/api/ai-agent/:brandId/drafts-count", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      
      const count = await storage.getMessagesNeedingDraftsCount(brandId);
      const conversationsWithDrafts = await storage.getConversationsWithDrafts(brandId);
      
      res.json({ 
        needsDrafts: count,
        conversationsWithPendingDrafts: conversationsWithDrafts.length,
        conversationIds: conversationsWithDrafts,
      });
    } catch (error: any) {
      console.error('Error getting drafts count:', error);
      res.status(500).json({ error: "Failed to get drafts count" });
    }
  });

  // POST /api/ai-agent/:brandId/backfill-draft-notifications - Backfill notifications for existing pending drafts
  app.post("/api/ai-agent/:brandId/backfill-draft-notifications", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      
      // Get all messages with pending drafts
      const pendingDrafts = await storage.getMessagesWithPendingDrafts(brandId);
      
      if (pendingDrafts.length === 0) {
        return res.json({
          success: true,
          message: "No pending drafts found",
          created: 0,
        });
      }
      
      let created = 0;
      for (const draft of pendingDrafts) {
        try {
          // Check if notification already exists
          const existing = await storage.getNotificationByMessageId(draft.messageId);
          if (!existing) {
            await storage.createDraftNotification(
              brandId,
              draft.messageId,
              draft.conversationId,
              draft.platform,
              draft.author,
              draft.draftPreview
            );
            created++;
          }
        } catch (err: any) {
          console.error(`[Backfill] Error creating notification for message ${draft.messageId}:`, err.message);
        }
      }
      
      console.log(`[Backfill] Created ${created} draft notifications for brand ${brandId}`);
      
      res.json({
        success: true,
        message: `Created ${created} notifications for ${pendingDrafts.length} pending drafts`,
        created,
        total: pendingDrafts.length,
      });
      
    } catch (error: any) {
      console.error('Error backfilling draft notifications:', error);
      res.status(500).json({ error: "Failed to backfill draft notifications" });
    }
  });

  // ========== PLAYGROUND TEMPLATES ENDPOINTS ==========
  
  // GET /api/brands/:brandId/templates - Obtener plantillas de respuestas
  app.get("/api/brands/:brandId/templates", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const { category } = req.query;
      
      let templates;
      if (category && typeof category === 'string' && category !== 'all') {
        templates = await storage.getPlaygroundTemplatesByCategory(brandId, category);
      } else {
        templates = await storage.getPlaygroundTemplates(brandId);
      }
      
      res.json(templates);
    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  // POST /api/brands/:brandId/templates - Crear una nueva plantilla
  app.post("/api/brands/:brandId/templates", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { brandId } = req.params;
      const { category, title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }
      
      const template = await storage.createPlaygroundTemplate({
        brandId,
        category: category || 'general',
        title,
        content,
      });
      
      res.status(201).json(template);
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // PUT /api/brands/:brandId/templates/:id - Actualizar una plantilla
  app.put("/api/brands/:brandId/templates/:id", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { id } = req.params;
      const { category, title, content } = req.body;
      
      const template = await storage.getPlaygroundTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      const updated = await storage.updatePlaygroundTemplate(id, {
        category: category || template.category,
        title: title || template.title,
        content: content || template.content,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // DELETE /api/brands/:brandId/templates/:id - Eliminar una plantilla
  app.delete("/api/brands/:brandId/templates/:id", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await storage.getPlaygroundTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      await storage.deletePlaygroundTemplate(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // POST /api/brands/:brandId/templates/:id/use - Incrementar contador de uso
  app.post("/api/brands/:brandId/templates/:id/use", requireAuth, filterByBrand("brandId"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await storage.incrementTemplateUsage(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error('Error incrementing template usage:', error);
      res.status(500).json({ error: "Failed to increment usage" });
    }
  });

  // ========== AI MODEL PRICING ENDPOINTS ==========
  
  // GET /api/admin/ai-pricing - Obtener todos los precios de modelos
  app.get("/api/admin/ai-pricing", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Solo administradores pueden ver los precios" });
      }
      
      const pricing = await storage.getAllModelPricing();
      res.json(pricing);
    } catch (error: any) {
      console.error('Error getting model pricing:', error);
      res.status(500).json({ error: "Failed to get model pricing" });
    }
  });

  // PUT /api/admin/ai-pricing/:id - Actualizar precio de un modelo
  app.put("/api/admin/ai-pricing/:id", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Solo administradores pueden actualizar precios" });
      }
      
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateModelPricing(id, {
        inputPricePerMillion: updates.inputPricePerMillion,
        outputPricePerMillion: updates.outputPricePerMillion,
        isActive: updates.isActive,
        notes: updates.notes,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Precio de modelo no encontrado" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating model pricing:', error);
      res.status(500).json({ error: "Failed to update model pricing" });
    }
  });

  // POST /api/admin/ai-pricing - Crear o actualizar precio de un modelo
  app.post("/api/admin/ai-pricing", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Solo administradores pueden crear precios" });
      }
      
      const pricing = await storage.upsertModelPricing(req.body);
      res.json(pricing);
    } catch (error: any) {
      console.error('Error creating model pricing:', error);
      res.status(500).json({ error: "Failed to create model pricing" });
    }
  });

  // GET /api/admin/ai-pricing/summary - Resumen de precios por proveedor
  app.get("/api/admin/ai-pricing/summary", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Solo administradores pueden ver el resumen" });
      }
      
      const allPricing = await storage.getActiveModelPricing();
      
      const summary: Record<string, { 
        models: number; 
        cheapestInput: { model: string; price: number }; 
        cheapestOutput: { model: string; price: number };
        lastVerified: Date | null;
      }> = {};
      
      for (const p of allPricing) {
        if (!summary[p.provider]) {
          summary[p.provider] = {
            models: 0,
            cheapestInput: { model: p.model, price: p.inputPricePerMillion },
            cheapestOutput: { model: p.model, price: p.outputPricePerMillion },
            lastVerified: p.lastVerifiedAt,
          };
        }
        
        summary[p.provider].models++;
        
        if (p.inputPricePerMillion < summary[p.provider].cheapestInput.price) {
          summary[p.provider].cheapestInput = { model: p.model, price: p.inputPricePerMillion };
        }
        
        if (p.outputPricePerMillion < summary[p.provider].cheapestOutput.price) {
          summary[p.provider].cheapestOutput = { model: p.model, price: p.outputPricePerMillion };
        }
        
        if (p.lastVerifiedAt && (!summary[p.provider].lastVerified || p.lastVerifiedAt > summary[p.provider].lastVerified)) {
          summary[p.provider].lastVerified = p.lastVerifiedAt;
        }
      }
      
      res.json({
        providers: summary,
        totalModels: allPricing.length,
        lastGlobalUpdate: allPricing.reduce((latest, p) => 
          !latest || p.lastVerifiedAt > latest ? p.lastVerifiedAt : latest, 
          null as Date | null
        ),
      });
    } catch (error: any) {
      console.error('Error getting pricing summary:', error);
      res.status(500).json({ error: "Failed to get pricing summary" });
    }
  });

  // ==========================================
  // NOTIFICATIONS - Sistema Central
  // ==========================================
  
  // GET /api/notifications - Get notifications for brand
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "Brand ID required" });
      }
      
      // Validate brand access
      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(brandId, limit);
      const unreadCount = await storage.getUnreadNotificationCount(brandId);
      
      res.json({ notifications, unreadCount });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  
  // GET /api/notifications/count - Get unread count only
  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "Brand ID required" });
      }
      
      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const count = await storage.getUnreadNotificationCount(brandId);
      res.json({ count });
    } catch (error: any) {
      console.error('Error fetching notification count:', error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });
  
  // PATCH /api/notifications/:id/read - Mark single notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  
  // PATCH /api/notifications/read-all - Mark all notifications as read for brand
  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "Brand ID required" });
      }
      
      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const count = await storage.markAllNotificationsAsRead(brandId);
      res.json({ success: true, markedAsRead: count });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });
  
  // POST /api/admin/notifications/cleanup - Manual cleanup (admin only)
  app.post("/api/admin/notifications/cleanup", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const deleted = await storage.cleanupOldNotifications();
      res.json({ success: true, deletedCount: deleted });
    } catch (error: any) {
      console.error('Error during notification cleanup:', error);
      res.status(500).json({ error: "Failed to cleanup notifications" });
    }
  });

  // POST /api/admin/generate-summaries - Generate summaries for DM conversations (admin only)
  app.post("/api/admin/generate-summaries", requireAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { brandId, minMessages = 10 } = req.body;
      
      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      // Get all DM conversations with enough messages
      const conversations = await storage.getConversations(brandId);
      const dmConversations = conversations.filter(c => c.type === 'dm');
      
      const results: { conversationId: string; customerName: string; status: string; error?: string }[] = [];
      
      for (const conv of dmConversations) {
        const messages = await storage.getMessagesByConversation(conv.id);
        
        if (messages.length < minMessages) {
          results.push({
            conversationId: conv.id,
            customerName: conv.customerName || 'Unknown',
            status: 'skipped',
            error: `Only ${messages.length} messages (min: ${minMessages})`
          });
          continue;
        }

        // Find the customer author (inbound messages)
        const inboundMessage = messages.find(m => m.direction === 'inbound');
        const author = inboundMessage?.author || conv.customerName || 'Unknown';

        try {
          await checkAndUpdateSummary(conv.id, author, brandId);
          results.push({
            conversationId: conv.id,
            customerName: conv.customerName || author,
            status: 'generated'
          });
        } catch (error: any) {
          results.push({
            conversationId: conv.id,
            customerName: conv.customerName || author,
            status: 'failed',
            error: error.message
          });
        }
      }

      const generated = results.filter(r => r.status === 'generated').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      res.json({
        success: true,
        summary: { total: dmConversations.length, generated, failed, skipped },
        details: results
      });
    } catch (error: any) {
      console.error('Error generating summaries:', error);
      res.status(500).json({ error: "Failed to generate summaries", details: error.message });
    }
  });

  // ============================================
  // CRM MODULE API ENDPOINTS
  // ============================================

  // GET /api/crm/contacts - List contacts for a brand
  app.get("/api/crm/contacts", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      // Verify access
      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const options = {
        status: req.query.status as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const contacts = await storage.getCrmContacts(brandId, options);
      
      // Get channel counts for each contact
      const contactsWithChannels = await Promise.all(
        contacts.map(async (contact) => {
          const channels = await storage.getCrmContactChannels(contact.id);
          return {
            ...contact,
            channelCount: channels.length,
            platforms: channels.map(c => c.platform),
          };
        })
      );

      res.json({ contacts: contactsWithChannels });
    } catch (error: any) {
      console.error('[CRM] Error getting contacts:', error);
      res.status(500).json({ error: "Failed to get contacts", details: error.message });
    }
  });

  // GET /api/crm/contacts/by-channel - Find contact by social channel (platform + externalId)
  // Used by Inbox to resolve CRM context when selecting a conversation
  app.get("/api/crm/contacts/by-channel", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      const platform = req.query.platform as string;
      const externalId = req.query.externalId as string;
      
      if (!brandId || !platform || !externalId) {
        return res.status(400).json({ error: "brandId, platform, and externalId are required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const channel = await storage.findCrmContactChannelByExternal(brandId, platform, externalId);
      
      if (!channel) {
        return res.status(404).json({ error: "Contact not found for this channel" });
      }

      const contact = await storage.getCrmContact(channel.contactId);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      const channels = await storage.getCrmContactChannels(contact.id);

      res.json({ contact, channels });
    } catch (error: any) {
      console.error('[CRM] Error finding contact by channel:', error);
      res.status(500).json({ error: "Failed to find contact", details: error.message });
    }
  });

  // GET /api/crm/contacts/:id - Get single contact with all details
  app.get("/api/crm/contacts/:id", requireAuth, async (req, res) => {
    try {
      const contact = await storage.getCrmContact(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      // Verify access
      if (req.user?.role !== 'admin' && req.user?.brandId !== contact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const channels = await storage.getCrmContactChannels(contact.id);

      res.json({ contact, channels });
    } catch (error: any) {
      console.error('[CRM] Error getting contact:', error);
      res.status(500).json({ error: "Failed to get contact", details: error.message });
    }
  });

  // POST /api/crm/contacts - Create new contact
  // If platform and externalId are provided, creates contact+channel+links in atomic transaction
  app.post("/api/crm/contacts", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { 
        displayName, email, phone, city, country, status, lifecycleStage, customFields,
        platform, externalId, username, avatarUrl
      } = req.body;

      if (!displayName) {
        return res.status(400).json({ error: "displayName is required" });
      }

      // If platform and externalId provided, use atomic transaction
      if (platform && externalId) {
        try {
          const result = await storage.createCrmContactWithChannel(
            {
              brandId,
              displayName,
              email,
              phone,
              city,
              country,
              status: status || 'lead',
              lifecycleStage: lifecycleStage || 'new',
              customFields: customFields || {},
            },
            { platform, externalId, username: username || displayName, avatarUrl }
          );
          
          console.log(`[CRM] Created contact ${result.contact.id} with channel, linked ${result.linkedConversations} conversations`);
          return res.status(201).json({ contact: result.contact, channel: result.channel });
        } catch (txError: any) {
          if (txError.message === 'CONTACT_ALREADY_EXISTS') {
            return res.status(409).json({ 
              error: "Contact already exists for this channel",
              contact: txError.existingContact || null,
              channel: txError.existingChannel || null
            });
          }
          throw txError;
        }
      }

      // No channel data - create simple contact
      const contact = await storage.createCrmContact({
        brandId,
        displayName,
        email,
        phone,
        city,
        country,
        status: status || 'lead',
        lifecycleStage: lifecycleStage || 'new',
        customFields: customFields || {},
      });

      res.status(201).json({ contact });
    } catch (error: any) {
      console.error('[CRM] Error creating contact:', error);
      res.status(500).json({ error: "Failed to create contact", details: error.message });
    }
  });

  // PUT /api/crm/contacts/:id - Update contact
  app.put("/api/crm/contacts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCrmContact(req.params.id);
      
      if (!existing) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== existing.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { displayName, email, phone, city, country, status, lifecycleStage, customFields } = req.body;

      const contact = await storage.updateCrmContact(req.params.id, {
        displayName,
        email,
        phone,
        city,
        country,
        status,
        lifecycleStage,
        customFields,
      });

      res.json({ contact });
    } catch (error: any) {
      console.error('[CRM] Error updating contact:', error);
      res.status(500).json({ error: "Failed to update contact", details: error.message });
    }
  });

  // DELETE /api/crm/contacts/:id - Delete contact
  app.delete("/api/crm/contacts/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCrmContact(req.params.id);
      
      if (!existing) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== existing.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const permanent = req.query.permanent === 'true';
      
      if (permanent) {
        await storage.deleteCrmContact(req.params.id);
        res.json({ success: true, message: "Contact permanently deleted" });
      } else {
        await storage.updateCrmContact(req.params.id, { status: 'archived' });
        res.json({ success: true, message: "Contact archived" });
      }
    } catch (error: any) {
      console.error('[CRM] Error deleting contact:', error);
      res.status(500).json({ error: "Failed to delete contact", details: error.message });
    }
  });

  // GET /api/crm/contacts/:id/channels - Get contact's social channels
  app.get("/api/crm/contacts/:id/channels", requireAuth, async (req, res) => {
    try {
      const contact = await storage.getCrmContact(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== contact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const channels = await storage.getCrmContactChannels(req.params.id);

      res.json({ channels });
    } catch (error: any) {
      console.error('[CRM] Error getting contact channels:', error);
      res.status(500).json({ error: "Failed to get channels", details: error.message });
    }
  });

  // GET /api/crm/contacts/:id/conversations - Get contact's conversation history
  app.get("/api/crm/contacts/:id/conversations", requireAuth, async (req, res) => {
    try {
      const contact = await storage.getCrmContact(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== contact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get all channels for this contact
      const channels = await storage.getCrmContactChannels(req.params.id);
      
      // Get conversations by matching customerId from channels
      const conversations: any[] = [];
      for (const channel of channels) {
        // Find conversations that match this channel's external ID
        const brandConversations = await storage.getConversations(contact.brandId);
        const matching = brandConversations.filter(c => 
          c.customerId === channel.externalId && 
          normalizePlatform(c.platform) === channel.platform
        );
        
        for (const conv of matching) {
          const messages = await storage.getMessagesByConversation(conv.id);
          conversations.push({
            ...conv,
            platform: channel.platform,
            messageCount: messages.length,
            lastMessage: messages[0],
          });
        }
      }

      // Sort by most recent activity
      conversations.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.lastMessageAt || 0);
        const dateB = new Date(b.updatedAt || b.lastMessageAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      res.json({ conversations });
    } catch (error: any) {
      console.error('[CRM] Error getting contact conversations:', error);
      res.status(500).json({ error: "Failed to get conversations", details: error.message });
    }
  });

  // GET /api/crm/contacts/:id/timeline - Get unified message history across all channels
  app.get("/api/crm/contacts/:id/timeline", requireAuth, async (req, res) => {
    try {
      const contact = await storage.getCrmContact(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== contact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const messages = await storage.getCrmContactTimeline(req.params.id, { limit });
      
      // Also get conversations for the "Open in Inbox" button
      const contactConversations = await storage.getCrmContactConversations(req.params.id);
      const mostRecentConversation = contactConversations.length > 0 ? contactConversations[0] : null;

      res.json({ 
        messages, 
        totalMessages: messages.length,
        mostRecentConversationId: mostRecentConversation?.id || null,
        conversationCount: contactConversations.length
      });
    } catch (error: any) {
      console.error('[CRM] Error getting contact timeline:', error);
      res.status(500).json({ error: "Failed to get timeline", details: error.message });
    }
  });

  // GET /api/crm/duplicates - Get potential duplicate contacts
  app.get("/api/crm/duplicates", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const duplicates = await storage.findAllDuplicatePairs(brandId);
      
      const enrichedDuplicates = await Promise.all(duplicates.map(async (pair) => {
        const [channels1, channels2] = await Promise.all([
          storage.getCrmContactChannels(pair.contact1.id),
          storage.getCrmContactChannels(pair.contact2.id)
        ]);
        
        return {
          ...pair,
          contact1: {
            ...pair.contact1,
            channels: channels1.map(ch => ({
              platform: ch.platform,
              username: ch.username,
              avatarUrl: ch.avatarUrl
            }))
          },
          contact2: {
            ...pair.contact2,
            channels: channels2.map(ch => ({
              platform: ch.platform,
              username: ch.username,
              avatarUrl: ch.avatarUrl
            }))
          }
        };
      }));
      
      res.json({ duplicates: enrichedDuplicates, count: enrichedDuplicates.length });
    } catch (error: any) {
      console.error('[CRM] Error finding duplicates:', error);
      res.status(500).json({ error: "Failed to find duplicates", details: error.message });
    }
  });

  // POST /api/crm/merge - Merge two contacts
  app.post("/api/crm/merge", requireAuth, async (req, res) => {
    try {
      const { primaryId, secondaryId, fieldResolutions } = req.body;
      
      if (!primaryId || !secondaryId) {
        return res.status(400).json({ error: "primaryId and secondaryId are required" });
      }

      const primaryContact = await storage.getCrmContact(primaryId);
      if (!primaryContact) {
        return res.status(404).json({ error: "Primary contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== primaryContact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await storage.mergeContacts(primaryId, secondaryId, fieldResolutions);
      
      res.json({ 
        success: true,
        primary: result.primary,
        mergedChannels: result.mergedChannels,
        mergedConversations: result.mergedConversations
      });
    } catch (error: any) {
      console.error('[CRM] Error merging contacts:', error);
      
      if (error.message === 'CONTACT_NOT_FOUND') {
        return res.status(404).json({ error: "One or both contacts not found" });
      }
      if (error.message === 'DIFFERENT_BRANDS') {
        return res.status(400).json({ error: "Contacts belong to different brands" });
      }
      if (error.message === 'CONTACT_ALREADY_ARCHIVED') {
        return res.status(400).json({ error: "Secondary contact is already archived" });
      }
      
      res.status(500).json({ error: "Failed to merge contacts", details: error.message });
    }
  });

  // POST /api/crm/undo-merge - Undo a recent merge (within grace period)
  app.post("/api/crm/undo-merge", requireAuth, async (req, res) => {
    try {
      const { archivedContactId } = req.body;
      
      if (!archivedContactId) {
        return res.status(400).json({ error: "archivedContactId is required" });
      }

      const archivedContact = await storage.getCrmContact(archivedContactId);
      if (!archivedContact) {
        return res.status(404).json({ error: "Archived contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== archivedContact.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await storage.undoMerge(archivedContactId);
      
      if (!result) {
        return res.status(400).json({ error: "Cannot undo merge - contact not archived or missing merge info" });
      }
      
      res.json({ 
        success: true,
        restored: result.restored,
        restoredChannels: result.restoredChannels,
        restoredConversations: result.restoredConversations
      });
    } catch (error: any) {
      console.error('[CRM] Error undoing merge:', error);
      
      if (error.message === 'GRACE_PERIOD_EXPIRED') {
        return res.status(400).json({ error: "Grace period expired (15 minutes). Merge cannot be undone." });
      }
      
      res.status(500).json({ error: "Failed to undo merge", details: error.message });
    }
  });

  // GET /api/crm/limbo - Get limbo entries (commenters not yet promoted to contacts)
  app.get("/api/crm/limbo", requireAuth, async (req, res) => {
    try {
      const brandId = req.query.brandId as string || req.user?.brandId;
      
      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const notPromoted = req.query.notPromoted !== 'false';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const entries = await storage.getCrmContactLimbo(brandId, { notPromoted, limit });

      res.json({ entries });
    } catch (error: any) {
      console.error('[CRM] Error getting limbo entries:', error);
      res.status(500).json({ error: "Failed to get limbo entries", details: error.message });
    }
  });

  // POST /api/crm/limbo/:id/promote - Promote limbo entry to full contact
  app.post("/api/crm/limbo/:id/promote", requireAuth, async (req, res) => {
    try {
      // Get the limbo entry by ID (works for both admin and client users)
      const limboEntry = await storage.getCrmLimboById(req.params.id);

      if (!limboEntry) {
        return res.status(404).json({ error: "Limbo entry not found" });
      }

      // Authorize: admin can access any, clients only their brand
      if (req.user?.role !== 'admin' && req.user?.brandId !== limboEntry.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (limboEntry.promotedToContactId) {
        return res.status(400).json({ error: "Already promoted", contactId: limboEntry.promotedToContactId });
      }

      // Create the contact
      const contact = await storage.createCrmContact({
        brandId: limboEntry.brandId,
        displayName: limboEntry.username || 'Unknown',
        status: 'lead',
        lifecycleStage: 'new',
        customFields: {},
      });

      // Create the channel
      await storage.createCrmContactChannel({
        contactId: contact.id,
        platform: limboEntry.platform,
        externalId: limboEntry.externalId,
        username: limboEntry.username,
        avatarUrl: limboEntry.avatarUrl,
      });

      // Mark limbo as promoted
      await storage.promoteCrmLimboToContact(limboEntry.id, contact.id);

      res.json({ success: true, contact });
    } catch (error: any) {
      console.error('[CRM] Error promoting limbo entry:', error);
      res.status(500).json({ error: "Failed to promote entry", details: error.message });
    }
  });

  // PUT /api/crm/contacts/:id/custom-field - Set a custom field
  app.put("/api/crm/contacts/:id/custom-field", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCrmContact(req.params.id);
      
      if (!existing) {
        return res.status(404).json({ error: "Contact not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== existing.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { field, value } = req.body;
      
      if (!field) {
        return res.status(400).json({ error: "field is required" });
      }

      const contact = await storage.updateCrmContactCustomField(req.params.id, field, value);

      res.json({ contact });
    } catch (error: any) {
      console.error('[CRM] Error updating custom field:', error);
      res.status(500).json({ error: "Failed to update custom field", details: error.message });
    }
  });

  // POST /api/crm/backfill - Run enrichment backfill on historical messages
  app.post("/api/crm/backfill", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;
      const limit = Math.min(parseInt(req.body.limit) || 1000, 5000);

      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { contactEnrichmentService } = await import("./services/contactEnrichmentService");
      const stats = await contactEnrichmentService.runBackfill(brandId, limit);

      res.json({
        success: true,
        message: `Procesados ${stats.messagesProcessed} mensajes. Encontrados ${stats.phonesFound} teléfonos y ${stats.emailsFound} emails. ${stats.contactsUpdated} contactos actualizados.`,
        stats,
      });
    } catch (error: any) {
      console.error('[CRM] Backfill error:', error);
      res.status(500).json({ error: "Failed to run backfill", details: error.message });
    }
  });

  // POST /api/crm/llm-enrich - Run LLM enrichment backfill to extract service interest and intent
  app.post("/api/crm/llm-enrich", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;
      const limit = Math.min(parseInt(req.body.limit) || 50, 200);

      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { llmEnrichmentService } = await import("./services/llmEnrichmentService");
      const stats = await llmEnrichmentService.runBackfill(brandId, limit);

      res.json({
        success: true,
        message: `LLM Enrichment: ${stats.contactsEnriched}/${stats.contactsProcessed} contactos y ${stats.limboEnriched}/${stats.limboProcessed} pendientes enriquecidos. ${stats.errors} errores.`,
        stats,
      });
    } catch (error: any) {
      console.error('[CRM] LLM Enrichment error:', error);
      res.status(500).json({ error: "Failed to run LLM enrichment", details: error.message });
    }
  });

  // POST /api/crm/populate - Populate CRM from ALL existing conversations (backfill contacts and limbo)
  app.post("/api/crm/populate", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;

      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { crmTrafficController } = await import("./services/crmTrafficController");
      
      // Get all conversations for this brand
      const allConversations = await storage.getConversations(brandId);
      
      const stats = {
        total: allConversations.length,
        contactsCreated: 0,
        limboCreated: 0,
        limboUpdated: 0,
        alreadyProcessed: 0,
        errors: 0,
      };

      for (const conv of allConversations) {
        try {
          // Determine message type: 'dm' for conversation type, 'comment' for comment type
          const messageType: 'dm' | 'comment' = conv.type === 'dm' || conv.type === 'conversation' ? 'dm' : 'comment';
          
          // Use customer_id as externalId, fallback to thread_external_id or conversation id
          const externalId = conv.customerId || conv.threadExternalId || conv.id;
          
          if (!externalId) {
            stats.errors++;
            continue;
          }

          // Normalize platform
          const platform = normalizePlatform(conv.platform || 'unknown');

          const result = await crmTrafficController.routeIncomingMessage({
            brandId,
            platform,
            externalId,
            username: conv.customerName || 'Unknown',
            avatarUrl: conv.customerAvatar,
            displayName: conv.customerName,
            messageType,
          });

          if (result.isNew) {
            if (result.type === 'contact') {
              // Link conversation to the new contact
              await storage.updateConversation(conv.id, { contactId: result.contactId });
              stats.contactsCreated++;
            } else {
              stats.limboCreated++;
            }
          } else {
            if (result.type === 'limbo') {
              stats.limboUpdated++;
            } else {
              // Link conversation to existing contact if not linked
              if (!conv.contactId && result.contactId) {
                await storage.updateConversation(conv.id, { contactId: result.contactId });
              }
              stats.alreadyProcessed++;
            }
          }
        } catch (convError: any) {
          console.error(`[CRM Populate] Error processing conversation ${conv.id}:`, convError.message);
          stats.errors++;
        }
      }

      res.json({
        success: true,
        message: `CRM poblado: ${stats.contactsCreated} nuevos contactos, ${stats.limboCreated} nuevos pendientes, ${stats.limboUpdated} pendientes actualizados, ${stats.alreadyProcessed} ya procesados, ${stats.errors} errores.`,
        stats,
      });
    } catch (error: any) {
      console.error('[CRM] Populate error:', error);
      res.status(500).json({ error: "Failed to populate CRM", details: error.message });
    }
  });

  // POST /api/crm/contacts/:id/enrich - Manually enrich a single contact with LLM
  app.post("/api/crm/contacts/:id/enrich", requireAuth, async (req, res) => {
    try {
      const brandId = req.body.brandId || req.user?.brandId;

      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      const { llmEnrichmentService } = await import("./services/llmEnrichmentService");
      const result = await llmEnrichmentService.enrichContactFromMessages(req.params.id, brandId);

      res.json({
        success: result.updated,
        message: result.updated 
          ? `Campos actualizados: ${result.fields.join(', ')}`
          : 'No se encontraron nuevos datos para extraer',
        fields: result.fields,
      });
    } catch (error: any) {
      console.error('[CRM] Contact enrichment error:', error);
      res.status(500).json({ error: "Failed to enrich contact", details: error.message });
    }
  });

  // ============================================
  // CONVERSATION LIFECYCLE MANAGEMENT ENDPOINTS (PRD-LIFECYCLE)
  // ============================================

  // POST /api/conversations/:id/status - Change conversation status
  app.post("/api/conversations/:id/status", requireAuth, async (req, res) => {
    try {
      const { status, reason } = req.body;
      const conversationId = req.params.id;
      
      if (!status || !['new', 'open', 'pending', 'solved', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: new, open, pending, solved, closed" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (conversation.status === 'closed' && status !== 'closed') {
        return res.status(400).json({ 
          error: "Cannot change status of closed conversation",
          message: "Las conversaciones cerradas son inmutables. Debe crearse una nueva conversación."
        });
      }

      const { conversationLifecycleService } = await import("./services/conversationLifecycleService");

      let updated;
      switch (status) {
        case 'open':
          updated = await conversationLifecycleService.markAsOpen(conversationId, req.user?.id);
          break;
        case 'pending':
          updated = await conversationLifecycleService.markAsPending(conversationId, reason);
          break;
        case 'solved':
          updated = await conversationLifecycleService.markAsSolved(conversationId, 'agent', req.user?.id);
          break;
        case 'closed':
          updated = await conversationLifecycleService.markAsClosed(conversationId);
          break;
        default:
          updated = await storage.updateConversation(conversationId, { status });
      }

      res.json({ 
        success: !!updated, 
        conversation: updated,
        message: `Conversación marcada como ${status}`
      });
    } catch (error: any) {
      console.error('[Lifecycle] Status change error:', error);
      res.status(500).json({ error: "Failed to change status", details: error.message });
    }
  });

  // GET /api/conversations/:id/history - Get status change history
  app.get("/api/conversations/:id/history", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const history = await storage.getConversationStatusHistory(conversationId);
      res.json(history);
    } catch (error: any) {
      console.error('[Lifecycle] Get history error:', error);
      res.status(500).json({ error: "Failed to get history", details: error.message });
    }
  });

  // POST /api/conversations/:id/close - Close conversation with AI summary
  app.post("/api/conversations/:id/close", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { summary: customSummary, skipSummary } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (conversation.status === 'closed') {
        return res.status(400).json({ error: "Conversation is already closed" });
      }

      const { conversationLifecycleService } = await import("./services/conversationLifecycleService");
      const { closingSummaryService } = await import("./services/closingSummaryService");

      let summaryData;
      if (customSummary) {
        summaryData = {
          summary: customSummary.summary || customSummary,
          sentiment: customSummary.sentiment || 'neutral',
          intent: customSummary.intent || 'No especificado',
          resolution: customSummary.resolution || 'Cerrado manualmente',
          topics: customSummary.topics || [],
          actionItems: customSummary.actionItems || [],
        };
      } else if (!skipSummary) {
        summaryData = await closingSummaryService.generateSummary(conversationId);
      }

      if (summaryData) {
        await closingSummaryService.saveSummary(conversationId, summaryData);
      }

      const updated = await conversationLifecycleService.markAsSolved(conversationId, 'agent', req.user?.id);

      res.json({
        success: !!updated,
        conversation: updated,
        summary: summaryData,
        message: "Conversación marcada como resuelta con resumen generado"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Close error:', error);
      res.status(500).json({ error: "Failed to close conversation", details: error.message });
    }
  });

  // POST /api/conversations/:id/reopen - Reopen a solved conversation
  app.post("/api/conversations/:id/reopen", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { reason } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (conversation.status === 'closed') {
        return res.status(400).json({ 
          error: "Cannot reopen closed conversation",
          message: "Las conversaciones cerradas son inmutables. El cliente debe iniciar una nueva conversación."
        });
      }

      const { conversationLifecycleService } = await import("./services/conversationLifecycleService");
      const updated = await conversationLifecycleService.reopenConversation(conversationId, reason || 'Reopened by agent');

      res.json({
        success: !!updated,
        conversation: updated,
        message: "Conversación reabierta"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Reopen error:', error);
      res.status(500).json({ error: "Failed to reopen conversation", details: error.message });
    }
  });

  // POST /api/conversations/:id/generate-summary - Generate summary without closing
  app.post("/api/conversations/:id/generate-summary", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { closingSummaryService } = await import("./services/closingSummaryService");
      const summary = await closingSummaryService.generateSummary(conversationId);

      res.json({
        success: !!summary,
        summary,
        message: summary ? "Resumen generado exitosamente" : "No se pudo generar el resumen"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Generate summary error:', error);
      res.status(500).json({ error: "Failed to generate summary", details: error.message });
    }
  });

  // PUT /api/conversations/:id/summary - Edit existing summary
  app.put("/api/conversations/:id/summary", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { summary, sentiment, intent, resolution } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateClosingSummary(
        conversationId,
        summary || conversation.closingSummary || '',
        sentiment || conversation.closingSentiment || 'neutral',
        intent || conversation.closingIntent || '',
        resolution || conversation.closingResolution || ''
      );

      res.json({
        success: !!updated,
        conversation: updated,
        message: "Resumen actualizado"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Update summary error:', error);
      res.status(500).json({ error: "Failed to update summary", details: error.message });
    }
  });

  // POST /api/conversations/:id/assign - Assign conversation to user
  app.post("/api/conversations/:id/assign", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { userId } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== conversation.brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { conversationLifecycleService } = await import("./services/conversationLifecycleService");
      const updated = userId 
        ? await conversationLifecycleService.assignToUser(conversationId, userId)
        : await conversationLifecycleService.unassign(conversationId);

      res.json({
        success: !!updated,
        conversation: updated,
        message: userId ? `Conversación asignada al usuario ${userId}` : "Conversación desasignada"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Assign error:', error);
      res.status(500).json({ error: "Failed to assign conversation", details: error.message });
    }
  });

  // GET /api/analytics/lifecycle - Get lifecycle metrics
  app.get("/api/analytics/lifecycle", requireAuth, async (req, res) => {
    try {
      const brandId = (req.query.brandId as string) || req.user?.brandId;
      const days = parseInt(req.query.days as string) || 30;

      if (!brandId) {
        return res.status(400).json({ error: "brandId is required" });
      }

      if (req.user?.role !== 'admin' && req.user?.brandId !== brandId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const metrics = await storage.getLifecycleMetrics(brandId, days);
      res.json(metrics);
    } catch (error: any) {
      console.error('[Analytics] Lifecycle metrics error:', error);
      res.status(500).json({ error: "Failed to get metrics", details: error.message });
    }
  });

  // GET /api/brands/:id/lifecycle-settings - Get brand lifecycle settings
  app.get("/api/brands/:id/lifecycle-settings", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      let settings = await storage.getBrandLifecycleSettings(brandId);
      
      if (!settings) {
        settings = await storage.upsertBrandLifecycleSettings({ brandId });
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error('[Lifecycle] Get settings error:', error);
      res.status(500).json({ error: "Failed to get lifecycle settings", details: error.message });
    }
  });

  // PUT /api/brands/:id/lifecycle-settings - Update brand lifecycle settings
  app.put("/api/brands/:id/lifecycle-settings", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const updates = req.body;

      let settings = await storage.getBrandLifecycleSettings(brandId);
      
      if (!settings) {
        settings = await storage.upsertBrandLifecycleSettings({ brandId, ...updates });
      } else {
        settings = await storage.updateBrandLifecycleSettings(brandId, updates);
      }
      
      res.json({
        success: !!settings,
        settings,
        message: "Configuración de ciclo de vida actualizada"
      });
    } catch (error: any) {
      console.error('[Lifecycle] Update settings error:', error);
      res.status(500).json({ error: "Failed to update lifecycle settings", details: error.message });
    }
  });

  // POST /api/conversations/:id/analyze-message - Analyze incoming message for thank you detection
  app.post("/api/conversations/:id/analyze-message", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const { thankYouDetector } = await import("./services/thankYouDetector");
      const analysis = thankYouDetector.analyzeMessage(message);

      res.json(analysis);
    } catch (error: any) {
      console.error('[Lifecycle] Message analysis error:', error);
      res.status(500).json({ error: "Failed to analyze message", details: error.message });
    }
  });

  // ====== SMART CUSTOMER FOLLOW-UP SYSTEM ENDPOINTS ======

  // GET /api/brands/:id/reminder-rules - Get reminder configuration for brand
  app.get("/api/brands/:id/reminder-rules", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const rules = await storage.getReminderRules(brandId);
      res.json({ success: true, rules });
    } catch (error: any) {
      console.error('[Reminders] Get rules error:', error);
      res.status(500).json({ error: "Failed to get reminder rules", details: error.message });
    }
  });

  // POST /api/brands/:id/reminder-rules - Create or update reminder rules
  app.post("/api/brands/:id/reminder-rules", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const existing = await storage.getReminderRules(brandId);
      
      // Validate and whitelist fields
      const validatedData = updateReminderRulesSchema.parse(req.body);
      
      let rules;
      if (existing) {
        rules = await storage.updateReminderRules(brandId, validatedData);
      } else {
        rules = await storage.upsertReminderRules({ ...validatedData, brandId });
      }
      
      res.json({ success: true, rules });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid reminder rules data", details: error.errors });
      }
      console.error('[Reminders] Save rules error:', error);
      res.status(500).json({ error: "Failed to save reminder rules", details: error.message });
    }
  });

  // POST /api/brands/:id/reminders/run - Manually trigger reminder scheduling and sending
  app.post("/api/brands/:id/reminders/run", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const { lifecycleScheduler } = await import("./services/lifecycleScheduler");
      const result = await lifecycleScheduler.runManualReminders(brandId);
      
      res.json({
        success: true,
        scheduled: result.scheduled,
        sent: result.sent,
        errors: result.errors,
        message: `Scheduled ${result.scheduled}, sent ${result.sent} reminders`,
      });
    } catch (error: any) {
      console.error('[Reminders] Manual run error:', error);
      res.status(500).json({ error: "Failed to run reminders", details: error.message });
    }
  });

  // GET /api/brands/:id/reminder-events - Get reminder events for brand with pagination
  app.get("/api/brands/:id/reminder-events", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getReminderEventsByBrand(brandId, { status, limit });
      res.json({ success: true, events });
    } catch (error: any) {
      console.error('[Reminders] Get brand events error:', error);
      res.status(500).json({ error: "Failed to get reminder events", details: error.message });
    }
  });

  // GET /api/conversations/:id/reminder-events - Get reminder events for conversation
  app.get("/api/conversations/:id/reminder-events", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const events = await storage.getReminderEventsByConversation(conversationId);
      res.json({ success: true, events });
    } catch (error: any) {
      console.error('[Reminders] Get events error:', error);
      res.status(500).json({ error: "Failed to get reminder events", details: error.message });
    }
  });

  // POST /api/conversations/:id/reminder-opt-out - Opt out conversation from reminders
  app.post("/api/conversations/:id/reminder-opt-out", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const updated = await storage.updateConversationReminderStatus(conversationId, 'opted_out');
      res.json({ success: !!updated, conversation: updated });
    } catch (error: any) {
      console.error('[Reminders] Opt out error:', error);
      res.status(500).json({ error: "Failed to opt out", details: error.message });
    }
  });

  // GET /api/conversations/:id/timeline - Get customer journey timeline
  app.get("/api/conversations/:id/timeline", requireAuth, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const timeline = await storage.getConversationTimeline(conversationId);
      if (!timeline) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json({ success: true, timeline });
    } catch (error: any) {
      console.error('[Timeline] Get timeline error:', error);
      res.status(500).json({ error: "Failed to get timeline", details: error.message });
    }
  });

  // GET /api/scheduler/status - Get scheduler status
  app.get("/api/scheduler/status", requireAuth, async (req, res) => {
    try {
      const { lifecycleScheduler } = await import("./services/lifecycleScheduler");
      res.json({ success: true, status: lifecycleScheduler.getStatus() });
    } catch (error: any) {
      console.error('[Scheduler] Get status error:', error);
      res.status(500).json({ error: "Failed to get scheduler status", details: error.message });
    }
  });

  // GET /api/brands/:id/reminders/analytics/summary - Get reminder analytics summary
  app.get("/api/brands/:id/reminders/analytics/summary", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const timeRange = (req.query.timeRange as 'today' | '7d' | '30d') || '7d';
      
      if (!['today', '7d', '30d'].includes(timeRange)) {
        return res.status(400).json({ error: "Invalid timeRange. Use 'today', '7d', or '30d'" });
      }
      
      const stats = await storage.getReminderStats(brandId, timeRange);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error('[Analytics] Get reminder stats error:', error);
      res.status(500).json({ error: "Failed to get reminder stats", details: error.message });
    }
  });

  // GET /api/brands/:id/reminders/analytics/timeline - Get reminder timeline data
  app.get("/api/brands/:id/reminders/analytics/timeline", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const timeRange = (req.query.timeRange as 'today' | '7d' | '30d') || '7d';
      
      if (!['today', '7d', '30d'].includes(timeRange)) {
        return res.status(400).json({ error: "Invalid timeRange. Use 'today', '7d', or '30d'" });
      }
      
      const timeline = await storage.getReminderTimeline(brandId, timeRange);
      res.json({ success: true, timeline });
    } catch (error: any) {
      console.error('[Analytics] Get reminder timeline error:', error);
      res.status(500).json({ error: "Failed to get reminder timeline", details: error.message });
    }
  });

  // GET /api/brands/:id/reminders/analytics/failures - Get failure reasons
  app.get("/api/brands/:id/reminders/analytics/failures", requireAuth, filterByBrand('id'), async (req, res) => {
    try {
      const brandId = req.params.id;
      const timeRange = (req.query.timeRange as 'today' | '7d' | '30d') || '7d';
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!['today', '7d', '30d'].includes(timeRange)) {
        return res.status(400).json({ error: "Invalid timeRange. Use 'today', '7d', or '30d'" });
      }
      
      const failures = await storage.getReminderFailureReasons(brandId, timeRange, limit);
      res.json({ success: true, failures });
    } catch (error: any) {
      console.error('[Analytics] Get failure reasons error:', error);
      res.status(500).json({ error: "Failed to get failure reasons", details: error.message });
    }
  });

  const httpServer = createServer(app);

  websocketService.initialize(httpServer);

  return httpServer;
}
