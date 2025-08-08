#!/bin/bash

# Environment Setup Script for Multisport v3
# This script helps set up different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    # Check if .env.local exists
    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists. Backing up to .env.local.backup"
        cp .env.local .env.local.backup
    fi
    
    # Create .env.local from example
    if [ -f "env.example" ]; then
        cp env.example .env.local
        print_success "Created .env.local from env.example"
    else
        print_error "env.example not found"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run db:generate
    
    print_success "Development environment setup complete!"
    print_warning "Please update .env.local with your actual database URL and secrets"
}

# Function to setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    # Check if required environment variables are set
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is required for production"
        exit 1
    fi
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        print_error "NEXTAUTH_SECRET environment variable is required for production"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run db:generate
    
    # Deploy migrations
    print_status "Deploying database migrations..."
    npm run db:migrate:deploy
    
    print_success "Production environment setup complete!"
}

# Function to reset development database
reset_dev_database() {
    print_status "Resetting development database..."
    
    # Check if we're in development mode
    if [ "$NODE_ENV" != "development" ]; then
        print_warning "This will reset the database. Are you sure you want to continue? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_status "Database reset cancelled"
            exit 0
        fi
    fi
    
    npm run db:reset
    npm run db:seed
    
    print_success "Development database reset complete!"
}

# Function to show current environment status
show_status() {
    print_status "Current environment status:"
    
    if [ -f ".env.local" ]; then
        echo "✅ .env.local exists"
    else
        echo "❌ .env.local missing"
    fi
    
    if command_exists "node"; then
        echo "✅ Node.js installed: $(node --version)"
    else
        echo "❌ Node.js not installed"
    fi
    
    if command_exists "npm"; then
        echo "✅ npm installed: $(npm --version)"
    else
        echo "❌ npm not installed"
    fi
    
    if [ -d "node_modules" ]; then
        echo "✅ Dependencies installed"
    else
        echo "❌ Dependencies not installed"
    fi
    
    if [ -f "prisma/schema.prisma" ]; then
        echo "✅ Prisma schema exists"
    else
        echo "❌ Prisma schema missing"
    fi
}

# Function to show help
show_help() {
    echo "Multisport v3 Environment Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev           Setup development environment"
    echo "  prod          Setup production environment"
    echo "  reset-db      Reset development database"
    echo "  status        Show current environment status"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev        # Setup development environment"
    echo "  $0 prod       # Setup production environment"
    echo "  $0 reset-db   # Reset development database"
}

# Main script logic
case "${1:-help}" in
    "dev")
        setup_development
        ;;
    "prod")
        setup_production
        ;;
    "reset-db")
        reset_dev_database
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac 