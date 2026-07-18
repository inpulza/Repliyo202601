import { type NextFunction, type Request, type Response } from "express";

export const API_CACHE_CONTROL = "private, no-store";

export function preventApiCaching(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader("Cache-Control", API_CACHE_CONTROL);
  next();
}

export function handleUnknownApi(_req: Request, res: Response) {
  res.status(404).json({ message: "Not Found" });
}
