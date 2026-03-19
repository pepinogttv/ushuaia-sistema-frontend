<script setup>
const client = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const { updateSourcePriority, deleteSource } = useExternalBackend();

const providerName = computed(() => route.params.name);
const providerId = computed(() => route.query.id);

const providerSources = ref([]);
const pending = ref(true);
const error = ref(null);
const prioritySaving = ref(false);

// Main tab synced with URL
const mainTab = ref(route.query.tab || "fuentes");

watch(mainTab, (tab) => {
  router.replace({ query: { ...route.query, tab } });
});

// Selected source
const selectedSource = ref(null);

// Provider config dialog
const showConfigDialog = ref(false);
 
// Add source dialog
const showAddSourceDialog = ref(false);

// Delete source
const deleteSourceDialog = ref(false);
const sourceToDelete = ref(null);
const deletingSource = ref(false);
const deleteSourceError = ref(null);

const openDeleteSourceDialog = (source) => {
  sourceToDelete.value = source;
  deleteSourceError.value = null;
  deleteSourceDialog.value = true;
};

const handleDeleteSource = async () => {
  try {
    deletingSource.value = true;
    deleteSourceError.value = null;
    await deleteSource(sourceToDelete.value.id);
    if (selectedSource.value?.id === sourceToDelete.value.id) {
      selectedSource.value = null;
    }
    await fetchProviderSources();
    deleteSourceDialog.value = false;
    sourceToDelete.value = null;
  } catch (err) {
    deleteSourceError.value = err.message;
  } finally {
    deletingSource.value = false;
  }
};

const closeDeleteSourceDialog = () => {
  deleteSourceDialog.value = false;
  sourceToDelete.value = null;
  deleteSourceError.value = null;
};

const selectSource = (source) => {
  selectedSource.value = source;
};

// Reload functionality
const reloading = ref(false);
const latestLogCard = ref(null);

const reload = () => {
  reloading.value = true;
  setTimeout(() => {
    reloading.value = false;
  }, 100);
};

const savePriority = async (source, newPriority) => {
  const num = Number(newPriority);
  if (!Number.isInteger(num) || num < 1) return;
  if (num === source.priority) return;

  try {
    prioritySaving.value = true;
    await updateSourcePriority(source.id, num);
    source.priority = num;
  } catch (err) {
    console.error("Error actualizando prioridad:", err);
  } finally {
    prioritySaving.value = false;
  }
};

const ivaIncludedSaving = ref(false);
const saveIvaIncluded = async (source, newValue) => {
  if (newValue === source.iva_included) return;
  try {
    ivaIncludedSaving.value = true;
    const { error: updateError } = await client
      .from("provider_sources")
      .update({ iva_included: newValue })
      .eq("id", source.id);
    if (updateError) throw updateError;
    source.iva_included = newValue;
  } catch (err) {
    console.error("Error actualizando iva_included:", err);
  } finally {
    ivaIncludedSaving.value = false;
  }
};

