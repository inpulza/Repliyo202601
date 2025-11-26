import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBrandSchema, insertUserSchema, insertMessageSchema, updateMessageSchema } from "@shared/schema";
import { hashPassword, verifyPassword, sanitizeUser, type AuthenticatedUser } from "./auth";
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
  
  app.get("/api/brands", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === 'admin') {
        const brands = await storage.getBrands();
        return res.json(brands);
      }
      
      if (req.user!.brandId) {
        const brand = await storage.getBrand(req.user!.brandId);
        return res.json(brand ? [brand] : []);
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
      res.json(brand);
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
      res.status(201).json(brand);
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

  const httpServer = createServer(app);

  return httpServer;
}
