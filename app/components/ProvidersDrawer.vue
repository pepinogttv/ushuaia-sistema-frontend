<script setup>
const client = useSupabaseClient();

const showAddProviderDialog = ref(false);

const providers = ref([]);
const pending = ref(true);
const error = ref(null);
const drawer = ref(true);
const searchQuery = ref("");

const { deleteProvider } = useExternalBackend();
const deleteDialog = ref(false);
const providerToDelete = ref(null);
const deleting = ref(false);
const deleteError = ref(null);

const openDeleteDialog = (provider) => {
  providerToDelete.value = provider;
  deleteError.value = null;
  deleteDialog.value = true;
};

const handleDeleteProvider = async () => {
  try {
    deleting.value = true;
    deleteError.value = null;
    await deleteProvider(providerToDelete.value.id);
    await fetchProviders();
    if (selectedProviderId.value === providerToDelete.value.id) {
      navigateTo("/providers");
    }
    deleteDialog.value = false;
    providerToDelete.value = null;
  } catch (err) {
    deleteError.value = err.message;
  } finally {
    deleting.value = false;
  }
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  providerToDelete.value = null;
  deleteError.value = null;
};

const filteredProviders = computed(() => {
  if (!searchQuery.value.trim()) {
    return providers.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return providers.value.filter((provider) =>
    provider.name.toLowerCase().includes(query),
  );
});

const fetchProviders = async () => {
  try {
    pending.value = true;
    error.value = null;

    const { data, error: fetchError } = await client
      .from("providers")
      .select("id, name")
      .order("name", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    providers.value = data || [];
  } catch (err) {
    error.value = err;
    providers.value = [];
  } finally {
    pending.value = false;
  }
};

const route = useRoute();

const selectedProviderId = computed(() => {
  const id = route.query.id;
  return id ? Number(id) : null;
});

const isSelected = (provider) => provider.id === selectedProviderId.value;

const handleProviderClick = (provider) => {
  navigateTo(`/providers/${provider.name}?id=${provider.id}`);
};

onMounted(() => {
  fetchProviders();
});
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    permanent
    :width="260"
    class="drawer-custom"
  >
    <!-- Search Bar -->
    <div class="search-container">
      <v-text-field
        v-model="searchQuery"
        placeholder="Buscar..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="search-input"
        @click:clear="searchQuery = ''"
      />
    </div>

    <div class="providers-container">
      <!-- Loading -->
      <div v-if="pending" class="text-center pa-6">
        <v-progress-circular
          indeterminate
          color="primary"
          size="36"
          width="3"
        />
        <p class="text-grey-darken-1 mt-3 text-body-2">Cargando...</p>
      </div>

      <!-- Error -->
      <v-alert v-else-if="error" type="error" class="ma-3" density="compact">
        <div class="text-body-2">{{ error.message }}</div>
      </v-alert>

      <!-- Empty -->
      <div v-else-if="providers.length === 0" class="empty-state">
        <v-icon size="48" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
        <p class="text-grey-darken-1 mt-3 text-body-2">No hay proveedores</p>
      </div>

      <!-- No search results -->
      <div v-else-if="filteredProviders.length === 0" class="empty-state">
        <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
        <p class="text-grey-darken-1 mt-3 text-body-2">Sin resultados</p>
      </div>

      <!-- Providers List -->
      <v-list v-else density="default" class="providers-list pa-0">
        <v-list-item
          v-for="provider in filteredProviders"
          :key="provider.id"
          :class="['provider-item', { 'provider-item--active': isSelected(provider) }]"
          :active="isSelected(provider)"
          @click="handleProviderClick(provider)"
          rounded="lg"
        >
          <template #prepend>
            <v-avatar
              size="38"
              :class="['provider-avatar', { 'provider-avatar--active': isSelected(provider) }]"
            >
              <v-icon size="20" color="white">mdi-package-variant</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="provider-name">
            {{ provider.name }}
          </v-list-item-title>

          <template #append>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="x-small"
              color="error"
              class="provider-delete"
              @click.stop="openDeleteDialog(provider)"
            />
            <v-icon
              v-if="isSelected(provider)"
              size="20"
              color="primary"
            >
              mdi-check-circle
            </v-icon>
            <v-icon v-else size="18" color="grey-lighten-1" class="provider-arrow">
              mdi-chevron-right
            </v-icon>
          </template>
        </v-list-item>
      </v-list>
    </div>

    <!-- Fixed Bottom Button -->
    <div class="add-provider-container">
      <v-btn
        color="primary"
        size="default"
        block
        class="add-provider-btn"
        prepend-icon="mdi-plus"
        @click="showAddProviderDialog = true"
      >
        Agregar Proveedor
      </v-btn>
    </div>

    <!-- Add Provider Dialog -->
    <AddProviderDialog v-model="showAddProviderDialog" />

    <!-- Delete Provider Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6">
          Confirmar eliminación
        </v-card-title>
        <v-card-text>
          <p>¿Estás seguro que querés eliminar el proveedor <strong>{{ providerToDelete?.name }}</strong>?</p>
          <p class="text-caption text-grey mt-2">Esta acción no se puede deshacer.</p>
          <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeDeleteDialog" :disabled="deleting">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="flat" @click="handleDeleteProvider" :loading="deleting">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<style scoped>
.drawer-custom {
  background: #f8f9fa;
}

/* Search Bar */
.search-container {
  padding: 12px 12px 0 12px;
}

.search-input :deep(.v-field) {
  border-radius: 10px !important;
  font-size: 13px;
}

.search-input :deep(.v-field__prepend-inner .v-icon) {
  color: #667eea;
  font-size: 18px;
}

.providers-container {
  padding: 8px 12px;
  padding-bottom: 70px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

.providers-list {
  background: transparent !important;
}

.provider-item {
  margin-bottom: 4px;
  border-radius: 10px !important;
  transition: all 0.2s ease;
  min-height: 48px !important;
  border: 2px solid transparent;
}

.provider-item:hover {
  background: rgba(102, 126, 234, 0.08) !important;
}

.provider-item--active {
  background: rgba(102, 126, 234, 0.1) !important;
  border-color: #667eea !important;
}

.provider-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.provider-item:hover .provider-avatar,
.provider-avatar--active {
  opacity: 1;
}

.provider-name {
  font-size: 14px !important;
  font-weight: 600;
  color: #2c3e50;
}

.provider-item--active .provider-name {
  color: #667eea;
}

.provider-arrow {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.provider-item:hover .provider-arrow {
  opacity: 1;
}

.provider-delete {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.provider-item:hover .provider-delete {
  opacity: 1;
}

/* Scrollbar */
.v-navigation-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.v-navigation-drawer :deep(.v-navigation-drawer__content)::-webkit-scrollbar {
  width: 4px;
}

.v-navigation-drawer
  :deep(.v-navigation-drawer__content)::-webkit-scrollbar-track {
  background: transparent;
}

.v-navigation-drawer
  :deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.2);
  border-radius: 2px;
}

/* Fixed Bottom Button */
.add-provider-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(0deg, #f8f9fa 70%, transparent 100%);
  padding-top: 24px;
}

.add-provider-btn {
  border-radius: 10px !important;
  font-weight: 600;
  text-transform: none;
  font-size: 13px;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}
</style>
