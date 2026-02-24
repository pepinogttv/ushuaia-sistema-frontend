<script setup>
const props = defineProps({
  product: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close"]);

const client = useSupabaseClient();

const dialog = ref(false);
const loading = ref(false);
const source = ref(null);
const updateLogs = ref([]);

const fieldLabels = {
  description: "Descripcion",
  price_usd: "Precio USD",
  price_ars: "Precio ARS",
  sales_unit: "Unidad de venta",
  iva: "IVA",
  repeated: "Repetido",
  discontinued: "Discontinuado",
};

const fieldIcons = {
  description: "mdi-text",
  price_usd: "mdi-currency-usd",
  price_ars: "mdi-cash",
  sales_unit: "mdi-package-variant",
  iva: "mdi-percent",
  repeated: "mdi-content-copy",
  discontinued: "mdi-close-circle",
};

const formatFieldValue = (key, value) => {
  if (value == null) return "-";
  if (key === "price_usd") return `U$D ${Number(value).toFixed(2)}`;
  if (key === "price_ars") return `$ ${Number(value).toFixed(2)}`;
  if (key === "iva") return `${value}%`;
  if (typeof value === "boolean") return value ? "Si" : "No";
  return String(value);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sourceIcon = (type) => {
  if (type === "file-source") return "mdi-file-document";
  if (type === "fingerprint-source") return "mdi-fingerprint";
  return "mdi-web";
};

const sourceColor = (type) => {
  if (type === "web-scraper") return "primary";
  if (type === "fingerprint-source") return "purple";
  return "orange";
};

const resolveNewValue = (logIndex, fieldKey) => {
  // Logs are DESC order. For log[i], the "new value" is the prev_value
  // of the most recent log (lower index) that also changed this field.
  // If none found, it's the current product value.
  for (let i = logIndex - 1; i >= 0; i--) {
    if (updateLogs.value[i].prev_values?.[fieldKey] !== undefined) {
      return updateLogs.value[i].prev_values[fieldKey];
    }
  }
  return props.product?.[fieldKey];
};

const changedFields = (log, logIndex) => {
  if (!log.prev_values || typeof log.prev_values !== "object") return [];
  return Object.entries(log.prev_values)
    .filter(([key]) => key !== "provider_source_log_id" && key !== "newest_provider_source_log_id")
    .map(([key, oldValue]) => ({
      field: fieldLabels[key] || key,
      icon: fieldIcons[key] || "mdi-pencil",
      oldValue: formatFieldValue(key, oldValue),
      newValue: formatFieldValue(key, resolveNewValue(logIndex, key)),
    }));
};

const fetchDetails = async (product) => {
  loading.value = true;
  source.value = null;
  updateLogs.value = [];

  try {
    const promises = [];

    if (product.provider_source_id) {
      promises.push(
        client
          .from("provider_sources")
          .select("id, name, friendly_name, type, priority")
          .eq("id", product.provider_source_id)
          .single()
          .then(({ data }) => {
            source.value = data;
          })
      );
    }

    promises.push(
      client
        .from("product_updates_logs")
        .select("*, provider_source_logs(id, started_at, source_filename, status, provider_sources(friendly_name, name, type))")
        .eq("ppid", product.internal_id)
        .eq("has_changes", true)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (error) throw error;
          updateLogs.value = data || [];
        })
    );

    await Promise.all(promises);
  } catch (err) {
    console.error("[ProductDetail] Error fetching details:", err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.product,
  (newProduct) => {
    if (newProduct) {
      dialog.value = true;
      fetchDetails(newProduct);
    }
  }
);

watch(dialog, (open) => {
  if (!open) {
    emit("close");
  }
});
</script>

<template>
  <v-dialog v-model="dialog" max-width="800" scrollable>
    <v-card v-if="product" rounded="lg" class="overflow-hidden">
      <!-- Header -->
      <div class="bg-primary pa-5 pb-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <v-chip color="white" variant="flat" size="small" label class="font-weight-bold">
            {{ product.provider_product_id }}
          </v-chip>
          <v-btn icon="mdi-close" variant="text" color="white" size="small" density="comfortable" @click="dialog = false" />
        </div>

        <div class="text-h6 text-white font-weight-bold mb-3" style="line-height: 1.3">
          {{ product.description || "Sin descripcion" }}
        </div>

        <div class="d-flex ga-2 flex-wrap">
          <v-chip
            v-if="product.discontinued"
            color="error"
            variant="flat"
            size="small"
            prepend-icon="mdi-cancel"
          >
            Discontinuado
          </v-chip>
          <v-chip
            v-if="product.repeated"
            color="warning"
            variant="flat"
            size="small"
            prepend-icon="mdi-content-copy"
          >
            Repetido
          </v-chip>
          <v-chip color="rgba(255,255,255,0.2)" variant="flat" size="small">
            ID {{ product.internal_id }}
          </v-chip>
        </div>
      </div>

      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <v-card-text class="pa-5">
        <!-- Prices & Stats -->
        <v-row class="mb-5" dense>
          <v-col cols="6" sm="3">
            <v-card variant="tonal" color="success" rounded="lg" class="text-center pa-3 h-100">
              <div class="text-caption text-medium-emphasis font-weight-medium">USD</div>
              <div class="text-h5 font-weight-black mt-1">
                {{ product.price_usd != null ? Number(product.price_usd).toFixed(2) : "-" }}
              </div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="tonal" color="info" rounded="lg" class="text-center pa-3 h-100">
              <div class="text-caption text-medium-emphasis font-weight-medium">ARS</div>
              <div class="text-h5 font-weight-black mt-1">
                {{ product.price_ars != null ? Number(product.price_ars).toFixed(2) : "-" }}
              </div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" rounded="lg" class="text-center pa-3 h-100">
              <div class="text-caption text-medium-emphasis font-weight-medium">Unidad</div>
              <div class="text-h5 font-weight-black mt-1">
                {{ product.sales_unit ?? "-" }}
              </div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" rounded="lg" class="text-center pa-3 h-100">
              <div class="text-caption text-medium-emphasis font-weight-medium">IVA</div>
              <div class="text-h5 font-weight-black mt-1">
                {{ product.iva != null ? `${product.iva}%` : "-" }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Source -->
        <div class="text-overline text-medium-emphasis mb-2">Fuente</div>
        <v-card v-if="source" variant="outlined" rounded="lg" class="mb-5">
          <v-card-text class="d-flex align-center ga-3 py-3">
            <v-avatar :color="sourceColor(source.type)" size="40" rounded="lg">
              <v-icon :icon="sourceIcon(source.type)" color="white" size="20" />
            </v-avatar>
            <div class="flex-grow-1">
              <div class="text-body-1 font-weight-medium">
                {{ source.friendly_name || source.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ source.type }}
              </div>
            </div>
            <v-chip
              v-if="source.priority != null"
              size="small"
              variant="tonal"
              color="primary"
              label
              prepend-icon="mdi-sort-numeric-ascending"
            >
              {{ source.priority }}
            </v-chip>
          </v-card-text>
        </v-card>
        <v-card v-else-if="!loading" variant="outlined" rounded="lg" class="mb-5">
          <v-card-text class="text-center py-4 text-medium-emphasis">
            <v-icon size="20" class="mr-1">mdi-link-off</v-icon>
            Sin fuente asociada
          </v-card-text>
        </v-card>

        <!-- History -->
        <div class="d-flex align-center ga-2 mb-3">
          <div class="text-overline text-medium-emphasis">Historial de cambios</div>
          <v-chip v-if="updateLogs.length" size="x-small" color="primary" variant="tonal" label>
            {{ updateLogs.length }}
          </v-chip>
        </div>

        <div v-if="!loading && updateLogs.length === 0" class="text-center py-10">
          <v-icon size="56" color="grey-lighten-2">mdi-history</v-icon>
          <div class="mt-3 text-body-2 text-medium-emphasis">Sin cambios registrados</div>
        </div>

        <v-timeline v-else density="compact" side="end" truncate-line="both" line-thickness="2">
          <v-timeline-item
            v-for="(log, index) in updateLogs"
            :key="log.id"
            size="x-small"
            dot-color="primary"
          >
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
              <div class="d-flex align-center ga-2">
                <span class="text-caption font-weight-bold">
                  {{ formatDate(log.created_at) }}
                </span>
                <v-chip
                  v-if="log.provider_source_logs?.source_filename"
                  size="x-small"
                  variant="outlined"
                  color="grey"
                  prepend-icon="mdi-file-outline"
                >
                  {{ log.provider_source_logs.source_filename }}
                </v-chip>
              </div>
              <v-chip
                v-if="log.provider_source_logs?.provider_sources"
                size="x-small"
                variant="tonal"
                :color="sourceColor(log.provider_source_logs.provider_sources.type)"
                :prepend-icon="sourceIcon(log.provider_source_logs.provider_sources.type)"
              >
                {{ log.provider_source_logs.provider_sources.friendly_name || log.provider_source_logs.provider_sources.name }}
              </v-chip>
              <v-chip
                v-else-if="log.provider_source_logs"
                size="x-small"
                variant="tonal"
                color="grey"
              >
                Log #{{ log.provider_source_log_id }}
              </v-chip>
            </div>

            <div
              v-for="change in changedFields(log, index)"
              :key="change.field"
              class="d-flex align-center ga-2 flex-wrap py-1"
            >
              <v-icon :icon="change.icon" size="14" color="grey" />
              <span class="text-caption text-medium-emphasis" style="min-width: 80px">{{ change.field }}</span>
              <v-chip size="x-small" color="error" variant="tonal" label>
                {{ change.oldValue }}
              </v-chip>
              <v-icon size="12" icon="mdi-arrow-right" color="grey" />
              <v-chip size="x-small" color="success" variant="tonal" label>
                {{ change.newValue }}
              </v-chip>
            </div>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
