#!/bin/bash

# ==============================================================================
# Quick Redeploy Script
# ==============================================================================
# Use this for quick redeployments when you just need to update code
# (doesn't regenerate keys or reconfigure environment variables)
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}\n"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC}  $1"
}

# Load previous deployment info
if [ ! -f ".deployment-info" ]; then
    echo "No deployment info found. Please run ./deploy.sh first."
    exit 1
fi

source .deployment-info

print_step "Quick Redeploy"

# Ask what to redeploy
echo "What do you want to redeploy?"
echo "  1) Backend only (Convex)"
echo "  2) Frontend only (Vercel)"
echo "  3) Both"
echo -n "Enter choice [1-3]: "
read choice

case $choice in
    1)
        print_step "Redeploying Convex Backend"
        npx convex deploy
        print_info "Backend deployed to: $CONVEX_URL"
        ;;
    2)
        print_step "Redeploying Vercel Frontend"
        npm run build
        vercel --prod --yes
        print_info "Frontend deployed to: $VERCEL_URL"
        ;;
    3)
        print_step "Redeploying Both Backend and Frontend"
        
        print_info "Deploying backend..."
        npx convex deploy
        
        print_info "Building and deploying frontend..."
        npm run build
        vercel --prod --yes
        
        echo ""
        echo "✓ Backend: $CONVEX_URL"
        echo "✓ Frontend: $VERCEL_URL"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Redeploy complete!"



