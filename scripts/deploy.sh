#!/bin/bash

# Deployment Script for Multisport v3
# This script automates the deployment process to Vercel

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

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "This doesn't appear to be a Next.js project. Please run this script from the project root."
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists "node"; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists "npm"; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command_exists "vercel"; then
        print_warning "Vercel CLI is not installed. Installing now..."
        npm install -g vercel
    fi
    
    print_success "Prerequisites check completed!"
}

# Function to build the application
build_application() {
    print_status "Building application..."
    
    # Install dependencies
    npm install
    
    # Generate Prisma client
    npm run db:generate
    
    # Build the application
    npm run build
    
    print_success "Application built successfully!"
}

# Function to deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if user is logged in to Vercel
    if ! vercel whoami >/dev/null 2>&1; then
        print_warning "You are not logged in to Vercel. Please log in first:"
        vercel login
    fi
    
    # Deploy to Vercel
    if [ "$1" = "production" ]; then
        print_status "Deploying to production..."
        vercel --prod
    else
        print_status "Deploying to preview..."
        vercel
    fi
    
    print_success "Deployment completed!"
}

# Function to check deployment status
check_deployment() {
    print_status "Checking deployment status..."
    
    # Get the latest deployment URL
    DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "")
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_success "Deployment URL: https://$DEPLOYMENT_URL"
        
        # Test the deployment
        print_status "Testing deployment..."
        if curl -s -f "https://$DEPLOYMENT_URL" >/dev/null; then
            print_success "Deployment is live and accessible!"
        else
            print_warning "Deployment might still be building. Please check Vercel dashboard."
        fi
    else
        print_warning "Could not determine deployment URL. Please check Vercel dashboard."
    fi
}

# Function to show deployment help
show_help() {
    echo "Multisport v3 Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build         Build the application locally"
    echo "  deploy        Deploy to Vercel (preview)"
    echo "  deploy:prod   Deploy to Vercel (production)"
    echo "  full          Full deployment (build + deploy to production)"
    echo "  status        Check deployment status"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build        # Build application locally"
    echo "  $0 deploy       # Deploy to preview"
    echo "  $0 deploy:prod  # Deploy to production"
    echo "  $0 full         # Full production deployment"
}

# Function to run full deployment
full_deployment() {
    print_status "Starting full deployment process..."
    
    check_directory
    check_prerequisites
    build_application
    deploy_to_vercel "production"
    check_deployment
    
    print_success "Full deployment completed!"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_directory
        check_prerequisites
        build_application
        ;;
    "deploy")
        check_directory
        check_prerequisites
        deploy_to_vercel "preview"
        ;;
    "deploy:prod")
        check_directory
        check_prerequisites
        deploy_to_vercel "production"
        ;;
    "full")
        full_deployment
        ;;
    "status")
        check_deployment
        ;;
    "help"|*)
        show_help
        ;;
esac 