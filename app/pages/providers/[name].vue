<script setup>
definePageMeta({
  layout: "providers",
});

const client = useSupabaseClient();
const route = useRoute();

const providerName = computed(() => route.params.name);
const providerId = computed(() => route.query.id);

const providerSources = ref([]);
const pending = ref(true);
const error = ref(null);

// Selected source
const selectedSource = ref(null);

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
      .select("id, name, type, friendly_name")
      .eq("provider_id", providerId.value)
      .order("name", { ascending: true });

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
  <div class="d-flex flex-column fill-height">
    <!-- Header -->
    <v-sheet class="pa-4 pb-2" color="surface-variant" border="b">
      <h1 class="text-h4 font-weight-bold">{{ providerName }}</h1>
      <p class="text-grey mt-1">ID: {{ providerId }}</p>
    </v-sheet>

    <!-- Main Content: Horizontal Layout -->
    <v-row no-gutters class="flex-grow-1 overflow-hidden">
      <!-- Left: Sources List Menu -->
      <v-col cols="3" class="d-flex flex-column border-e overflow-hidden">
        <div class="pa-3 border-b">
          <h3 class="text-subtitle-2 text-uppercase text-medium-emphasis">
            <v-icon icon="mdi-database" size="18" class="mr-2" />
            Fuentes
          </h3>
        </div>

        <!-- Loading -->
        <div v-if="pending" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" size="24" />
        </div>

        <!-- Error -->
        <v-alert v-else-if="error" type="error" density="compact" class="ma-2">
          {{ error.message }}
        </v-alert>

        <!-- Empty -->
        <div v-else-if="providerSources.length === 0" class="text-center pa-4">
          <v-icon icon="mdi-database-off" size="48" color="grey" class="mb-2" />
          <p class="text-grey text-body-2">No hay fuentes disponibles</p>
        </div>

        <!-- Sources List -->
        <v-list
          v-else
          density="compact"
          nav
          class="flex-grow-1 overflow-y-auto pa-2"
        >
          <v-list-item
            v-for="source in providerSources"
            :key="source.id"
            :active="selectedSource?.id === source.id"
            @click="selectSource(source)"
            class="mb-1"
            rounded="lg"
            height="60"
          >
            <template v-slot:prepend>
              <v-icon
                :icon="
                  source.type === 'file-source'
                    ? 'mdi-file-document'
                    : 'mdi-web'
                "
                size="20"
              />
            </template>

            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ source.friendly_name || source.name }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ source.type }}
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
          <v-icon icon="mdi-cursor-default-click" size="64" color="grey" />
          <p class="text-grey mt-4">Selecciona una fuente para ver detalles</p>
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
              <h2 class="text-h5 font-weight-bold">
                {{ selectedSource.friendly_name || selectedSource.name }}
              </h2>
              <p class="text-grey text-body-2 mt-1">
                {{ selectedSource.name }} • {{ selectedSource.type }}
              </p>
            </div>
            <v-btn
              icon="mdi-reload"
              variant="text"
              @click="reload"
              :loading="reloading"
            />
          </div>

          <!-- Latest Log Card -->
          <LatestSourceLogCard ref="latestLogCard" :source="selectedSource" />

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
  </div>
</template>
