# Development Setup

This guide will help you set up a local development environment for the Multisport application.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

## Quick Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd multisport-v3
   ```

2. **Run the setup script**:
   ```bash
   ./scripts/setup-dev.sh
   ```

This script will:
- Start a PostgreSQL database using Docker
- Create a `.env.local` file with development configuration
- Install dependencies
- Run database migrations
- Seed the database

## Manual Setup

If you prefer to set up manually:

### 1. Start the Database

```bash
docker-compose up -d postgres
```

### 2. Create Environment File

Copy the example environment file:
```bash
cp env.example .env.local
```

Update `.env.local` with your development settings:
```env
# Database Configuration (Local PostgreSQL)
DATABASE_URL="postgresql://multisport_user:multisport_password@localhost:5432/multisport?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Add your OAuth and email configuration
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Database Management

### Start Database
```bash
docker-compose up -d postgres
```

### Stop Database
```bash
docker-compose down
```

### Reset Database
```bash
# Stop the database
docker-compose down

# Remove the volume (this will delete all data)
docker volume rm multisport-v3_postgres_data

# Start fresh
docker-compose up -d postgres
npx prisma migrate deploy
npx prisma db seed
```

### View Database
```bash
# Using Prisma Studio
npx prisma studio

# Or connect directly with psql
docker exec -it multisport-dev-db psql -U multisport_user -d multisport
```

## Environment Variables

### Required for Development

- `DATABASE_URL`: Local PostgreSQL connection string
- `NEXTAUTH_URL`: Your local development URL
- `NEXTAUTH_SECRET`: A random string for session encryption

### Optional (for full functionality)

- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `RESEND_API_KEY`: For email functionality
- SMTP settings: Alternative email configuration

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running
- Check if the database container is up: `docker-compose ps`
- Verify the connection string in `.env.local`

### Port Conflicts
If port 5432 is already in use:
1. Stop other PostgreSQL instances
2. Or change the port in `docker-compose.yml`

### Permission Issues
- Make sure Docker has proper permissions
- On macOS/Linux, you might need to run Docker commands with `sudo`

## Development Workflow

1. **Start the database**: `docker-compose up -d postgres`
2. **Start the dev server**: `npm run dev`
3. **Make changes** to your code
4. **Test locally** at http://localhost:3000
5. **Commit and push** your changes

## Database Schema Changes

When you modify the Prisma schema:

```bash
# Generate a new migration
npx prisma migrate dev --name "description-of-changes"

# Apply migrations to production
npx prisma migrate deploy
``` 