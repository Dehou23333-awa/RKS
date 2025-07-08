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
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      meta: [
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#667eea' }
      ]
    }
  }
})
