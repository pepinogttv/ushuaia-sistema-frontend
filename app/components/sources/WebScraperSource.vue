<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true
  }
})

const { executeSource } = useExternalBackend()

// Tabs
const currentTab = ref('sincronizacion')

// Estado de ejecución
const executing = ref(false)
const executionResult = ref(null)
const error = ref(null)

// Referencia al componente de último log
const latestLogCard = ref(null)

// Ejecutar source
const handleExecute = async () => {
  try {
    executing.value = true
    error.value = null
    executionResult.value = null
    
    const result = await executeSource(props.source.name)
    executionResult.value = result
    
    // Recargar el último log después de ejecutar
    if (latestLogCard.value) {
      await latestLogCard.value.fetchLatestLog()
    }
  } catch (err) {
    console.error('Error ejecutando source:', err)
    error.value = err.message || 'Error al ejecutar el source'
  } finally {
    executing.value = false
  }
}
</script>

<template>
  <div class="web-scraper-source-content">
    <!-- Latest Log Card -->
    <LatestSourceLogCard ref="latestLogCard" :source="source" />

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      @click:close="error = null"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <!-- Success Alert -->
    <v-alert
      v-if="executionResult"
      type="success"
      variant="tonal"
      closable
      @click:close="executionResult = null"
      class="mb-4"
    >
      Sincronización iniciada exitosamente
    </v-alert>

    <!-- Tabs -->
    <v-tabs v-model="currentTab" bg-color="transparent" color="primary" class="mb-4">
      <v-tab value="sincronizacion">Sincronización</v-tab>
      <v-tab value="logs">Historial</v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="currentTab">
      <!-- Sincronización Tab -->
      <v-window-item value="sincronizacion">

        <v-card variant="outlined">
          <v-card-title class="text-h6">
            <v-icon icon="mdi-play-circle" class="mr-2" color="primary" />
            Sincronizar
          </v-card-title>
          <v-card-text>
            <p class="mb-4 text-grey">
              Comienza la sincronización para obtener y actualizar los datos desde la web.
            </p>
            
            <v-btn
              color="primary"
              size="large"
              prepend-icon="mdi-play"
              :loading="executing"
              :disabled="executing"
              @click="handleExecute"
              block
            >
              {{ executing ? 'Comenzando sincronización...' : 'Comenzar sincronización' }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Logs Tab -->
      <v-window-item value="logs">
        <ProviderSourceLogs :source="source" v-if="currentTab === 'logs'" />
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
.web-scraper-source-content {
  padding: 0;
}
</style>

