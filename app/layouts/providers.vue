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
      :width="280"
    >
      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="mdi-store"
          title="Proveedores"
          class="text-h6 font-weight-bold mb-2"
        />
        
        <v-divider class="mb-2" />

        <!-- Loading -->
        <div v-if="pending" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" size="32" />
        </div>

        <!-- Error -->
        <v-alert v-else-if="error" type="error" density="compact" class="ma-2">
          {{ error.message }}
        </v-alert>

        <!-- Empty -->
        <v-list-item v-else-if="providers.length === 0" disabled>
          <v-list-item-title class="text-grey">
            No hay proveedores
          </v-list-item-title>
        </v-list-item>

        <!-- Providers List -->
        <v-list-item
          v-else
          v-for="provider in providers"
          :key="provider.id"
          :value="provider.name"
          :title="provider.name"
          prepend-icon="mdi-package-variant"
          @click="handleProviderClick(provider)"
          rounded="xl"
          class="mb-1"
        />
      </v-list>
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
.v-list-item {
  cursor: pointer;
}
</style>

