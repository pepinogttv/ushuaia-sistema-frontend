<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
});

const { sourceUploadFile, sourceListFiles, sourceDeleteFile } =
  useExternalBackend();

// Archivos (se cargarán desde el backend)
const files = ref([]);
const loading = ref(false);
const error = ref(null);

// Referencia al componente de último log
const latestLogCard = ref(null);

const uploadDialog = ref(false);
const uploading = ref(false);

// Cargar archivos al montar el componente
const loadFiles = async () => {
  try {
    loading.value = true;
    error.value = null;
    const result = await sourceListFiles(props.source.name);

    // Transformar los archivos al formato esperado por el template
    files.value = result.files.map((file) => ({
      id: file.filename,
      name: file.filename,
      size: formatFileSize(file.size),
      uploadedAt: file.createdAt,
      modifiedAt: file.modifiedAt,
      path: file.path,
    }));
  } catch (err) {
    console.error("Error cargando archivos:", err);
    error.value = err.message || "Error al cargar los archivos";
  } finally {
    loading.value = false;
  }
};

const deleteFile = async (filename) => {
  try {
    await sourceDeleteFile(props.source.name, filename);
    await loadFiles();
  } catch (err) {
    console.error("Error eliminando archivo:", err);
    error.value = err.message || "Error al eliminar el archivo";
  }
};

// Cargar archivos al montar
onMounted(() => {
  loadFiles();
});

// Manejar archivos seleccionados desde el componente FileDropZone
const handleFilesSelected = async (selectedFiles) => {
  uploadDialog.value = true;
  uploading.value = true;

  try {
    // Subir cada archivo al backend
    for (const file of selectedFiles) {
      await sourceUploadFile(props.source.name, file);
    }

    // Recargar la lista de archivos
    await loadFiles();

    // Recargar el último log
    if (latestLogCard.value) {
      await latestLogCard.value.fetchLatestLog();
    }

    uploading.value = false;

    // Cerrar diálogo después de un momento
    setTimeout(() => {
      uploadDialog.value = false;
    }, 800);
  } catch (err) {
    console.error("Error subiendo archivos:", err);
    uploading.value = false;
    uploadDialog.value = false;
    error.value = err.message || "Error al subir los archivos";
  }
};

// Manejar errores del componente FileDropZone
const handleDropZoneError = (errorMessage) => {
  error.value = errorMessage;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>

<template>
  <div class="file-source-content">
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

    <!-- Drag and Drop Zone -->
    <FileDropZone
      :accept="['xlsx', 'xls', 'csv']"
      :multiple="false"
      accept-label=".xlsx, .xls, .csv"
      :disabled="uploading || loading"
      title="Arrastra y suelta archivos Excel aquí"
      button-text="Seleccionar Archivos"
      class="mb-6"
      @files-selected="handleFilesSelected"
      @error="handleDropZoneError"
    />

    <!-- Loading indicator -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-grey">Cargando archivos...</p>
    </div>

    <!-- Files list -->
    <v-list v-else bg-color="transparent" class="pa-0">
      <v-list-item
        v-for="file in files"
        :key="file.id"
        class="file-item px-4 py-3 mb-2"
        rounded="lg"
      >
        <template v-slot:prepend>
          <v-avatar color="blue-lighten-4" size="48">
            <v-icon icon="mdi-file-excel" color="blue-darken-2" />
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-medium mb-1">
          {{ file.name }}
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          {{ file.size }} • Subido el {{ formatDate(file.uploadedAt) }}
        </v-list-item-subtitle>

        <template v-slot:append>
          <!-- <v-btn
            icon="mdi-download"
            variant="text"
            size="small"
            color="primary"
          /> -->
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="deleteFile(file.id)"
          />
        </template>
      </v-list-item>

      <div
        v-if="files.length === 0 && !loading"
        class="text-center pa-8 text-grey"
      >
        No hay archivos disponibles
      </div>
    </v-list>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>
          {{ uploading ? "Subiendo archivos..." : "¡Archivo(s) subido(s)!" }}
        </v-card-title>
        <v-card-text class="text-center py-6">
          <v-progress-circular
            v-if="uploading"
            indeterminate
            color="primary"
            size="64"
          />
          <v-icon v-else icon="mdi-check-circle" color="success" size="64" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.file-source-content {
  padding: 0;
}

.file-item {
  background-color: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
}

.file-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateX(4px);
}
</style>
