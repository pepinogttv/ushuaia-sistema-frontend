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
  description: "Descripción",
  price_usd: "Precio USD",
  price_ars: "Precio ARS",
  sales_unit: "Unidad de venta",
  iva: "IVA",
  repeated: "Repetido",
  discontinued: "Discontinuado",
  provider_source_log_id: "Log fuente",
  newest_provider_source_log_id: "Último log fuente",
};

const formatFieldValue = (key, value) => {
  if (value == null) return "-";
  if (key === "price_usd") return `U$D ${Number(value).toFixed(2)}`;
  if (key === "price_ars") return `$ ${Number(value).toFixed(2)}`;
  if (key === "iva") return `${value}%`;
  if (typeof value === "boolean") return value ? "Sí" : "No";
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

const changedFields = (log) => {
  if (!log.prev_values || typeof log.prev_values !== "object") return [];
  return Object.entries(log.prev_values)
    .filter(([key]) => key !== "provider_source_log_id" && key !== "newest_provider_source_log_id")
    .map(([key, oldValue]) => ({
      field: fieldLabels[key] || key,
      oldValue: formatFieldValue(key, oldValue),
    }));
};

const fetchDetails = async (product) => {
  loading.value = true;
  source.value = null;
  updateLogs.value = [];

  try {
    const promises = [];

    // Fetch source
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

    // Fetch update logs with source log info
    promises.push(
      client
        .from("product_updates_logs")
        .select("*, provider_source_logs(id, started_at, source_filename, status, provider_sources(friendly_name, name))")
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
  <v-dialog v-model="dialog" max-width="750" scrollable>
    <v-card v-if="product">
      <v-card-title class="d-flex align-center justify-space-between pa-4 pb-2">
        <div>
          <div class="text-h6 font-weight-bold">Detalle de producto</div>
          <div class="text-caption text-grey">
            ID interno: {{ product.internal_id }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <!-- Product Info -->
        <v-card variant="tonal" color="primary" class="mb-4">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-3">
              <v-chip label size="small" color="primary">
                {{ product.provider_product_id }}
              </v-chip>
              <v-chip
                v-if="product.discontinued"
                label
                size="small"
                color="error"
                variant="flat"
              >
                Discontinuado
              </v-chip>
            </div>

            <div class="text-body-1 font-weight-medium mb-3">
              {{ product.description || "Sin descripción" }}
            </div>

            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">USD</div>
                <div class="text-body-2 font-weight-medium">
                  {{ product.price_usd != null ? `U$D ${Number(product.price_usd).toFixed(2)}` : "-" }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">ARS</div>
                <div class="text-body-2 font-weight-medium">
                  {{ product.price_ars != null ? `$ ${Number(product.price_ars).toFixed(2)}` : "-" }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">Unidad</div>
                <div class="text-body-2 font-weight-medium">
                  {{ product.sales_unit ?? "-" }}
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-caption text-grey">IVA</div>
                <div class="text-body-2 font-weight-medium">
                  {{ product.iva != null ? `${product.iva}%` : "-" }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Source Info -->
        <div class="text-subtitle-2 font-weight-bold mb-2">Fuente asociada</div>
        <v-card variant="outlined" class="mb-4">
          <v-card-text v-if="source" class="d-flex align-center ga-3">
            <v-icon
              :icon="source.type === 'file-source' ? 'mdi-file-document' : source.type === 'fingerprint-source' ? 'mdi-fingerprint' : 'mdi-web'"
              color="primary"
            />
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ source.friendly_name || source.name }}
              </div>
              <div class="text-caption text-grey">
                {{ source.type }} &bull; Prioridad: {{ source.priority ?? "-" }}
              </div>
            </div>
          </v-card-text>
          <v-card-text v-else-if="!loading" class="text-body-2 text-grey">
            Sin fuente asociada
          </v-card-text>
        </v-card>

        <!-- Update History -->
        <div class="text-subtitle-2 font-weight-bold mb-2">
          Historial de cambios
          <v-chip v-if="updateLogs.length" size="x-small" class="ml-2">
            {{ updateLogs.length }}
          </v-chip>
        </div>

        <div v-if="!loading && updateLogs.length === 0" class="text-center py-6 text-medium-emphasis">
          <v-icon size="40" color="grey">mdi-history</v-icon>
          <div class="mt-2 text-body-2">No hay cambios registrados</div>
        </div>

        <v-timeline v-else density="compact" side="end" truncate-line="both">
          <v-timeline-item
            v-for="log in updateLogs"
            :key="log.id"
            size="x-small"
            dot-color="primary"
          >
            <v-card variant="outlined" density="compact">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-bold">
                    {{ formatDate(log.created_at) }}
                  </span>
                  <v-chip
                    v-if="log.provider_source_logs"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                  >
                    {{ log.provider_source_logs.provider_sources?.friendly_name || log.provider_source_logs.provider_sources?.name || `Log #${log.provider_source_log_id}` }}
                  </v-chip>
                </div>

                <div v-if="log.provider_source_logs?.source_filename" class="text-caption text-grey mb-2">
                  {{ log.provider_source_logs.source_filename }}
                </div>

                <div
                  v-for="change in changedFields(log)"
                  :key="change.field"
                  class="d-flex align-center ga-2 text-body-2"
                >
                  <span class="text-grey">{{ change.field }}:</span>
                  <v-chip size="x-small" color="error" variant="tonal" label>
                    {{ change.oldValue }}
                  </v-chip>
                  <v-icon size="14" icon="mdi-arrow-right" />
                  <span class="text-caption text-grey-darken-1">(valor actual)</span>
                </div>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
