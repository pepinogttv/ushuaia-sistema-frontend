<script setup>
const props = defineProps({
  jobId: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(["job-failed"]);

const { getRollbackJobStatus } = useExternalBackend();

const jobState = ref(null);
const progressMessage = ref(null);
let pollInterval = null;

const stateLabel = computed(() => {
  switch (jobState.value) {
    case "waiting":
      return "En cola, esperando worker...";
    case "active":
      return progressMessage.value || "Procesando...";
    case "completed":
      return "Completado";
    case "delayed":
      return "En espera...";
    default:
      return "Iniciando rollback...";
  }
});

const poll = async () => {
  try {
    const result = await getRollbackJobStatus(props.jobId);

    if (!result.found) {
      // Job completado y eliminado de Redis — Realtime se encarga del cleanup
      stopPolling();
      return;
    }

    jobState.value = result.state;
    progressMessage.value = result.progress?.message || null;

    if (result.state === "failed") {
      stopPolling();
      emit("job-failed", result.failedReason || "Error desconocido en el worker");
    } else if (result.state === "completed") {
      stopPolling();
    }
  } catch (err) {
    console.error("Error consultando estado del job de rollback:", err);
  }
};

const stopPolling = () => {
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

onMounted(() => {
  poll();
  pollInterval = setInterval(poll, 3000);
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <v-alert type="info" variant="tonal" prepend-icon="mdi-undo-variant">
    <div class="d-flex align-center">
      <v-progress-circular
        indeterminate
        size="16"
        width="2"
        class="mr-3 flex-shrink-0"
      />
      <span>{{ stateLabel }}</span>
    </div>
  </v-alert>
</template>
