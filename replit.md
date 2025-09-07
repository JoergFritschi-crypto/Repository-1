# replit.md

## Overview

GardenScape Pro is a full-stack web application for designing ornamental gardens with AI assistance. The platform provides users with tools to create garden layouts, access a comprehensive plant library, get plant identification services, and receive expert gardening advice. The application features a modern React frontend with Express.js backend, PostgreSQL database, and integrates external services for payment processing and AI-powered plant analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Navigation Improvements (January 2025)
- Enhanced garden properties form navigation to prevent users from getting trapped
- Added "Exit" button on step 1 and "Save Draft" button on all steps for better UX
- Relaxed field validation - only garden name is truly required to proceed from step 1
- Added clear visual indicators: required fields marked with red asterisk, recommended fields marked with orange "(Recommended)" label
- Implemented auto-save behavior based on user tier: always enabled for paid users, optional for free users with default opt-in
- Added helper note explaining that recommended fields can be filled in later for better flexibility

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite for fast development and hot reloading
- **Routing**: Client-side routing using Wouter for lightweight navigation
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for type-safe form validation
- **Authentication**: Session-based authentication integrated with Replit's OpenID Connect

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Authentication**: Passport.js with OpenID Connect strategy for Replit integration
- **API Design**: RESTful API endpoints with standardized error handling and logging middleware

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless for scalable cloud hosting
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Key Tables**: 
  - Users and sessions (required for Replit Auth)
  - Gardens with flexible shape definitions and climate data
  - Plants with comprehensive botanical information and care requirements
  - Plant collections and garden-plant relationships
  - Plant doctor sessions for AI-powered plant analysis

### Authentication & Authorization
- **Provider**: Replit OpenID Connect for seamless platform integration
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Security**: HTTP-only cookies, CSRF protection, and secure session management
- **User Management**: Automatic user creation and profile management
- **User Tiers**: Three subscription levels (free, pay_per_design, premium) with different feature access

### Development & Deployment
- **Build System**: Vite for frontend bundling with esbuild for backend compilation
- **Development**: Hot module replacement and error overlay for improved DX
- **TypeScript**: Strict typing across the entire codebase with shared types
- **Code Organization**: Monorepo structure with clear separation between client, server, and shared modules

## External Dependencies

### Payment Processing
- **Stripe**: Complete payment infrastructure for subscription management
- **Integration**: React Stripe.js for frontend payment forms
- **Features**: Customer creation, subscription handling, and payment status tracking

### AI Services
- **Anthropic Claude**: AI-powered plant identification and gardening advice
- **Use Cases**: Plant species identification, disease diagnosis, and care recommendations
- **Integration**: Server-side API calls with proper error handling and rate limiting

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Replit Platform**: Integrated hosting and authentication services
- **WebSocket Support**: Real-time features using ws library for database connections

### UI & Design System
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Consistent icon library for UI elements
- **Google Fonts**: Custom typography with DM Sans, Architects Daughter, and Fira Code

### Development Tools
- **TypeScript**: Static typing for enhanced developer experience
- **ESLint & Prettier**: Code formatting and quality enforcement
- **React DevTools**: Enhanced debugging capabilities
- **Vite Plugins**: Development enhancements including error modals and source mapping