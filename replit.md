# Sistema de Gestión de Inbox Social Media con Metricool

## Overview
This project is a social media message management system that integrates with Metricool to centralize and manage DMs and comments for multiple brands/companies. It allows admin users and clients to organize their social interactions efficiently. The system aims to streamline social media communication, providing a unified inbox for various platforms.

## User Preferences
### Idioma
- Comunicación en **español**

### Desarrollo
- **NO cambiar el diseño UI** sin consultar primero
- Si falta funcionalidad en la interfaz, preguntar antes de implementar
- Enfoque en backend primero, luego conectar con frontend
- Trabajar fase por fase (no adelantarse)

## System Architecture
The system is built as a full-stack application with a clear separation of concerns.

### UI/UX Decisions
- **Frontend Framework**: React with TypeScript and Vite.
- **Routing**: Wouter for client-side navigation.
- **UI Components**: Radix UI for accessible and customizable components, styled with Tailwind CSS.
- **Design Approach**: Emphasis on a clean, functional interface with clear information hierarchy. Avatars, author names, content, and timestamps are prominently displayed in the inbox view.

### Technical Implementations
- **Database Schema**: PostgreSQL with Drizzle ORM, defining `brands`, `users`, and `messages` tables. `brands` store Metricool-specific details like `metricoolToken` and `blogId`. `users` have `role` ('admin', 'client') and are linked to `brands`. `messages` include `rawData` (jsonb) for storing full Metricool responses, `authorAvatar`, and `metricoolId` to prevent duplicates.
- **Authentication**: `express-session` and `bcrypt` for secure login/logout. Admin users can create other users, but admin creation is restricted to manual database entry.
- **Authorization**: `requireAuth` middleware protects authenticated routes. `filterByBrand()` automatically filters data for client users based on their `brandId`, ensuring data isolation. Admins have full access to all data.
- **Metricool Integration**: `MetricoolService` handles communication with the Metricool API using `X-Mc-Auth` header and `userId`, `blogId` parameters. It fetches conversations (DMs) and comments from various social media providers.
- **Data Synchronization**: An upsert mechanism is implemented (`upsertMessage()`) to prevent duplicate messages based on `metricoolId` while updating existing ones. The system maps Metricool's conversation and comment structures to its internal `messages` schema.
- **API Client**: A robust API client (`client/src/lib/api.ts`) for frontend interaction with backend endpoints, including fetching brands, importing, and syncing.
- **Error Handling & Feedback**: Toasts in Spanish provide user feedback for actions like importing or syncing.

### Feature Specifications
- **Multi-brand Support**: Each client user is associated with a single brand, while admins can manage multiple brands.
- **Role-Based Access Control**: Differentiates between 'admin' and 'client' roles with distinct access levels.
- **Message Filtering**: Frontend inbox allows filtering messages by platform.
- **Secure Credential Handling**: Metricool API credentials are stored server-side (e.g., in environment variables or secrets) and are not exposed to the frontend.

### System Design Choices
- **Multi-tenant Architecture**: Designed to securely isolate data for different brands/clients.
- **Iterative Development**: Focus on completing features phase by phase (e.g., database & auth, then Metricool integration, then frontend display, then automation).
- **Security First**: All API routes are protected with authentication and role-based validation. AuthContext ensures session validity, and protected routes redirect to login if no valid session exists.

## External Dependencies
- **Metricool API**: Primary external service for fetching social media DMs and comments.
  - Base URL: `https://app.metricool.com/api`
  - Authentication: `X-Mc-Auth` header, `userId`, `blogId` parameters.
  - Key Endpoints: `/api/admin/simpleProfiles`, `/api/v2/inbox/conversations`, `/api/v2/inbox/post-comments`.
- **PostgreSQL (Neon)**: Relational database for persistent storage.
- **Drizzle ORM**: TypeScript ORM for interacting with PostgreSQL.
- **Zod**: Schema declaration and validation library for data integrity.
- **express-session**: Middleware for managing user sessions.
- **bcrypt**: Library for hashing passwords.