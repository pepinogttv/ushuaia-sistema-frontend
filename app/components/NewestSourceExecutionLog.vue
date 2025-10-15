<script setup>
const props = defineProps({
  sourceLog: {
    type: Object,
    required: true,
  },
});

const client = useSupabaseClient();
const newestLog = ref(null);

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

// Cargar el log más nuevo (para success o error)
const loadNewestLog = async () => {
  if (
    !props.sourceLog?.status ||
    (props.sourceLog.status !== "success" && props.sourceLog.status !== "error")
  ) {
    return;
  }

  try {
    const { data, error: fetchError } = await client
      .from("source_execution_logs")
      .select("id, message, timestamp")
      .eq("provider_source_log_id", props.sourceLog.id)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error cargando log más reciente:", fetchError);
      return;
    }

    newestLog.value = data;
  } catch (err) {
    console.error("Error cargando log más reciente:", err);
  }
};

// Cargar logs al montar el componente
onMounted(() => {
  loadNewestLog();
});

// Recargar cuando cambie el estado
watch(
  () => props.sourceLog?.status,
  () => {
    loadNewestLog();
  }
);
</script>

<template>
  <!-- Mostrar "Procesando..." para pending -->
  <div v-if="sourceLog?.status === 'pending'" class="pending-indicator">
    <div class="text-caption text-medium-emphasis d-flex align-center gap-2">
      <v-progress-circular
        indeterminate
        size="16"
        width="2"
        color="primary"
      />
      <span>Procesando...</span>
    </div>
  </div>

  <!-- Mostrar log más reciente para success/error -->
  <div v-else-if="newestLog" class="newest-log">
    <div class="text-caption text-medium-emphasis">
      <strong>Último log:</strong> {{ newestLog.message }}
      <span v-if="newestLog.timestamp" class="ml-2">
        ({{ formatDateTime(newestLog.timestamp) }})
      </span>
    </div>
  </div>
</template>

<style scoped>
.newest-log {
  padding: 4px 0;
}

.pending-indicator {
  padding: 4px 0;
  margin-top: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>
