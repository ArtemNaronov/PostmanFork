import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** В GitHub Actions задано GITHUB_REPOSITORY=owner/repo → base /repo/ для GitHub Pages. */
/** Electron (file://): относительные пути к ассетам. */
function resolveBase(): string {
  if (process.env.TAURI_ENV_PLATFORM) return '/'
  if (process.env.ELECTRON_BUILD === 'true') return './'
  const repo = process.env.GITHUB_REPOSITORY
  if (repo?.includes('/')) {
    const name = repo.split('/')[1]
    if (name) return `/${name}/`
  }
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
})
