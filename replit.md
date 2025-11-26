# Sistema de Gestión de Inbox Social Media con Metricool

## Overview
This project is a social media message management system that integrates with Metricool to centralize and manage DMs and comments from multiple brands/companies. It allows admin users and clients to organize their social interactions efficiently. The system aims to streamline social media management, offering a centralized platform for communication, with ambitions to expand features for advanced user interaction and automation.

## User Preferences
### Idioma
- Comunicación en **español**

### Desarrollo
- **NO cambiar el diseño UI** sin consultar primero
- Si falta funcionalidad en la interfaz, preguntar antes de implementar
- Enfoque en backend primero, luego conectar con frontend
- Trabajar fase por fase (no adelantarse)

## System Architecture
The system is built on a robust, scalable architecture designed to handle social media interactions across various platforms.

### UI/UX Decisions
- Uses Radix UI and Tailwind CSS for a modern, responsive user interface.
- UI simplifies Metricool brand connection, hiding token/userId inputs for security.
- Features toast notifications for user feedback and clear loading states.
- The main inbox displays messages with author avatars, names, content, and platform filters.

### Technical Implementations
- **Frontend**: React + TypeScript + Vite + Wouter for routing.
- **Backend**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL (Neon) with Drizzle ORM for schema definition and Zod for validation.
- **Authentication**: `express-session` and `bcrypt` for secure login/logout. Supports 'admin' and 'client' roles with distinct access levels. Registration is restricted, and client users are tied to a specific brand.
- **Metricool Connector (`MetricoolService`)**: Handles all interactions with the Metricool API, including authentication, fetching brands, conversations, and comments across various social media providers.
- **Data Synchronization**: An upsert mechanism (`upsertMessage()`) ensures efficient storage of Metricool data, preventing duplicates and preserving full `rawData` JSON for future use.
- **API Client**: Provides a streamlined interface for frontend-backend communication, including fetching Metricool brands, importing, and syncing brand data.

### Feature Specifications
- **Role-Based Access Control**: Admins have full access to all data, while clients only see data related to their assigned brand.
- **Multi-brand Support**: A single Metricool user can manage multiple brands (`blogId`).
- **Secure Data Handling**: No Metricool credentials are exposed to the frontend. All sensitive operations are handled server-side.
- **Message Data Structure**: Stores messages with platform, type (conversation/comment), author, content, timestamp, status, and an optional `rawData` field for the original Metricool payload. Includes fields for `authorAvatar` and `metricoolId` for unique identification.
- **Automatic Filtering**: Data is automatically filtered by `brandId` for client users.
- **Supported Providers (Metricool Integration)**: Facebook, Instagram, TikTok, YouTube, LinkedIn, Google (GMB).

### System Design Choices
- **Database Schema**: `brands`, `users`, and `messages` tables are designed to support multi-tenancy and efficient data retrieval.
  - `brands` table stores Metricool-specific credentials (`metricoolToken`, `blogId`, `userId`).
  - `users` table links users to brands, enforcing role-based access.
  - `messages` table stores all social media interactions, linked to a specific brand.
- **Middleware**: `requireAuth` and `filterByBrand` ensure security and data isolation.
- **Scalability**: Designed to support approximately 25 client users and 1-2 admins, with plans for automatic synchronization every 130 seconds.
- **Error Handling**: Robust error handling is implemented, especially for Metricool API interactions.

## External Dependencies
- **Metricool API**: Core integration for fetching social media DMs and comments.
  - Base URL: `https://app.metricool.com/api`
  - Authentication: `X-Mc-Auth` header with `userToken`, `userId`, and `blogId` parameters.
  - Key Endpoints: `/api/admin/simpleProfiles`, `/api/v2/inbox/conversations`, `/api/v2/inbox/post-comments`.
- **PostgreSQL (Neon)**: Relational database for persistent storage.
- **Drizzle ORM**: TypeScript ORM for interacting with PostgreSQL.
- **Zod**: Schema validation library.
- **Radix UI**: Unstyled component library for building accessible UI components.
- **Tailwind CSS**: Utility-first CSS framework for styling.