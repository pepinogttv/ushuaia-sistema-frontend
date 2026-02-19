<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  fingerprint: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const search = ref("");

const headers = [
  { title: "Fila", key: "rowNumber", width: "100px", sortable: true },
  { title: "Hoja", key: "worksheet", width: "150px", sortable: true },
  { title: "Contenido", key: "preview", sortable: false },
];

const examples = computed(() => {
  if (!props.fingerprint?.examples) return [];
  return props.fingerprint.examples.map((ex, index) => ({
    ...ex,
    id: index,
  }));
});

const getTypeLabel = (type) => {
  const labels = {
    string: "Texto",
    number: "Número",
    price: "Precio",
    date: "Fecha",
    boolean: "Sí/No",
    email: "Email",
    link: "Enlace",
    empty: "Vacío",
  };
  return labels[type] || type;
};

const getTypeColor = (type) => {
  const colors = {
    string: "blue",
    number: "green",
    price: "purple",
    date: "orange",
    boolean: "teal",
    email: "indigo",
    link: "cyan",
    empty: "grey",
  };
  return colors[type] || "grey";
};

const getTypeIcon = (type) => {
  const icons = {
    string: "mdi-format-text",
    number: "mdi-numeric",
    price: "mdi-currency-usd",
    date: "mdi-calendar",
    boolean: "mdi-toggle-switch",
    email: "mdi-email",
    link: "mdi-link",
    empty: "mdi-checkbox-blank-outline",
  };
  return icons[type] || "mdi-help";
};

const parseFingerprint = (fingerprint) => {
  if (!fingerprint) return [];
  return fingerprint.split("|");
};

const close = () => {
  dialog.value = false;
  search.value = "";
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="1100" scrollable>
    <v-card v-if="fingerprint">
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center ga-2">
          <v-icon color="primary">mdi-table-search</v-icon>
          <span>Ejemplos del Patrón</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Pattern Info -->
        <v-card variant="tonal" color="primary" class="mb-4">
          <v-card-text class="py-3">
            <div
              class="d-flex align-center justify-space-between flex-wrap ga-4"
            >
              <div>
                <div class="text-caption text-medium-emphasis mb-1">
                  Estructura del patrón
                </div>
                <div class="d-flex ga-1 flex-wrap">
                  <v-chip
                    v-for="(type, index) in parseFingerprint(
                      fingerprint.fingerprint,
                    )"
                    :key="index"
                    :color="getTypeColor(type)"
                    size="x-small"
                    variant="flat"
                  >
                    <v-icon :icon="getTypeIcon(type)" size="x-small" start />
                    {{ getTypeLabel(type) }}
                  </v-chip>
                </div>
              </div>
              <div class="d-flex ga-6">
                <div class="text-center">
                  <div class="text-h5 font-weight-bold">
                    {{ fingerprint.occurrences.toLocaleString() }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Filas totales
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-h5 font-weight-bold">
                    {{ fingerprint.percentage }}%
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Del archivo
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Search -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar en ejemplos..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="mb-4"
        />

        <!-- Data Table -->
        <v-data-table
          :headers="headers"
          :items="examples"
          :search="search"
          :items-per-page="10"
          :items-per-page-options="[5, 10, 25, 50]"
          class="elevation-1 rounded-lg"
          hover
        >
          <template #item.rowNumber="{ item }">
            <v-chip size="small" label color="primary" variant="tonal">
              {{ item.rowNumber }}
            </v-chip>
          </template>

          <template #item.worksheet="{ item }">
            <v-chip size="small" variant="outlined">
              <v-icon start size="small">mdi-file-excel</v-icon>
              {{ item.worksheet }}
            </v-chip>
          </template>

          <template #item.preview="{ item }">
            <div class="example-content py-2">
              <div class="d-flex ga-2 flex-wrap">
                <v-chip
                  v-for="(value, vIndex) in item.values.slice(0, 10)"
                  :key="vIndex"
                  size="x-small"
                  :color="value === '' ? 'grey' : 'default'"
                  variant="tonal"
                  label
                >
                  <span class="font-weight-bold mr-1 text-primary"
                    >{{ vIndex + 1 }}:</span
                  >
                  {{ value === "" ? "(vacío)" : value }}
                </v-chip>
                <v-chip
                  v-if="item.values.length > 10"
                  size="x-small"
                  color="grey"
                  variant="tonal"
                >
                  +{{ item.values.length - 10 }} columnas más
                </v-chip>
              </div>
            </div>
          </template>

          <template #no-data>
            <div class="text-center py-6 text-medium-emphasis">
              <v-icon size="48" color="grey">mdi-table-off</v-icon>
              <div class="mt-2">No hay ejemplos disponibles</div>
            </div>
          </template>

          <template #no-results>
            <div class="text-center py-6 text-medium-emphasis">
              <v-icon size="48" color="grey">mdi-magnify-close</v-icon>
              <div class="mt-2">
                No se encontraron resultados para "{{ search }}"
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="close"> Cerrar </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.example-content {
  max-width: 600px;
}
</style>
