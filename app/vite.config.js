import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Must match the actual URL path files are served from.
  // publish = "." means repo root, so app/dist/ is served at /app/dist/
  base: '/app/dist/',

  build: {
    outDir:     'dist',
    emptyOutDir: true,
  },
})
```

---

## Fix 2 — Your `netlify.toml` is correct as-is

Don't change it. Here's why it works:
```
Browser visits  →  yourdomain.com/app/
Netlify rewrites → serves /app/dist/index.html  (200 = invisible rewrite, URL stays /app/)
index.html loads → <script src="/app/dist/assets/index.js">
Browser fetches  → /app/dist/assets/index.js  ✓  (file exists at that path)
