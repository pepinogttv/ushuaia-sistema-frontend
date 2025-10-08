<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true
  }
})

// Tabs
const currentTab = ref('listas')

// Datos simulados de archivos
const files = ref([
  {
    id: 1,
    name: '22.09.2025 Lista Precios CORESA Septiembre.xlsx',
    size: '2.4 MB',
    uploadedAt: '2025-09-22',
    uploadedBy: 'Juan Pérez'
  },
  {
    id: 2,
    name: '27.08.2025 Lista Precios CORESA Agosto.xlsx',
    size: '2.1 MB',
    uploadedAt: '2025-08-27',
    uploadedBy: 'María González'
  },
  {
    id: 3,
    name: '15.07.2025 Lista Precios CORESA Julio.xlsx',
    size: '2.3 MB',
    uploadedAt: '2025-07-15',
    uploadedBy: 'Juan Pérez'
  }
])

// Datos simulados de logs
const logs = ref([
  {
    id: 1,
    action: 'Archivo subido',
    fileName: '22.09.2025 Lista Precios CORESA Septiembre.xlsx',
    user: 'Juan Pérez',
    timestamp: '2025-09-22T10:30:00'
  },
  {
    id: 2,
    action: 'Archivo eliminado',
    fileName: '01.08.2025 Lista Precios CORESA Agosto.xlsx',
    user: 'María González',
    timestamp: '2025-08-28T15:45:00'
  },
  {
    id: 3,
    action: 'Archivo descargado',
    fileName: '27.08.2025 Lista Precios CORESA Agosto.xlsx',
    user: 'Juan Pérez',
    timestamp: '2025-08-27T09:15:00'
  }
])

const fileInput = ref(null)
const uploadDialog = ref(false)
const deleteDialog = ref(false)
const fileToDelete = ref(null)
const uploading = ref(false)
const deleting = ref(false)

const openFileUpload = () => {
  fileInput.value.click()
}

const handleFileSelect = async (event) => {
  const selectedFiles = event.target.files
  if (!selectedFiles || selectedFiles.length === 0) return

  uploadDialog.value = true
  uploading.value = true

  // Simular subida
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Agregar archivos simulados
  for (const file of selectedFiles) {
    files.value.unshift({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: 'Usuario Actual'
    })
  }

  uploading.value = false
  
  // Cerrar diálogo después de un momento
  setTimeout(() => {
    uploadDialog.value = false
    fileInput.value.value = ''
  }, 800)
}

const confirmDelete = (file) => {
  fileToDelete.value = file
  deleteDialog.value = true
}

const deleteFile = async () => {
  if (!fileToDelete.value) return

  deleting.value = true

  // Simular eliminación
  await new Promise(resolve => setTimeout(resolve, 1000))

  files.value = files.value.filter(f => f.id !== fileToDelete.value.id)
  
  deleting.value = false
  deleteDialog.value = false
  fileToDelete.value = null
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

const formatDateTime = (dateTimeString) => {
  const date = new Date(dateTimeString)
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getLogIcon = (action) => {
  if (action.includes('subido')) return 'mdi-upload'
  if (action.includes('eliminado')) return 'mdi-delete'
  if (action.includes('descargado')) return 'mdi-download'
  return 'mdi-information'
}

const getLogColor = (action) => {
  if (action.includes('subido')) return 'success'
  if (action.includes('eliminado')) return 'error'
  if (action.includes('descargado')) return 'info'
  return 'grey'
}
</script>

<template>
  <div class="file-source-content">
    <!-- Tabs -->
    <v-tabs v-model="currentTab" bg-color="transparent" color="primary" class="mb-4">
      <v-tab value="listas">Listas Excel</v-tab>
      <v-tab value="logs">Logs</v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="currentTab">
      <!-- Listas Excel Tab -->
      <v-window-item value="listas">
        <div class="d-flex justify-end mb-4">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-upload"
            @click="openFileUpload"
            elevation="0"
          >
            Subir Archivo
          </v-btn>
        </div>

        <v-list bg-color="transparent" class="pa-0">
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
              {{ file.size }} • Subido el {{ formatDate(file.uploadedAt) }} por {{ file.uploadedBy }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-download"
                  variant="text"
                  size="small"
                  color="primary"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(file)"
                />
              </div>
            </template>
          </v-list-item>

          <div v-if="files.length === 0" class="text-center pa-8 text-grey">
            No hay archivos disponibles
          </div>
        </v-list>
      </v-window-item>

      <!-- Logs Tab -->
      <v-window-item value="logs">
        <v-list bg-color="transparent" class="pa-0">
          <v-list-item
            v-for="log in logs"
            :key="log.id"
            class="log-item px-4 py-3 mb-2"
            rounded="lg"
          >
            <template v-slot:prepend>
              <v-avatar :color="getLogColor(log.action)" variant="tonal" size="40">
                <v-icon :icon="getLogIcon(log.action)" size="20" />
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium mb-1">
              {{ log.action }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ log.fileName }}
            </v-list-item-subtitle>
            <v-list-item-subtitle class="text-caption mt-1">
              {{ formatDateTime(log.timestamp) }} • {{ log.user }}
            </v-list-item-subtitle>
          </v-list-item>

          <div v-if="logs.length === 0" class="text-center pa-8 text-grey">
            No hay registros de actividad
          </div>
        </v-list>
      </v-window-item>
    </v-window>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".xlsx,.xls,.csv"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- Upload Dialog -->
    <v-dialog v-model="uploadDialog" max-width="400" persistent>
      <v-card>
        <v-card-title>
          {{ uploading ? 'Subiendo archivos...' : '¡Archivo(s) subido(s)!' }}
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

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Confirmar eliminación
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de que deseas eliminar el archivo 
          <strong>{{ fileToDelete?.name }}</strong>?
          Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
            :disabled="deleting"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="deleteFile"
            :loading="deleting"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
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

.log-item {
  background-color: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
}

.log-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.03);
}
</style>

