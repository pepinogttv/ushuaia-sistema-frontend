<script setup>
const client = useSupabaseClient()

const providers = ref([])
const pending = ref(true)
const error = ref(null)
const drawer = ref(true)

const fetchProviders = async () => {
  try {
    pending.value = true
    error.value = null
    
    const { data, error: fetchError } = await client
      .from("providers")
      .select("id, name")
      .order("name", { ascending: true })
    
    if (fetchError) {
      throw fetchError
    }
    
    providers.value = data || []
  } catch (err) {
    error.value = err
    providers.value = []
  } finally {
    pending.value = false
  }
}

const handleProviderClick = (provider) => {
  navigateTo(`/providers/${provider.name}?id=${provider.id}`)
}

onMounted(() => {
  fetchProviders()
})
</script>

<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      permanent
      :width="320"
      class="drawer-custom"
    >
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-content">
          <v-icon size="40" color="white" class="header-icon">mdi-store</v-icon>
          <h2 class="header-title">Proveedores</h2>
        </div>
      </div>

      <div class="providers-container">
        <!-- Loading -->
        <div v-if="pending" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" width="4" />
          <p class="text-grey-darken-1 mt-4">Cargando...</p>
        </div>

        <!-- Error -->
        <v-alert v-else-if="error" type="error" class="ma-4" prominent>
          <strong>Error</strong>
          <div>{{ error.message }}</div>
        </v-alert>

        <!-- Empty -->
        <div v-else-if="providers.length === 0" class="empty-state">
          <v-icon size="64" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
          <p class="text-grey-darken-1 mt-4">No hay proveedores</p>
        </div>

        <!-- Providers List -->
        <div v-else class="providers-list">
          <v-card
            v-for="provider in providers"
            :key="provider.id"
            class="provider-card"
            @click="handleProviderClick(provider)"
            elevation="0"
          >
            <div class="provider-card-inner">
              <div class="provider-icon-wrapper">
                <v-icon size="32" color="white">mdi-package-variant</v-icon>
              </div>
              <div class="provider-info">
                <h3 class="provider-name">{{ provider.name }}</h3>
                <p class="provider-subtitle">Ver detalles</p>
              </div>
              <v-icon class="provider-arrow" size="24" color="primary">
                mdi-chevron-right
              </v-icon>
            </div>
          </v-card>
        </div>
      </div>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.drawer-custom {
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
}

.drawer-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  background: rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.header-title {
  color: white;
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.providers-container {
  padding: 20px 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  cursor: pointer;
  border-radius: 16px !important;
  border: 2px solid transparent;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.provider-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2) !important;
  border-color: #667eea;
}

.provider-card:active {
  transform: translateY(-2px);
}

.provider-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
}

.provider-icon-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: transform 0.3s ease;
}

.provider-card:hover .provider-icon-wrapper {
  transform: rotate(5deg) scale(1.05);
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-subtitle {
  font-size: 13px;
  color: #7f8c8d;
  margin: 0;
  font-weight: 500;
}

.provider-arrow {
  flex-shrink: 0;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.provider-card:hover .provider-arrow {
  opacity: 1;
  transform: translateX(4px);
}

/* Scrollbar personalizado */
.v-navigation-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.v-navigation-drawer :deep(.v-navigation-drawer__content)::-webkit-scrollbar {
  width: 6px;
}

.v-navigation-drawer :deep(.v-navigation-drawer__content)::-webkit-scrollbar-track {
  background: transparent;
}

.v-navigation-drawer :deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 3px;
}

.v-navigation-drawer :deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}
</style>

