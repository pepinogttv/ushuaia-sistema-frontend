<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  },
  sourceLog: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const supabase = useSupabaseClient();
const page = ref(1);
const pageSize = 100;
const totalCount = ref(0);

const { data, status, error, refresh, clear } = useAsyncData(
  async () => {
    const from = (page.value - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Get total count
    const { count } = await supabase
      .from("source_execution_logs")
      .select("*", { count: 'exact', head: true })
      .eq("provider_source_log_id", props.sourceLog.id);
    
    totalCount.value = count || 0;
    
    // Get paginated data
    const { data, error } = await supabase
      .from("source_execution_logs")
      .select("*")
      .eq("provider_source_log_id", props.sourceLog.id)
      .order("id", { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return data;
  },
  { server: false, watch: [() => props.sourceLog?.id, page] }
);

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));
const hasNextPage = computed(() => page.value < totalPages.value);
const hasPrevPage = computed(() => page.value > 1);

const goToNextPage = () => {
  if (hasNextPage.value) {
    page.value++;
  }
};

const goToPrevPage = () => {
  if (hasPrevPage.value) {
    page.value--;
  }
};

// Reset page when dialog opens or source log changes
watch(() => props.sourceLog?.id, () => {
  page.value = 1;
});
</script>

<template>
  <v-dialog v-model="isOpen" max-width="900">
    <v-card class="d-flex flex-column" style="height: 80vh;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <span>Logs de Ejecución</span>
        <v-btn icon="mdi-close" variant="text" @click="isOpen = false" />
      </v-card-title>
      
      <v-card-text class="flex-grow-1 overflow-y-auto" style="padding-bottom: 80px;">
        <div v-if="status === 'pending'" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        
        <v-alert v-else-if="error" type="error" variant="tonal">
          {{ error }}
        </v-alert>
        
        <div v-else-if="!data || data.length === 0" class="text-center pa-4 text-grey">
          No hay logs de ejecución
        </div>
        
        <v-timeline v-else density="compact" side="end">
          <v-timeline-item
            v-for="log in data"
            :key="log.id"
            :dot-color="log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info'"
            size="small"
          >
            <div>
              <div class="d-flex align-center gap-2 mb-1">
                <v-chip :color="log.level === 'error' ? 'error' : log.level === 'warn' ? 'orange' : 'info'" 
                class="mr-2"
                        size="x-small">
                  {{ log.level === 'error' ? 'Error' : log.level === 'warn' ? 'Advertencia' : 'Info' }}
                </v-chip>
                <v-chip color="grey-lighten-1" 
                        size="x-small"
                        variant="outlined">
                  {{ new Date(log.timestamp).toLocaleString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false
                  }) }}
                </v-chip>
              </div>
              <div class="text-body-2 mb-2">{{ log.message }}</div>
              
              <!-- Mostrar fila si existe en metadata -->
              <div v-if="log.metadata?.row && Array.isArray(log.metadata.row)" 
                   class="mt-2">
                <div class="text-caption text-grey-darken-1 mb-1">Fila:</div>
                <table class="row-table">
                  <thead>
                    <tr>
                      <th v-for="(value, index) in log.metadata.row" :key="index">
                        {{ index }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="(value, index) in log.metadata.row" :key="index">
                        {{ value }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
      
      <v-divider v-if="data && data.length > 0" />
      
      <v-card-actions 
        v-if="data && data.length > 0" 
        class="justify-space-between flex-shrink-0 bg-white" 
        style="position: sticky; bottom: 0; z-index: 10;"
      >
        <div class="text-caption text-grey">
          Mostrando {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, totalCount) }} de {{ totalCount }} logs
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn
            :disabled="!hasPrevPage"
            icon="mdi-chevron-left"
            size="small"
            variant="text"
            @click="goToPrevPage"
          />
          <div class="text-caption">
            Página {{ page }} de {{ totalPages }}
          </div>
          <v-btn
            :disabled="!hasNextPage"
            icon="mdi-chevron-right"
            size="small"
            variant="text"
            @click="goToNextPage"
          />
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.row-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.row-table thead {
  background-color: #e0e0e0;
}

.row-table th,
.row-table td {
  padding: 4px 8px;
  border: 1px solid #bdbdbd;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  vertical-align: top;
}

.row-table th {
  font-weight: 600;
  color: #616161;
}

.row-table td {
  color: #424242;
}
</style>
