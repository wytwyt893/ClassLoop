# Deployment Guide

This guide explains how to deploy your Interactive Classroom App to production using the automated deployment scripts.

## 📋 Prerequisites

Before deploying, make sure you have:

- [x] Node.js and npm installed
- [x] Convex account (sign up at [convex.dev](https://convex.dev))
- [x] Vercel account (sign up at [vercel.com](https://vercel.com))
- [x] Git repository (optional, but recommended)

## 🚀 Initial Deployment

### Step 1: Make sure you're logged in

```bash
# Log in to Vercel (if not already)
vercel login

# Log in to Convex (if not already)
npx convex dev
# Then stop it (Ctrl+C) - this initializes your Convex project
```

### Step 2: Run the deployment script

```bash
./deploy.sh
```

The script will:
1. ✅ Check for required tools
2. ✅ Deploy your Convex backend to production
3. ✅ Generate secure JWT keys for authentication
4. ✅ Ask for your Vercel project name
5. ✅ Build and deploy your frontend to Vercel
6. ✅ Configure all environment variables automatically
7. ✅ Redeploy with correct configuration

### Step 3: Test your deployment

Visit the Vercel URL provided at the end of the deployment to test your app!

---

## 🔄 Quick Redeployment

After the initial deployment, use the quick redeploy script for updates:

```bash
./redeploy.sh
```

Choose what to redeploy:
- `1` - Backend only (Convex)
- `2` - Frontend only (Vercel)
- `3` - Both

---

## 🔧 Manual Deployment

If you prefer to deploy manually or need more control:

### Deploy Convex Backend

```bash
npx convex deploy
```

### Deploy Vercel Frontend

```bash
npm run build
vercel --prod
```

### Set Environment Variables

#### Convex (via dashboard)
1. Go to https://dashboard.convex.dev
2. Select your production deployment
3. Go to Settings → Environment Variables
4. Add:
   - `JWT_PRIVATE_KEY` (generate with `node generateKeys.mjs`)
   - `JWKS` (from the same script)
   - `SITE_URL` (your Vercel URL)

#### Vercel (via CLI)
```bash
vercel env add VITE_CONVEX_URL production
# Enter your Convex production URL when prompted
```

---

## 🌍 Environment Variables Reference

### Convex Production Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_PRIVATE_KEY` | RSA private key for JWT signing | `-----BEGIN PRIVATE KEY----- ...` |
| `JWKS` | JSON Web Key Set for JWT verification | `{"keys":[{...}]}` |
| `SITE_URL` | Your production frontend URL | `https://your-app.vercel.app` |

### Vercel Production Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CONVEX_URL` | Your Convex production deployment URL | `https://happy-animal-123.convex.cloud` |

---

## 📝 Deployment Checklist

After deploying, verify:

- [ ] Can access the app at your Vercel URL
- [ ] Can sign up / sign in with email
- [ ] Can create a session
- [ ] Can add elements to a session
- [ ] Participants can join with session code
- [ ] Results are visible
- [ ] All features work as expected

---

## 🔍 Troubleshooting

### Authentication errors

**Error:** "pkcs8 must be PKCS#8 formatted string"

**Solution:** Make sure `JWT_PRIVATE_KEY` in Convex doesn't have quotes around it. It should start with `-----BEGIN PRIVATE KEY-----`.

### Frontend can't connect to backend

**Error:** Connection errors or "Convex not defined"

**Solution:** 
1. Check that `VITE_CONVEX_URL` is set in Vercel
2. Make sure it points to your production Convex URL (ends with `.convex.cloud`)
3. Redeploy Vercel after setting the variable

### Vercel build fails

**Solution:**
1. Check build logs: `vercel logs`
2. Make sure all dependencies are in `package.json`
3. Try building locally: `npm run build`

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore` for a reason
2. **Use different JWT keys for dev and production** - The script generates new keys automatically
3. **Rotate keys periodically** - Regenerate JWT keys every few months
4. **Use custom domains** - Set up a custom domain in Vercel for better branding and security

---

## 📚 Additional Resources

- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Convex Auth Setup](https://labs.convex.dev/auth/setup/manual)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🆘 Need Help?

- **Convex Issues:** https://discord.gg/convex
- **Vercel Issues:** https://vercel.com/support
- **App Issues:** Check the logs:
  - Convex: `npx convex dashboard`
  - Vercel: `vercel logs [url]`

---

## 📊 Monitoring

### View Logs

```bash
# Convex logs
npx convex dashboard

# Vercel logs
vercel logs [your-url]

# Real-time Vercel logs
vercel logs [your-url] --follow
```

### Check Deployment Status

```bash
# Vercel deployments
vercel list

# Convex deployments
npx convex dashboard
```

---

Happy deploying! 🚀



