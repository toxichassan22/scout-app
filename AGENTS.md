# Project: Scout Festival App

## Deployment (CRITICAL)
- **ALWAYS** `git push origin main` after EVERY code change — the server auto-pulls from GitHub
- After push, run `npm run build` in `D:\app scout` to build the dist folder
- **Tell the user "تم الرفع" after every push** — do not wait for them to ask

### Remote Details
- GitHub repo: https://github.com/toxichassan22/scout-app.git (main branch)
- Server: Tencent Cloud Ubuntu + Nginx 1.18.0 + PM2 + SQLite via Prisma ORM
- **Frontend**: Build output → `dist/` served by Nginx
- **Backend**: PM2 runs `server/src/index.js`
