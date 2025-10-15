<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
});

const client = useSupabaseClient();
const selectedSourceLog = ref(null);
const sourceExecutionLogsDialog = ref(false);

// Estados
const logs = ref([]);
const loading = ref(false);
const error = ref(null);

// Cargar logs desde Supabase
const loadLogs = async () => {
  try {
    loading.value = true;
    error.value = null;

    const { data, error: fetchError } = await client
      .from("provider_source_logs")
      .select(
        "id, started_at, finished_at, status, source_filename, error_message, friendly_message"
      )
      .eq("provider_source_id", props.source.id)
      .order("started_at", { ascending: false });

    if (fetchError) throw fetchError;

    logs.value = data || [];
  } catch (err) {
    console.error("Error cargando logs:", err);
    error.value = err.message || "Error al cargar los logs";
  } finally {
    loading.value = false;
  }
};

// Formatear fecha y hora
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return "-";
  const date = new Date(dateTimeString);
  return date.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Obtener color según el estado
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "success":
    case "completed":
      return "success";
    case "error":
    case "failed":
      return "error";
    case "running":
    case "in_progress":
      return "info";
    case "pending":
      return "warning";
    default:
      return "grey";
  }
};

const clickSourceLog = (log) => {
  selectedSourceLog.value = log;
  sourceExecutionLogsDialog.value = true;
};

// Cargar logs al montar el componente
onMounted(() => {
  loadLogs();
});
</script>

<template>
  <div class="logs-viewer">
    <!-- Header con botón de recarga -->
    <div class="d-flex justify-space-between align-center mb-4">
      <h3 class="text-h6">Historial de Actividad</h3>
      <v-btn
        @click="loadLogs"
        :loading="loading"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-refresh"
        size="small"
      >
        Recargar
      </v-btn>
    </div>

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

    <SourceExecutionLogsDialog
      v-if="selectedSourceLog"
      v-model="sourceExecutionLogsDialog"
      :source="source"
      :source-log="selectedSourceLog"
    />

    <!-- Loading indicator -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-grey">Cargando logs...</p>
    </div>

    <!-- Logs list -->
    <v-list v-else bg-color="transparent" class="pa-0">
      <v-list-item
        v-for="log in logs"
        :key="log.id"
        class="log-item px-4 py-3 mb-2"
        rounded="lg"
      >
        <template v-slot:prepend>
          <v-avatar
            :color="getStatusColor(log.status)"
            variant="tonal"
            size="40"
          >
            <v-icon
              :icon="
                log.status === 'success' || log.status === 'completed'
                  ? 'mdi-check-circle'
                  : log.status === 'error' || log.status === 'failed'
                  ? 'mdi-alert-circle'
                  : 'mdi-information'
              "
              size="20"
            />
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-medium mb-1">
          <v-chip
            :color="getStatusColor(log.status)"
            size="small"
            variant="tonal"
            class="mr-2"
          >
            {{ log.status || "unknown" }}
          </v-chip>
          {{ log.source_filename || "Sin nombre de archivo" }}
        </v-list-item-title>

        <v-list-item-subtitle class="text-caption mt-1">
          <div class="d-flex flex-column gap-1">
            <div>
              <strong>Inicio:</strong> {{ formatDateTime(log.started_at) }}
            </div>
            <div v-if="log.finished_at">
              <strong>Fin:</strong> {{ formatDateTime(log.finished_at) }}
            </div>
            <div v-if="log.friendly_message" class="text-medium-emphasis">
              <strong>Mensaje:</strong> {{ log.friendly_message }}
            </div>
            <div v-if="log.error_message" class="text-error">
              <strong>Error:</strong> {{ log.error_message }}
            </div>
            <div>
              <NewestSourceExecutionLog :source-log="log" />
            </div>
          </div>
        </v-list-item-subtitle>

        <template v-slot:append>
          <v-btn
            @click="clickSourceLog(log)"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-eye"
          >
            detalle
          </v-btn>
        </template>
      </v-list-item>

      <div
        v-if="logs.length === 0 && !loading"
        class="text-center pa-8 text-grey"
      >
        No hay registros de actividad
      </div>
    </v-list>
  </div>
</template>

<style scoped>
.logs-viewer {
  width: 100%;
}

.log-item {
  background-color: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
}

.log-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.03);
}
</style>
