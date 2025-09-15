# GardenScape Pro

## Overview
GardenScape Pro is a full-stack web application designed for ornamental garden design with AI assistance. It provides tools for creating garden layouts, a comprehensive plant library, plant identification, and expert gardening advice. The platform aims to offer a professional and intuitive experience for garden enthusiasts and professionals.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript on Vite.
- **Routing**: Wouter for lightweight client-side navigation.
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS.
- **State Management**: TanStack Query for server state management and caching.
- **Form Handling**: React Hook Form with Zod validation.
- **Authentication**: Session-based authentication integrated with Replit's OpenID Connect.
- **Internationalization**: React i18next for 6-language support, including English, German, Italian, French, Spanish, and Polish.
- **Performance**: Lazy loading, virtual scrolling, code splitting, search debouncing, and comprehensive error boundaries.
- **UI/UX**: Gold accent theme, consistent skeleton loading, smooth transitions, and auto-save functionality.
- **Workflow**: Streamlined 6-step garden creation process focused on seasonal visualization.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Session Management**: Express sessions with PostgreSQL storage using `connect-pg-simple`.
- **Authentication**: Passport.js with OpenID Connect strategy for Replit integration.
- **API Design**: RESTful API endpoints with standardized error handling.

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless.
- **Schema Management**: Drizzle Kit for migrations and schema synchronization.
- **Key Tables**: Users, sessions, gardens (with flexible shape and climate data), plants (with botanical info and care), plant collections, garden-plant relationships, and plant doctor sessions.
- **Plant Data**: Numeric dimension fields (heightMinCm, heightMaxCm, spreadMinCm, spreadMaxCm) for precise measurements in metric and Imperial units.

### Authentication & Authorization
- **Provider**: Replit OpenID Connect.
- **Session Storage**: PostgreSQL-backed sessions.
- **Security**: HTTP-only cookies, CSRF protection, and secure session management.
- **User Tiers**: Three subscription levels (free, pay_per_design, premium).

### AI System Architecture
- **AI Implementation**: Uses Anthropic Claude API for garden design generation.
- **Photorealization**: Automatic minimal marker mode for improved AI accuracy in garden visualizations (white dots on black background for AI reference).
- **Abuse Prevention**: Rate limiting and design limits implemented for different user tiers.

## External Dependencies

### Payment Processing
- **Stripe**: For subscription management, customer creation, and payment tracking.
- **React Stripe.js**: Frontend integration for payment forms.

### AI Services
- **Anthropic Claude**: AI-powered plant identification, disease diagnosis, care recommendations, and garden design generation.

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Platform**: Integrated hosting and authentication.
- **Supabase (HTTP API)**: Planned integration for persistent storage, as direct database connections encounter DNS resolution issues in the Replit environment.

### UI & Design System
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide Icons**: Consistent icon library.
- **Google Fonts**: Custom typography (DM Sans, Architects Daughter, Fira Code).