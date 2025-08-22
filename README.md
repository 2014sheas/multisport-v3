# Multisport Games v3

A family/friends Multisport Games tracking system with Keep-Trade-Cut voting and team drafting.

## Features

### MVP (Current)

- **Keep-Trade-Cut Voting System**: Anonymous voting on 3 random players
- **Elo Rating System**: KeepTradeCut-style ranking based on votes
- **Players**: Real-time player rankings with rating history
- **Admin User Management**: View users and link accounts to players
- **Event Countdown**: Homepage with countdown to event time
- **Basic Events List**: Simple event management
- **Event Types**: Support for Tournament, Scored, and Combined Team events

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
4. Set event time at `/admin/settings`

## Event Types

### Tournament Events

- **Description**: Traditional bracket-style tournaments with seeding and elimination rounds
- **Features**: Team seeding, bracket generation, match tracking, winner determination
- **Use Case**: Competitive tournaments with multiple rounds

### Scored Events

- **Description**: Point-based events where teams compete for highest scores
- **Features**: Point allocation, final standings, team rankings
- **Use Case**: Events where performance is measured by points rather than elimination

### Combined Team Events

- **Description**: Unique format where 4 teams are randomly combined into 2 super-teams
- **Features**:
  - Random team combination generation
  - Single match between combined teams
  - Point distribution based on final standings
  - Visual team combination display
- **How it works**:
  1. 4 teams participate in the event
  2. Teams are randomly shuffled and combined into 2 groups
  3. Each combined team plays as a single unit
  4. Single match determines the winner
  5. Points are awarded based on final standings
- **Use Case**: Fun, unpredictable events where team dynamics change completely

## Database Schema

### Core Tables

- `users`: Player profiles with Elo ratings
- `teams`: Team information
- `team_members`: Many-to-many relationship
- `events`: Event listings
- `draft_picks`: Draft pick tracking
- `elo_history`: Rating change history
- `votes`: Keep-Trade-Cut vote records
- `settings`: System settings (event time, etc.)

## API Endpoints

### Public

- `GET /api/players/random` - Get 3 random players for voting
- `POST /api/vote` - Submit a Keep-Trade-Cut vote
- `GET /api/rankings` - Get players
- `GET /api/events` - Get events list
- `GET /api/event-time` - Get event countdown time
- `GET /api/teams` - Get team assignments

### Admin

- `GET /api/admin/users` - Get all users
- `GET /api/admin/players` - Get players for admin
- `PUT /api/admin/users/[id]` - Update user
- `POST /api/event-time` - Set event time
- `GET /api/admin/teams` - Get teams for admin
- `PUT /api/admin/users/[id]` - Update user (including team assignment)

## Pages

### Public

- `/` - Homepage with event countdown
- `/rankings` - Players with voting modal
- `/events` - Events list
- `/teams` - Team assignments

### Admin

- `/admin/users` - User management
- `/admin/settings` - General settings (event time, etc.)
- `/admin/teams` - Team management

- `/admin/events` - Events management (coming soon)

## Elo System

The ranking system uses a KeepTradeCut-style Elo calculation:

- Starting rating: 5000
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
4. Set event time
5. Implement draft system
6. Add captain authentication
7. Deploy to Vercel
