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

const { data, status, error, refresh, clear } = useAsyncData(
  async () => {
    const { data, error } = await supabase
      .from("source_execution_logs")
      .select("*")
      .eq("provider_source_log_id", props.sourceLog.id)
      .order("id", { ascending: false })
    
    if (error) throw error;
    return data;
  },
  { server: false, watch: [() => props.sourceLog?.id] }
);
</script>

<template>
  <v-dialog v-model="isOpen" max-width="900">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Logs de Ejecución</span>
        <v-btn icon="mdi-close" variant="text" @click="isOpen = false" />
      </v-card-title>
      
      <v-card-text>
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
              <div class="text-body-2">{{ log.message }}</div>
            </div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
