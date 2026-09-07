# 🚀 Quick Deploy Reference

## First Time Deployment

```bash
# Option 1: Using script directly
./deploy.sh

# Option 2: Using npm
npm run deploy
```

**What happens:**
- ✓ Deploys Convex backend
- ✓ Generates JWT keys
- ✓ Deploys Vercel frontend  
- ✓ Configures all environment variables
- ✓ Asks only for project name (optional)

---

## Redeploy (Updates)

```bash
# Option 1: Interactive script
./redeploy.sh
# Then choose: 1) Backend, 2) Frontend, 3) Both

# Option 2: Using npm
npm run redeploy

# Option 3: Direct commands
npm run deploy:backend   # Backend only
npm run deploy:frontend  # Frontend only
```

---

## Manual Commands

```bash
# Backend
npx convex deploy

# Frontend
npm run build
vercel --prod
```

---

## Need Help?

- **Full guide:** `cat DEPLOYMENT.md`
- **This reference:** `cat QUICK_DEPLOY.md`
- **Convex logs:** `npx convex dashboard`
- **Vercel logs:** `vercel logs [url]`

---

## Pro Tips

1. **First deployment?** Just run `./deploy.sh` - it handles everything!
2. **Quick updates?** Use `./redeploy.sh` - faster and remembers settings
3. **Backend changes only?** Run `npm run deploy:backend`
4. **Frontend changes only?** Run `npm run deploy:frontend`
5. **Check what's deployed:** Look at `.deployment-info` file

---

## Common Issues

**"Permission denied"?**
```bash
chmod +x deploy.sh redeploy.sh
```

**"Not logged in"?**
```bash
vercel login
```

**"Environment variable not set"?**
- Run full deployment: `./deploy.sh`
- Or check: `DEPLOYMENT.md` for manual setup

---

That's it! Happy deploying! 🎉



