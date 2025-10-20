<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
});

const { executeSource } = useExternalBackend();

// Tabs
const currentTab = ref("sincronizacion");

// Estado de ejecución
const executing = ref(false);
const executionResult = ref(null);
const error = ref(null);

// Referencia al componente de último log
const latestLogCard = ref(null);

// Ejecutar source
const handleExecute = async () => {
  try {
    executing.value = true;
    error.value = null;
    executionResult.value = null;

    const result = await executeSource(props.source.name);
    executionResult.value = result;

    // Recargar el último log después de ejecutar
    if (latestLogCard.value) {
      await latestLogCard.value.fetchLatestLog();
    }
  } catch (err) {
    console.error("Error ejecutando source:", err);
    error.value = err.message || "Error al ejecutar el source";
  } finally {
    executing.value = false;
  }
};
</script>

<template>
  <div class="web-scraper-source-content">
    <!-- Latest Log Card -->
    <!-- <LatestSourceLogCard ref="latestLogCard" :source="source" /> -->

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
    <v-tabs
      v-model="currentTab"
      bg-color="transparent"
      color="primary"
      class="mb-4"
    >
      <v-tab value="sincronizacion">
        <v-icon icon="mdi-sync" class="mr-2" />
        Sincronización
      </v-tab>
      <v-tab value="historial">
        <v-icon icon="mdi-history" class="mr-2" />
        Historial
      </v-tab>
      <!-- <v-tab value="configuracion">
        <v-icon icon="mdi-cog" class="mr-2" />
        Configuración
      </v-tab> -->
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="currentTab">
      <!-- Sincronización Tab -->
      <v-window-item value="sincronizacion">
        <slot name="sincronizacion"> </slot>
      </v-window-item>

      <!-- Historial Tab -->
      <v-window-item value="historial">
        <ProviderSourceLogs :source="source" />
      </v-window-item>

      <!-- Configuración Tab -->
      <!-- <v-window-item value="configuracion">
        <v-card variant="outlined">
          <v-card-title class="text-h6">
            <v-icon icon="mdi-cog" class="mr-2" color="primary" />
            Configuración
          </v-card-title>
          <v-card-text>
            <p class="text-grey">Configuración del Web Scraper Source.</p>
            Aquí se puede agregar el contenido de configuración específico
          </v-card-text>
        </v-card>
      </v-window-item> -->
    </v-window>
  </div>
</template>

<style scoped>
.web-scraper-source-content {
  padding: 0;
}
</style>
