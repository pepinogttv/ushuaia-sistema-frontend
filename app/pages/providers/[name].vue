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

// Drawer state
const drawerOpen = ref(false);
const selectedSource = ref(null);

const openSourceDetails = (source) => {
  selectedSource.value = source;
  drawerOpen.value = true;
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
  <div class="pa-4">
    <v-card>
      <v-card-title class="text-h4 font-weight-bold pa-6">
        {{ providerName }} (#{{ providerId }})
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-alert type="info" variant="tonal" class="mb-4">
          Estás viendo la información del proveedor:
          <strong>{{ providerName }}</strong>
        </v-alert>

        <!-- Provider Sources Section -->
        <div>
          <!-- Loading -->
          <div v-if="pending" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary" size="32" />
          </div>

          <!-- Error -->
          <v-alert v-else-if="error" type="error" class="mb-4">
            {{ error.message }}
          </v-alert>

          <!-- Empty -->
          <div
            v-else-if="providerSources.length === 0"
            class="text-center pa-4"
          >
            <p class="text-grey">
              No hay fuentes disponibles para este proveedor
            </p>
          </div>

          <!-- Sources List -->
          <v-list v-else lines="two">
            <v-list-item
              v-for="source in providerSources"
              :key="source.id"
              class="mb-2"
              @click="openSourceDetails(source)"
              style="cursor: pointer"
            >
              <v-list-item-title class="font-weight-medium">
                {{ source.friendly_name || source.name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ source.name }} • Tipo: {{ source.type }}
              </v-list-item-subtitle>

              <template v-slot:prepend>
                <v-icon
                  :icon="
                    source.type === 'file' ? 'mdi-file-document' : 'mdi-web'
                  "
                  color="primary"
                />
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
    </v-card>

    <!-- Source Details Drawer -->
    <SourceDetailsDrawer v-model="drawerOpen" :source="selectedSource" />
  </div>
</template>
