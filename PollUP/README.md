# TeachingTools Interactive Classroom App

A real-time interactive classroom application built with React, Vite, and Convex. Create live polling sessions with polls, quizzes, timers, and more for your classroom or presentation.

## Features

- 🎯 **Interactive Elements**: Create polls, multiple choice questions, true/false questions, and text responses
- ⏱️ **Timers**: Built-in countdown timers for activities
- 👥 **Real-time Participation**: Students join with simple session codes
- 📊 **Live Results**: See responses update in real-time
- 🔐 **Secure Authentication**: Anonymous authentication via Convex Auth
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Backend**: Convex (serverless backend with real-time database)
- **Hosting**: Vercel (frontend) + Convex (backend)
- **Authentication**: Convex Auth

---

## Development

### Prerequisites

- Node.js 20+
- npm or yarn
- A Convex account (free tier available)
- A Vercel account (free tier available)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/JonasWeinert/PollUP.git
   cd PollUP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Prompt you to log in to Convex
   - Create a new project (or link to existing)
   - Generate `.env.local` with your development deployment URL
   - Start the Convex dev server

4. **Run the development server**
   ```bash
   npm run dev
   ```
   This starts both the frontend (Vite) and backend (Convex) in development mode.

5. **Open your browser**
   - Navigate to `http://localhost:5173`
   - The app should be running with hot reload enabled

### Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   └── main.tsx            # App entry point
├── convex/
│   ├── schema.ts           # Database schema
│   ├── sessions.ts         # Session management functions
│   ├── elements.ts         # Interactive element functions
│   ├── responses.ts        # Response handling functions
│   └── auth.ts             # Authentication configuration
├── public/                 # Static assets
└── dist/                   # Build output (generated)
```

---

## Deployment

### Initial Deployment

#### Step 1: Deploy Convex Backend

1. **Generate a production deploy key**
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Select your project
   - Navigate to **Settings** → **Deploy Keys**
   - Click **Generate a deploy key** for **Production**
   - Copy the key (starts with `prod:...`)

2. **Deploy to production**
   ```bash
   npx convex deploy
   ```

#### Step 2: Deploy Frontend to Vercel

1. **Connect your GitHub repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Vercel will auto-detect it as a Vite project

2. **Configure environment variables in Vercel**
   - In your Vercel project settings
   - Go to **Settings** → **Environment Variables**
   - Add the following:

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `CONVEX_DEPLOY_KEY` | Your production deploy key from Step 1 | Production, Preview, Development |
   | `VITE_CONVEX_URL` | Your Convex production URL (e.g., `https://your-project.convex.cloud`) | Production, Preview, Development |

3. **Deploy**
   - Click **Deploy** in Vercel
   - Your app will be live at `https://your-project.vercel.app`

### Automatic Redeployment

Every push to the `main` branch automatically triggers deployment:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

**What happens automatically:**
1. ✅ Vercel detects the push via GitHub integration
2. ✅ Runs `npx convex deploy` (deploys backend, generates API files)
3. ✅ Runs `npm run build` (builds frontend)
4. ✅ Deploys to production

**No manual deployment needed!** 🚀

### Manual Deployment (Optional)

If you need to deploy manually:

**First-time setup:**
```bash
./deploy.sh
```

**Subsequent deployments:**
```bash
./redeploy.sh
```

**Deploy only backend:**
```bash
npm run deploy:backend
```

**Deploy only frontend:**
```bash
npm run deploy:frontend
```

---

## Contributing

This is a side project born out of frustration with propietary solutions like Mentimeter. Contributionsare very welcome! Here's how to get started:

### Getting Started

1. **Fork the repository**
   - Click the "Fork" button on GitHub
   - Clone your fork locally

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, well-documented code
   - Follow the existing code style
   - Test your changes locally

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Describe your changes clearly

### Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -m "feat: Add timer pause functionality"
git commit -m "fix: Resolve participant disconnect issue"
git commit -m "docs: Update deployment instructions"
```

### Code Style

- **TypeScript**: Use proper typing, avoid `any`
- **React**: Use functional components and hooks
- **Convex**: Follow [Convex best practices](https://docs.convex.dev/)
- **Formatting**: Run `npm run lint` before committing

### Testing

- Test all features locally with `npm run dev`
- Verify builds work with `npm run build`
- Test in different browsers and screen sizes
- For backend changes, test with multiple concurrent users

### Pull Request Guidelines

**Good PR practices:**
- ✅ Clear, descriptive title
- ✅ Detailed description of changes
- ✅ Reference related issues (e.g., "Fixes #123")
- ✅ Screenshots/GIFs for UI changes
- ✅ Keep changes focused and atomic
- ✅ Ensure CI passes (if configured)

**Before submitting:**
- [ ] Code builds successfully (`npm run build`)
- [ ] No console errors or warnings
- [ ] Tested locally in dev and production mode
- [ ] Updated documentation if needed
- [ ] Followed commit message guidelines

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run build` | Build for production |
| `npm run lint` | Run TypeScript and ESLint checks |
| `npm run deploy` | Initial production deployment |
| `npm run redeploy` | Quick redeployment |
| `npm run deploy:backend` | Deploy Convex backend only |
| `npm run deploy:frontend` | Deploy Vercel frontend only |

---

## Troubleshooting

### Build Errors

**"Could not resolve convex/_generated/api"**
- Ensure `CONVEX_DEPLOY_KEY` is set in Vercel
- Check that Convex deployment succeeded
- Verify `convex/_generated/` folder exists locally (run `npx convex dev`)

**"Authentication failed"**
- Verify your Convex deploy key is correct
- Ensure it's set for the correct environment (Production/Preview)
- Regenerate the key if needed

### Development Issues

**Changes not reflecting**
- Check that `npm run dev` is running
- Ensure `npx convex dev` is running in the background
- Clear browser cache and reload

**Database issues**
- Check Convex Dashboard for errors
- Verify schema matches your code in `convex/schema.ts`
- Run `npx convex dev` to sync schema

---

## Resources

- **Convex Documentation**: https://docs.convex.dev
- **Vite Documentation**: https://vitejs.dev
- **React Documentation**: https://react.dev
- **TailwindCSS**: https://tailwindcss.com

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

- 🐛 **Found a bug?** [Open an issue](https://github.com/JonasWeinert/PollUP/issues)
- 💡 **Have a feature request?** [Start a discussion](https://github.com/JonasWeinert/PollUP/discussions)
- 💬 **Questions?** Check the [documentation](./DEPLOYMENT.md) or ask in discussions

---

**Vibe coded with ❤️ for educators and presenters**
