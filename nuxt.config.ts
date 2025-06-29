export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [],
  nitro: {
    output: {
      name: 'rks',
    },
    preset: 'cloudflare-module',
  },
})
