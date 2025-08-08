# Multisport Games v3

A family/friends Multisport Games tracking system with Keep-Trade-Cut voting and team drafting.

## Features

### MVP (Current)

- **Keep-Trade-Cut Voting System**: Anonymous voting on 3 random players
- **Elo Rating System**: KeepTradeCut-style ranking based on votes
- **Public Rankings**: Real-time player rankings with rating history
- **Admin User Management**: Add/edit participants and assign roles
- **Draft Countdown**: Homepage with countdown to draft time
- **Basic Events List**: Simple event management

### Coming Soon

- **Snake Draft System**: Sleeper-style draft interface
- **Captain Authentication**: Login system for draft participants
- **Team Management**: 4 teams with 6-8 players each
- **Trade System**: Pick trading with visual indicators

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js
- **Deployment**: Vercel

## Setup Instructions

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 2. Database Setup

1. Set up a PostgreSQL database (recommend Supabase)
2. Update the `DATABASE_URL` in your `.env.local`
3. Run database migrations:

```bash
npm run db:generate
npm run db:push
```

### 3. Development

```bash
npm install
npm run dev
```

### 4. Google OAuth Setup (Optional)

To enable Google sign-in:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an "OAuth 2.0 Client ID"
5. Set the authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://your-domain.com/api/auth/callback/google` (for production)
6. Copy the Client ID and Client Secret to your `.env.local` file
7. Restart your development server

The Google sign-in button will appear on the sign-in page once configured.

### 5. Admin Setup

1. Go to `/admin/users`
2. Add participants manually
3. Mark users as participants/captains as needed
4. Set draft time at `/admin/draft-time`

## Database Schema

### Core Tables

- `users`: Player profiles with Elo ratings
- `teams`: Team information
- `team_members`: Many-to-many relationship
- `events`: Event listings
- `draft_picks`: Draft pick tracking
- `elo_history`: Rating change history
- `votes`: Keep-Trade-Cut vote records
- `settings`: System settings (draft time, etc.)

## API Endpoints

### Public

- `GET /api/players/random` - Get 3 random players for voting
- `POST /api/vote` - Submit a Keep-Trade-Cut vote
- `GET /api/rankings` - Get player rankings
- `GET /api/events` - Get events list
- `GET /api/draft-time` - Get draft countdown time

### Admin

- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/[id]` - Update user
- `POST /api/draft-time` - Set draft time

## Pages

### Public

- `/` - Homepage with draft countdown
- `/rankings` - Public player rankings
- `/vote` - Keep-Trade-Cut voting interface
- `/draft` - Draft interface (coming soon)
- `/events` - Events list

### Admin

- `/admin/users` - User management
- `/admin/draft-time` - Set draft countdown time
- `/admin/captains` - Captain assignment (coming soon)
- `/admin/draft-order` - Draft order management (coming soon)
- `/admin/events` - Events management (coming soon)

## Elo System

The ranking system uses a KeepTradeCut-style Elo calculation:

- Starting rating: 1200
- K-factor: 32 (can be adjusted based on games played)
- Votes between 3 players affect Elo ratings
- Winner gains Elo, losers lose Elo
- Rating history is tracked for charts

## Deployment

1. Set up Vercel project
2. Connect to your domain (www.multisport.games)
3. Set environment variables in Vercel dashboard
4. Deploy from GitHub

## Next Steps

1. Set up Supabase database
2. Add test participants
3. Test voting system
4. Set draft time
5. Implement draft system
6. Add captain authentication
7. Deploy to Vercel
