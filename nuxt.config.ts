// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/icon',
    'vuetify-nuxt-module',
    '@nuxtjs/supabase'
  ],
  runtimeConfig: {
    public: {
      externalBackendUrl: process.env.EXTERNAL_BACKEND_URL,
    }
  }
})