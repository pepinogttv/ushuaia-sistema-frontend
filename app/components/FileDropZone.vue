<script setup>
const props = defineProps({
  accept: {
    type: Array,
    default: () => ['xlsx', 'xls', 'csv']
  },
  acceptLabel: {
    type: String,
    default: '.xlsx, .xls, .csv'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Arrastra y suelta archivos aquí'
  },
  subtitle: {
    type: String,
    default: null
  },
  buttonText: {
    type: String,
    default: 'Seleccionar Archivos'
  }
})

const emit = defineEmits(['files-selected', 'error'])

const fileInput = ref(null)
const isDragging = ref(false)

// Drag and drop handlers
const handleDragEnter = (e) => {
  if (props.disabled) return
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

const handleDragOver = (e) => {
  if (props.disabled) return
  e.preventDefault()
  e.stopPropagation()
}

const handleDragLeave = (e) => {
  if (props.disabled) return
  e.preventDefault()
  e.stopPropagation()
  // Solo cambiar isDragging si salimos completamente del área
  if (e.target.classList.contains('drop-zone')) {
    isDragging.value = false
  }
}

const handleDrop = async (e) => {
  if (props.disabled) return
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const droppedFiles = e.dataTransfer.files
  if (!droppedFiles || droppedFiles.length === 0) return

  processFiles(Array.from(droppedFiles))
}

const openFileSelector = () => {
  if (props.disabled) return
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const selectedFiles = event.target.files
  if (!selectedFiles || selectedFiles.length === 0) return

  processFiles(Array.from(selectedFiles))
  
  // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
  event.target.value = ''
}

const processFiles = (filesList) => {
  // Validar extensiones de archivos
  const validFiles = filesList.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase()
    return props.accept.includes(ext)
  })

  if (validFiles.length === 0) {
    emit('error', `Por favor, solo archivos ${props.acceptLabel}`)
    return
  }

  if (!props.multiple && validFiles.length > 1) {
    emit('error', 'Solo puedes seleccionar un archivo')
    return
  }

  emit('files-selected', validFiles)
}

const computedSubtitle = computed(() => {
  return props.subtitle || `o haz clic para seleccionar archivos (${props.acceptLabel})`
})
</script>

<template>
  <div 
    class="drop-zone"
    :class="{ 
      'drop-zone-active': isDragging,
      'drop-zone-disabled': disabled 
    }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFileSelector"
  >
    <v-icon 
      :icon="isDragging ? 'mdi-file-download' : 'mdi-cloud-upload'" 
      size="64" 
      :color="disabled ? 'grey-lighten-2' : isDragging ? 'primary' : 'grey-lighten-1'"
      class="mb-4"
    />
    
    <h3 class="text-h6 mb-2" :class="isDragging ? 'text-primary' : 'text-grey'">
      {{ isDragging ? '¡Suelta los archivos aquí!' : title }}
    </h3>
    
    <p class="text-caption text-grey">
      {{ computedSubtitle }}
    </p>
    
    <v-btn 
      color="primary" 
      variant="outlined"
      prepend-icon="mdi-upload"
      class="mt-4"
      :disabled="disabled"
      @click.stop="openFileSelector"
    >
      {{ buttonText }}
    </v-btn>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      :accept="accept.map(ext => `.${ext}`).join(',')"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(var(--v-theme-surface), 0.5);
}

.drop-zone:hover:not(.drop-zone-disabled) {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background-color: rgba(var(--v-theme-primary), 0.02);
}

.drop-zone-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.drop-zone-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>

