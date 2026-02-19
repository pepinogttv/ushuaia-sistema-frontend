<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
});

const client = useSupabaseClient();
const { sourceUploadFile, sourceListFiles, sourceDeleteFile } =
  useExternalBackend();

// State
const files = ref([]);
const loading = ref(false);
const error = ref(null);
const uploading = ref(false);
const uploadDialog = ref(false);
const fingerprintConfig = ref(null);
const configLoading = ref(true);

// Load fingerprint config from DB
const loadConfig = async () => {
  try {
    configLoading.value = true;
    const { data, error: fetchError } = await client
      .from("provider_sources")
      .select("fingerprint_config")
      .eq("id", props.source.id)
      .single();

    if (fetchError) throw fetchError;
    fingerprintConfig.value = data?.fingerprint_config || null;
  } catch (err) {
    console.error("Error loading fingerprint config:", err);
  } finally {
    configLoading.value = false;
  }
};

// Load files from backend
const loadFiles = async () => {
  try {
    loading.value = true;
    error.value = null;
    const result = await sourceListFiles(props.source.name);

    files.value = result.files.map((file) => ({
      id: file.filename,
      name: file.filename,
      size: formatFileSize(file.size),
      uploadedAt: file.createdAt,
      modifiedAt: file.modifiedAt,
      path: file.path,
    }));
  } catch (err) {
    console.error("Error loading files:", err);
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
    error.value = err.message || "Error al eliminar el archivo";
  }
};

const handleFilesSelected = async (selectedFiles) => {
  uploadDialog.value = true;
  uploading.value = true;

  try {
    for (const file of selectedFiles) {
      await sourceUploadFile(props.source.name, file);
    }
    await loadFiles();
    uploading.value = false;
    setTimeout(() => {
      uploadDialog.value = false;
    }, 800);
  } catch (err) {
    uploading.value = false;
    uploadDialog.value = false;
    error.value = err.message || "Error al subir los archivos";
  }
};

const handleDropZoneError = (errorMessage) => {
  error.value = errorMessage;
};

onMounted(() => {
  loadConfig();
  loadFiles();
});

// Helpers
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

const FIELD_LABELS = {
  provider_product_id: "Codigo Producto",
  description: "Descripcion",
  price_usd: "Precio USD",
  price_ars: "Precio ARS",
  sales_unit: "Unidad de Venta",
  iva: "IVA",
};

const FIELD_COLORS = {
  provider_product_id: "blue",
  description: "teal",
  price_usd: "green",
  price_ars: "purple",
  sales_unit: "orange",
  iva: "red",
};

// Show/hide config details
const showConfig = ref(false);
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

    <!-- Fingerprint Config Summary -->
    <v-card
      v-if="fingerprintConfig && !configLoading"
      variant="tonal"
      color="secondary"
      class="mb-4"
    >
      <v-card-text class="pa-3">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-2">
            <v-icon>mdi-fingerprint</v-icon>
            <span class="font-weight-medium">Configuracion Fingerprint</span>
            <v-chip size="x-small" color="secondary" variant="flat">
              v{{ fingerprintConfig.version || 1 }}
            </v-chip>
            <v-chip size="x-small" variant="flat">
              {{ fingerprintConfig.product_fingerprints?.length || 0 }}
              patron(es) de producto
            </v-chip>
          </div>
          <v-btn
            :icon="showConfig ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            variant="text"
            size="small"
            @click="showConfig = !showConfig"
          />
        </div>

        <v-expand-transition>
          <div v-if="showConfig" class="mt-3">
            <div
              v-for="(pf, index) in fingerprintConfig.product_fingerprints"
              :key="index"
              class="mb-2"
            >
              <div class="text-body-2 font-weight-medium mb-1">
                Producto #{{ index + 1 }}
              </div>
              <div class="d-flex ga-1 flex-wrap">
                <v-chip
                  v-for="(colIndex, field) in pf.column_mapping"
                  :key="field"
                  size="small"
                  :color="FIELD_COLORS[field] || 'grey'"
                  variant="flat"
                >
                  Col {{ colIndex + 1 }} = {{ FIELD_LABELS[field] || field }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="fingerprintConfig.source_filename"
              class="text-caption text-medium-emphasis mt-2"
            >
              Configurado desde: {{ fingerprintConfig.source_filename }}
            </div>
          </div>
        </v-expand-transition>
      </v-card-text>
    </v-card>

    <!-- Drag and Drop Zone -->
    <FileDropZone
      :accept="['xlsx', 'xls']"
      :multiple="false"
      accept-label=".xlsx, .xls"
      :disabled="uploading || loading"
      title="Arrastra y suelta un archivo Excel para sincronizar"
      button-text="Seleccionar Archivo"
      class="mb-6"
      @files-selected="handleFilesSelected"
      @error="handleDropZoneError"
    />

    <!-- Loading -->
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
          {{ file.size }} - Subido el {{ formatDate(file.uploadedAt) }}
        </v-list-item-subtitle>

        <template v-slot:append>
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
        No hay archivos. Subi un Excel para iniciar la sincronizacion.
      </div>
    </v-list>

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>
          {{ uploading ? "Subiendo archivo..." : "Archivo subido!" }}
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
.file-item {
  background-color: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
}

.file-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateX(4px);
}
</style>
