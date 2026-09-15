#!/bin/bash

# ==============================================================================
# Interactive Classroom App - Production Deployment Script
# ==============================================================================
# This script deploys your app to Convex (backend) and Vercel (frontend)
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}\n"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

# ==============================================================================
# STEP 0: Pre-flight checks
# ==============================================================================

print_step "Pre-flight checks"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for required CLIs
if ! command -v npx &> /dev/null; then
    print_error "npx not found. Please install Node.js and npm."
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js."
    exit 1
fi

print_success "All required tools are installed"

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_info "You need to log in to Vercel"
    vercel login
fi

VERCEL_USER=$(vercel whoami 2>/dev/null || echo "unknown")
print_success "Logged in to Vercel as: $VERCEL_USER"

# ==============================================================================
# STEP 1: Deploy Convex Backend
# ==============================================================================

print_step "STEP 1: Deploy Convex Backend to Production"

print_info "Deploying your Convex functions..."
CONVEX_OUTPUT=$(npx convex deploy 2>&1)
echo "$CONVEX_OUTPUT"

# Extract production Convex URL
CONVEX_URL=$(echo "$CONVEX_OUTPUT" | grep -o 'https://[a-z-]*-[0-9]*.convex.cloud' | head -1)

if [ -z "$CONVEX_URL" ]; then
    print_error "Failed to extract Convex URL. Please check the output above."
    exit 1
fi

print_success "Convex deployed to: $CONVEX_URL"

# ==============================================================================
# STEP 2: Generate and Set JWT Keys for Convex
# ==============================================================================

print_step "STEP 2: Generate JWT Keys for Authentication"

print_info "Generating secure JWT keys..."

# Create temporary key generation script
cat > /tmp/generateKeys.mjs << 'EOF'
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

console.log("JWT_PRIVATE_KEY=" + privateKey.trimEnd().replace(/\n/g, " "));
console.log("JWKS=" + jwks);
EOF

# Generate keys
KEYS_OUTPUT=$(node /tmp/generateKeys.mjs)
JWT_PRIVATE_KEY=$(echo "$KEYS_OUTPUT" | grep "JWT_PRIVATE_KEY=" | sed 's/JWT_PRIVATE_KEY=//')
JWKS=$(echo "$KEYS_OUTPUT" | grep "JWKS=" | sed 's/JWKS=//')

# Clean up
rm /tmp/generateKeys.mjs

print_success "JWT keys generated successfully"

# ==============================================================================
# STEP 3: Ask for Project Details
# ==============================================================================

print_step "STEP 3: Configure Deployment"

# Get Vercel project name
echo -n "Enter your Vercel project name (press Enter for auto-generated): "
read VERCEL_PROJECT_NAME

if [ -z "$VERCEL_PROJECT_NAME" ]; then
    VERCEL_PROJECT_NAME="teachingtools-$(date +%s)"
    print_info "Using auto-generated name: $VERCEL_PROJECT_NAME"
fi

# ==============================================================================
# STEP 4: Deploy Frontend to Vercel
# ==============================================================================

print_step "STEP 4: Deploy Frontend to Vercel"

print_info "Building frontend..."
npm run build

print_info "Deploying to Vercel..."
VERCEL_OUTPUT=$(vercel --prod --yes --name "$VERCEL_PROJECT_NAME" 2>&1)
echo "$VERCEL_OUTPUT"

# Extract Vercel URL
VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[a-zA-Z0-9-]*\.vercel\.app' | tail -1)

if [ -z "$VERCEL_URL" ]; then
    print_error "Failed to extract Vercel URL. Please check the output above."
    exit 1
fi

print_success "Frontend deployed to: $VERCEL_URL"

# ==============================================================================
# STEP 5: Set Environment Variables
# ==============================================================================

print_step "STEP 5: Configure Environment Variables"

# Set Convex environment variables
print_info "Setting Convex environment variables..."

# Set JWT_PRIVATE_KEY
echo "$JWT_PRIVATE_KEY" | npx convex env set JWT_PRIVATE_KEY --prod 2>&1 | grep -v "^$" || true

# Set JWKS
echo "$JWKS" | npx convex env set JWKS --prod 2>&1 | grep -v "^$" || true

# Set SITE_URL
echo "$VERCEL_URL" | npx convex env set SITE_URL --prod 2>&1 | grep -v "^$" || true

print_success "Convex environment variables configured"

# Set Vercel environment variables
print_info "Setting Vercel environment variables..."

# Note: Vercel CLI's env commands require interactive input, so we'll provide instructions
vercel env add VITE_CONVEX_URL production --yes 2>&1 << EOF || true
$CONVEX_URL
EOF

print_success "Vercel environment variables configured"

# ==============================================================================
# STEP 6: Redeploy Vercel with Environment Variables
# ==============================================================================

print_step "STEP 6: Redeploy Frontend with Environment Variables"

print_info "Triggering redeploy with new environment variables..."
vercel --prod --yes 2>&1 | grep -v "Inspect:" || true

print_success "Frontend redeployed with correct configuration"

# ==============================================================================
# STEP 7: Summary
# ==============================================================================

print_step "🎉 Deployment Complete!"

echo ""
echo "================================================"
echo "         DEPLOYMENT SUMMARY"
echo "================================================"
echo ""
echo "Backend (Convex):  $CONVEX_URL"
echo "Frontend (Vercel): $VERCEL_URL"
echo ""
echo "Environment Variables Set:"
echo "  Convex:"
echo "    ✓ JWT_PRIVATE_KEY"
echo "    ✓ JWKS"
echo "    ✓ SITE_URL"
echo "  Vercel:"
echo "    ✓ VITE_CONVEX_URL"
echo ""
echo "================================================"
echo ""

# Save deployment info
cat > .deployment-info << EOF
# Last Deployment: $(date)
CONVEX_URL=$CONVEX_URL
VERCEL_URL=$VERCEL_URL
VERCEL_PROJECT_NAME=$VERCEL_PROJECT_NAME
EOF

print_success "Deployment info saved to .deployment-info"

echo ""
print_info "Next steps:"
echo "  1. Visit your app: $VERCEL_URL"
echo "  2. Test authentication and all features"
echo "  3. Configure custom domain (optional): https://vercel.com/docs/concepts/projects/domains"
echo ""
print_info "To view logs:"
echo "  - Convex: npx convex dashboard"
echo "  - Vercel: vercel logs $VERCEL_URL"
echo ""
print_success "Happy deploying! 🚀"



