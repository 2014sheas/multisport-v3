#!/bin/bash

echo "🚀 Setting up development environment for Multisport..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📦 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is running
if docker-compose ps postgres | grep -q "Up"; then
    echo "✅ PostgreSQL database is running!"
else
    echo "❌ Failed to start PostgreSQL database"
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Development Environment Configuration

# Environment
NODE_ENV="development"

# Database Configuration (Local PostgreSQL)
DATABASE_URL="postgresql://multisport_user:multisport_password@localhost:5432/multisport?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Email Configuration - Choose either Resend or SMTP

# Option 1: Resend.com (Recommended)
RESEND_API_KEY="re_123..."

# Option 2: SMTP Configuration (e.g., Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_SECURE="false"
EMAIL_FROM="noreply@yourdomain.com"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EOF
    echo "✅ Created .env.local file"
else
    echo "ℹ️  .env.local already exists"
fi

echo "🔧 Installing dependencies..."
npm install

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed

echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your actual values (Google OAuth, email, etc.)"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Visit http://localhost:3000"
echo ""
echo "To stop the database: docker-compose down"
echo "To start the database: docker-compose up -d" 