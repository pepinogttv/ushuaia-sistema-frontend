<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true
  }
})

const { deleteProviderSourceLog } = useExternalBackend()
const supabase = useSupabaseClient()

// Último log
const latestLog = ref(null)
const undoing = ref(false)
const undoDialog = ref(false)
const error = ref(null)

// Buscar el último log
const fetchLatestLog = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from('provider_source_logs')
      .select('*')
      .eq('provider_source_id', props.source.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (fetchError) {
      console.error('Error fetching latest log:', fetchError)
    } else {
      latestLog.value = data
    }
  } catch (err) {
    console.error('Error fetching latest log:', err)
  }
}

// Abrir diálogo de confirmación
const openUndoDialog = () => {
  undoDialog.value = true
}

// Deshacer sincronización
const handleUndoExecution = async () => {
  try {
    undoing.value = true
    error.value = null
    undoDialog.value = false
    
    await deleteProviderSourceLog(latestLog.value.id)
    
    // Actualizar el último log
    await fetchLatestLog()
  } catch (err) {
    console.error('Error deshaciendo sincronización:', err)
    error.value = err.message || 'Error al deshacer la sincronización'
  } finally {
    undoing.value = false
  }
}

// Obtener el mensaje según el estado
const getStatusMessage = (status) => {
  const messages = {
    pending: 'Sincronización en curso',
    success: 'Sincronización Exitosa',
    error: 'Fallo la sincronización'
  }
  return messages[status] || 'Estado desconocido'
}

// Obtener el icono según el estado
const getStatusIcon = (status) => {
  const icons = {
    pending: 'mdi-clock-outline',
    success: 'mdi-check-circle-outline',
    error: 'mdi-alert-circle-outline'
  }
  return icons[status] || 'mdi-information-outline'
}

// Verificar si el source es de tipo file-source
const isFileSource = computed(() => {
  return props.source.type === 'file-source'
})

// Buscar el último log al montar el componente
onMounted(() => {
  fetchLatestLog()
})

// Exponer la función para que los componentes padres puedan recargar el log
defineExpose({
  fetchLatestLog
})
</script>

<template>
  <div>
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

    <!-- Latest Log Card -->
    <v-card
      v-if="latestLog"
      :color="latestLog.status === 'success' ? 'success' : latestLog.status === 'error' ? 'error' : 'info'"
      variant="tonal"
      class="mb-4 latest-log-card"
    >
      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center">
            <v-avatar 
              :color="latestLog.status === 'success' ? 'success' : latestLog.status === 'error' ? 'error' : 'info'"
              size="48"
              class="mr-3"
            >
              <v-icon :icon="getStatusIcon(latestLog.status)" size="28" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ getStatusMessage(latestLog.status) }} ({{ latestLog.id }})</div>
              <div class="text-caption opacity-80">Última sincronización</div>
            </div>
          </div>
          <v-btn
            color="warning"
            variant="flat"
            size="small"
            :loading="undoing"
            :disabled="undoing || latestLog.status === 'pending'"
            @click="openUndoDialog"
            prepend-icon="mdi-undo"
          >
            Deshacer
          </v-btn>
        </div>

        <v-divider class="mb-3" />

        <!-- Source filename para file-source -->
        <div v-if="isFileSource && latestLog.source_filename" class="mb-3">
          <v-chip
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-excel"
            size="small"
          >
            {{ latestLog.source_filename }}
          </v-chip>
        </div>

        <div class="time-info-grid">
          <div class="time-info-item">
            <div class="d-flex align-center mb-1">
              <v-icon icon="mdi-clock-start" size="20" class="mr-2" />
              <span class="text-body-2 font-weight-medium">Inicio</span>
            </div>
            <div class="text-h6 font-weight-bold">
              {{ new Date(latestLog.started_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
            </div>
            <div class="text-caption opacity-70">
              {{ new Date(latestLog.started_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </div>
          </div>

          <div v-if="latestLog.finished_at" class="time-info-item">
            <div class="d-flex align-center mb-1">
              <v-icon icon="mdi-clock-end" size="20" class="mr-2" />
              <span class="text-body-2 font-weight-medium">Fin</span>
            </div>
            <div class="text-h6 font-weight-bold">
              {{ new Date(latestLog.finished_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
            </div>
            <div class="text-caption opacity-70">
              {{ new Date(latestLog.finished_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </div>
          </div>

          <div v-else class="time-info-item">
            <div class="d-flex align-center mb-1">
              <v-icon icon="mdi-clock-end" size="20" class="mr-2" />
              <span class="text-body-2 font-weight-medium">Fin</span>
            </div>
            <div class="text-h6 font-weight-bold opacity-50">
              En proceso...
            </div>
            <div class="text-caption opacity-70">
              <v-progress-circular indeterminate size="16" width="2" class="mr-1" />
              Ejecutando
            </div>
          </div>

          <div v-if="latestLog.finished_at" class="time-info-item">
            <div class="d-flex align-center mb-1">
              <v-icon icon="mdi-timer-outline" size="20" class="mr-2" />
              <span class="text-body-2 font-weight-medium">Duración</span>
            </div>
            <div class="text-h6 font-weight-bold">
              {{ Math.round((new Date(latestLog.finished_at) - new Date(latestLog.started_at)) / 1000) }}s
            </div>
            <div class="text-caption opacity-70">
              {{ (Math.round((new Date(latestLog.finished_at) - new Date(latestLog.started_at)) / 100) / 10).toFixed(1) }} segundos
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Diálogo de confirmación -->
    <v-dialog v-model="undoDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Confirmar deshacer sincronización
        </v-card-title>
        <v-card-text>
          <p class="mb-2">
            ¿Estás seguro que quieres deshacer la sincronización? Esto implica que todos los cambios hechos por la misma se revertirán.
          </p>
          
          <!-- Advertencia adicional para file-source -->
          <v-alert
            v-if="isFileSource && latestLog?.source_filename"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            <div class="text-body-2">
              <strong>Se eliminará el archivo:</strong><br>
              {{ latestLog.source_filename }}
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="undoDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            @click="handleUndoExecution"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.latest-log-card {
  border-radius: 12px;
}

.time-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.time-info-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.opacity-80 {
  opacity: 0.8;
}

.opacity-70 {
  opacity: 0.7;
}

.opacity-50 {
  opacity: 0.5;
}
</style>