const fetchProviderSources = async () => {
  if (!providerId.value) {
    pending.value = false;
    return;
  }

  try {
    pending.value = true;
    error.value = null;

    const { data, error: fetchError } = await client
      .from("provider_sources")
      .select("id, name, type, friendly_name, priority, iva_included")
      .eq("provider_id", providerId.value)
      .order("priority", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    providerSources.value = data || [];

    // Auto-select first source
    if (data && data.length > 0 && !selectedSource.value) {
      selectedSource.value = data[0];
    }
  } catch (err) {
    error.value = err;
    providerSources.value = [];
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  fetchProviderSources();
});
</script>

<template>
  <div>
    <ProvidersDrawer />
    <div class="d-flex flex-column fill-height">
      <!-- Header -->
      <div class="provider-header rounded">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="provider-title">{{ providerName }}</h1>
            <div class="d-flex align-center ga-2 mt-1">
              <v-chip size="x-small" variant="flat" class="id-chip">
                ID: {{ providerId }}
              </v-chip>
              <span class="provider-sources-count">
                {{ providerSources.length }} fuente{{ providerSources.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
          <div class="d-flex ga-2 align-center">
            <v-btn
              prepend-icon="mdi-plus"
              variant="flat"
              size="small"
              class="action-btn"
              @click="showAddSourceDialog = true"
            >
              Agregar Fuente
            </v-btn>
            <v-btn
              icon="mdi-cog"
              variant="text"
              size="small"
              class="config-btn"
              @click="showConfigDialog = true"
            />
          </div>
        </div>

        <!-- Tabs inline en el header -->
        <div class="tab-pills">
          <button
            :class="['tab-pill', { 'tab-pill--active': mainTab === 'fuentes' }]"
            @click="mainTab = 'fuentes'"
          >
            <v-icon size="16">mdi-database</v-icon>
            <span>Fuentes</span>
          </button>
          <button
            :class="['tab-pill', { 'tab-pill--active': mainTab === 'productos' }]"
            @click="mainTab = 'productos'"
          >
            <v-icon size="16">mdi-package-variant</v-icon>
            <span>Productos</span>
          </button>
        </div>
      </div>

      <!-- Provider Config Dialog -->
      <ProviderConfigDialog
        v-model="showConfigDialog"
        :provider-name="providerName"
        :provider-id="providerId"
      />

      <!-- Add Source Dialog -->
      <AddSourceDialog
        v-model="showAddSourceDialog"
        :provider-name="providerName"
        :provider-id="providerId"
        @source-created="fetchProviderSources"
      />

      <!-- Tab Content -->
      <v-tabs-window v-model="mainTab" class="flex-grow-1 overflow-hidden">
        <!-- Fuentes Tab -->
        <v-tabs-window-item value="fuentes" class="fill-height">
          <v-row no-gutters class="fill-height overflow-hidden">
            <!-- Left: Sources List Menu -->
            <v-col cols="3" class="sources-panel d-flex flex-column overflow-hidden">
              <!-- Loading -->
              <div v-if="pending" class="text-center pa-6">
                <v-progress-circular indeterminate color="primary" size="28" width="3" />
              </div>

              <!-- Error -->
              <v-alert
                v-else-if="error"
                type="error"
                density="compact"
                class="ma-3"
              >
                {{ error.message }}
              </v-alert>

              <!-- Empty -->
              <div
                v-else-if="providerSources.length === 0"
                class="empty-sources"
              >
                <v-icon
                  icon="mdi-database-off"
                  size="40"
                  color="grey-lighten-1"
                />
                <p class="text-grey text-body-2 mt-2">Sin fuentes</p>
              </div>

              <!-- Sources List -->
              <v-list
                v-else
                density="default"
                nav
                class="sources-list flex-grow-1 overflow-y-auto"
              >
                <v-list-item
                  v-for="source in providerSources"
                  :key="source.id"
                  :class="['source-item', { 'source-item--active': selectedSource?.id === source.id }]"
                  :active="selectedSource?.id === source.id"
                  @click="selectSource(source)"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar
                      size="34"
                      :class="['source-avatar', { 'source-avatar--active': selectedSource?.id === source.id }]"
                    >
                      <v-icon
                        :icon="
                          source.type === 'file-source'
                            ? 'mdi-file-document'
                            : source.type === 'fingerprint-source'
                              ? 'mdi-fingerprint'
                              : 'mdi-web'
                        "
                        size="18"
                        color="white"
                      />
                    </v-avatar>
                  </template>

                  <v-list-item-title class="source-name">
                    {{ source.friendly_name || source.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="source-type d-flex align-center ga-1">
                    <span>{{ source.type }}</span>
                    <v-chip
                      size="x-small"
                      variant="elevated"
                      class="priority-chip"
                      :color="source.priority <= 1 ? 'amber-darken-2' : 'blue-grey-lighten-1'"
                    >
                      #{{ source.priority }}
                    </v-chip>
                    <v-chip
                      v-if="source.iva_included"
                      size="x-small"
                      variant="tonal"
                      color="green"
                      class="ml-1"
                    >
                      IVA inc.
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- Right: Source Details Content -->
            <v-col cols="9" class="overflow-y-auto">
              <!-- No source selected -->
              <div
                v-if="!selectedSource && !pending"
                class="d-flex flex-column align-center justify-center fill-height"
              >
                <v-icon
                  icon="mdi-cursor-default-click"
                  size="56"
                  color="grey-lighten-1"
                />
                <p class="text-grey mt-3 text-body-2">
                  Selecciona una fuente para ver detalles
                </p>
              </div>

              <!-- Source Details -->
              <div
                v-else-if="selectedSource && !reloading"
                :key="selectedSource.id"
                class="pa-6"
              >
                <!-- Source Header -->
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h2 class="source-detail-title">
                      {{ selectedSource.friendly_name || selectedSource.name }}
                    </h2>
                    <div class="d-flex align-center ga-2 mt-1">
                      <v-chip size="x-small" variant="tonal" color="primary">
                        {{ selectedSource.type }}
                      </v-chip>
                      <span class="text-grey text-caption">
                        {{ selectedSource.name }}
                      </span>
                    </div>
                  </div>
                  <div class="d-flex align-center ga-2">
                    <v-text-field
                      :model-value="selectedSource.priority"
                      @update:model-value="savePriority(selectedSource, $event)"
                      type="number"
                      min="1"
                      label="Prioridad"
                      variant="outlined"
                      density="compact"
                      hide-details
                      :loading="prioritySaving"
                      style="max-width: 100px"
                      hint="1 = máxima"
                    />
                    <v-tooltip location="bottom" max-width="300">
                      <template #activator="{ props: tooltipProps }">
                        <v-icon
                          v-bind="tooltipProps"
                          icon="mdi-information-outline"
                          size="20"
                          color="grey"
                          class="info-icon"
                        />
                      </template>
                      La prioridad define qué fuente gana cuando varias tienen el mismo producto. Menor número = mayor prioridad (1 es la máxima). Si dos fuentes tienen la misma prioridad, gana la que se ejecutó más recientemente.
                    </v-tooltip>
                    <v-checkbox
                      :model-value="selectedSource.iva_included || false"
                      @update:model-value="saveIvaIncluded(selectedSource, $event)"
                      label="IVA incluido"
                      density="compact"
                      hide-details
                      :loading="ivaIncludedSaving"
                      class="ml-2"
                      style="max-width: 160px"
                    />
                    <v-tooltip location="bottom" max-width="300">
                      <template #activator="{ props: ivaTooltipProps }">
                        <v-icon
                          v-bind="ivaTooltipProps"
                          icon="mdi-information-outline"
                          size="20"
                          color="grey"
                          class="info-icon"
                        />
                      </template>
                      Indica si los precios de esta fuente ya incluyen IVA. Si se activa, el sistema descontara el IVA automaticamente al mergear los productos.
                    </v-tooltip>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      size="small"
                      color="error"
                      class="delete-source-btn"
                      @click="openDeleteSourceDialog(selectedSource)"
                    />
                    <v-btn
                      icon="mdi-reload"
                      variant="text"
                      size="small"
                      class="reload-btn"
                      @click="reload"
                      :loading="reloading"
                    />
                  </div>
                </div>

                <!-- Latest Log Card -->
                <LatestSourceLogCard
                  ref="latestLogCard"
                  :source="selectedSource"
                />

                <!-- Source Tabs -->
                <SourceTabs :source="selectedSource">
                  <template #sincronizacion>
                    <SourcesFileSource
                      v-if="selectedSource.type === 'file-source'"
                      :source="selectedSource"
                    />

                    <SourcesWebScraperSource
                      v-else-if="selectedSource.type === 'web-scraper-source'"
                      :source="selectedSource"
                    />

                    <SourcesFingerprintSource
                      v-else-if="selectedSource.type === 'fingerprint-source'"
                      :source="selectedSource"
                    />

                    <v-alert v-else type="warning" variant="tonal">
                      No hay un componente específico para el tipo "{{
                        selectedSource.type
                      }}"
                    </v-alert>
                  </template>
                </SourceTabs>
              </div>

              <!-- Loading state for content -->
              <div
                v-else-if="pending"
                class="d-flex align-center justify-center pa-6 fill-height"
              >
                <v-progress-circular indeterminate color="primary" size="48" />
              </div>
            </v-col>
          </v-row>
        </v-tabs-window-item>

        <!-- Productos Tab -->
        <v-tabs-window-item value="productos" class="fill-height">
          <div class="pa-6">
            <ProviderProductsTable v-if="providerId" :provider-id="providerId" :sources="providerSources" />
          </div>
        </v-tabs-window-item>
      </v-tabs-window>
    </div>

    <!-- Delete Source Dialog -->
    <v-dialog v-model="deleteSourceDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Confirmar eliminación de fuente
        </v-card-title>
        <v-card-text>
          <p>¿Estás seguro que querés eliminar la fuente <strong>{{ sourceToDelete?.friendly_name || sourceToDelete?.name }}</strong>?</p>
          <p class="text-caption text-grey mt-2">Solo se pueden eliminar fuentes sin sincronizaciones.</p>
          <v-alert v-if="deleteSourceError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ deleteSourceError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeDeleteSourceDialog" :disabled="deletingSource">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="flat" @click="handleDeleteSource" :loading="deletingSource">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
/* Provider Header */
.provider-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 20px 24px 0 24px;
  border-bottom: 1px solid #475569;
}

.provider-title {
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.id-chip {
  background: rgba(102, 126, 234, 0.25) !important;
  color: #a5b4fc !important;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.provider-sources-count {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

/* Action buttons */
.action-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  text-transform: none;
  font-weight: 600;
  font-size: 13px;
  border-radius: 8px !important;
  letter-spacing: 0.2px;
}

.config-btn {
  color: #94a3b8 !important;
  border-radius: 8px !important;
}

.config-btn:hover {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

/* Tab pills */
.tab-pills {
  display: flex;
  gap: 4px;
  margin-top: 16px;
}

.tab-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-pill:hover {
  color: white;
  background: rgba(255, 255, 255, 0.06);
}

.tab-pill--active {
  color: white;
  font-weight: 600;
  border-bottom-color: #667eea;
  background: rgba(255, 255, 255, 0.08);
}

/* Sources panel (left) */
.sources-panel {
  background: #fafbfc;
  border-right: 1px solid #e5e7eb;
}

.empty-sources {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.sources-list {
  background: transparent !important;
  padding: 8px !important;
}

.source-item {
  margin-bottom: 4px;
  border-radius: 10px !important;
  transition: all 0.2s ease;
  min-height: 52px !important;
  border: 2px solid transparent;
}

.source-item:hover {
  background: rgba(102, 126, 234, 0.06) !important;
}

.source-item--active {
  background: rgba(102, 126, 234, 0.1) !important;
  border-color: #667eea !important;
}

.source-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.source-item:hover .source-avatar,
.source-avatar--active {
  opacity: 1;
}

.source-name {
  font-size: 13px !important;
  font-weight: 600;
  color: #2c3e50;
}

.source-item--active .source-name {
  color: #667eea;
}

.source-type {
  font-size: 11px !important;
  color: #9ca3af;
}

.priority-chip {
  font-weight: 700;
  font-size: 10px !important;
  min-width: 24px;
  height: 18px !important;
  padding: 0 5px !important;
}

/* Source detail header */
.source-detail-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.reload-btn {
  color: #6b7280 !important;
  border-radius: 8px !important;
}

.reload-btn:hover {
  color: #667eea !important;
  background: rgba(102, 126, 234, 0.08) !important;
}

.delete-source-btn {
  color: #ef4444 !important;
  border-radius: 8px !important;
}

.delete-source-btn:hover {
  background: rgba(239, 68, 68, 0.08) !important;
}

.info-icon {
  cursor: help;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.info-icon:hover {
  opacity: 1;
}
</style>
