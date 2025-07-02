import { getGitInfo } from './utils/git-info.js'
const gitInfo = getGitInfo()

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [],
  nitro: {
    preset: 'cloudflare-module',
    cloudflare: {
      wrangler: {
        name: 'dehou23333-awa-rks'
      }
    }
  },
  runtimeConfig: {
    public: {
      gitCommit: gitInfo.hash,
      gitDate: gitInfo.date,
      gitBranch: gitInfo.branch,
      buildTime: new Date().toISOString()
    }
  }
})
