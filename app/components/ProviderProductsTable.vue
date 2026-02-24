<script setup>
const props = defineProps({
  providerId: {
    type: [String, Number],
    required: true,
  },
  sources: {
    type: Array,
    default: () => [],
  },
});

const client = useSupabaseClient();

const products = ref([]);
const totalCount = ref(0);
const loading = ref(false);
const error = ref(null);
const search = ref("");
const page = ref(1);
const pageSize = 50;

// Filter mode: "merged" | "all" | "<source-uuid>"
const filterMode = ref("merged");

// Status filter: "all" | "active" | "discontinued"
const statusFilter = ref("all");

// Expanded rows (merged mode)
const expanded = ref([]);
const expandedData = ref({});
const expandLoading = ref({});

const sourceFilterOptions = computed(() => {
  const options = [
    { title: "Excel (resultado final)", value: "merged" },
    { title: "Todas (1xFuente)", value: "all" },
  ];

  if (props.sources.length > 0) {
    for (const s of props.sources) {
      options.push({
        title: s.friendly_name || s.name,
        value: s.id,
      });
    }
  }

  return options;
});

const isMergedMode = computed(() => filterMode.value === "merged");
const isAllMode = computed(() => filterMode.value === "all");
const isSourceMode = computed(() => !isMergedMode.value && !isAllMode.value);

const headers = computed(() => {
  const base = [
    { title: "Código", key: "provider_product_id", sortable: true },
    { title: "Descripción", key: "description", sortable: true },
    { title: "Precio", key: "price", sortable: false, align: "end" },
    { title: "Unidad", key: "sales_unit", sortable: true, align: "end" },
    { title: "IVA", key: "iva", sortable: true, align: "end" },
  ];

  if (isMergedMode.value) {
    base.push({ title: "Fuente", key: "source_friendly_name", sortable: false });
    base.push({ title: "Fuentes", key: "source_count", sortable: true, align: "center" });
  } else if (isAllMode.value) {
    base.push({ title: "Fuente", key: "source_name", sortable: false });
  }

  base.push(
    { title: "Creado", key: "created_at", sortable: true },
  );

  return base;
});

const selectedProduct = ref(null);

const sourcesById = computed(() => {
  const map = {};
  for (const s of props.sources) {
    map[s.id] = s;
  }
  return map;
});

const fetchProducts = async () => {
  if (!props.providerId) return;

  try {
    loading.value = true;
    error.value = null;

    const from = (page.value - 1) * pageSize;
    const to = from + pageSize - 1;

    const table = isMergedMode.value ? "merged_provider_products" : "provider_products";

    let query = client
      .from(table)
      .select("*", { count: "exact" })
      .eq("provider_id", props.providerId);

    if (isSourceMode.value) {
      query = query.eq("provider_source_id", filterMode.value);
    }

    if (statusFilter.value === "discontinued") {
      query = query.eq("discontinued", true);
    } else if (statusFilter.value === "active") {
      query = query.eq("discontinued", false);
    }

    if (search.value.trim()) {
      const term = `%${search.value.trim()}%`;
      query = query.or(
        `description.ilike.${term},provider_product_id.ilike.${term}`
      );
    }

    const { data, count, error: fetchError } = await query
      .order("description", { ascending: true })
      .range(from, to);

    if (fetchError) throw fetchError;

    products.value = data || [];
    totalCount.value = count || 0;

    // Clear expanded state on new fetch
    expanded.value = [];
    expandedData.value = {};
  } catch (err) {
    console.error("[ProviderProductsTable] Error:", err);
    error.value = err;
    products.value = [];
    totalCount.value = 0;
  } finally {
    loading.value = false;
  }
};

const toggleExpand = async (productId) => {
  const idx = expanded.value.indexOf(productId);

  if (idx > -1) {
    expanded.value = expanded.value.filter((id) => id !== productId);
    return;
  }

  expanded.value = [...expanded.value, productId];

  if (expandedData.value[productId]) return;

  try {
    expandLoading.value = { ...expandLoading.value, [productId]: true };

    const { data, error: fetchError } = await client
      .from("provider_products")
      .select("*")
      .eq("provider_id", props.providerId)
      .eq("provider_product_id", productId);

    if (fetchError) throw fetchError;

    expandedData.value = { ...expandedData.value, [productId]: data || [] };
  } catch (err) {
    console.error("[ProviderProductsTable] Error fetching source details:", err);
    expandedData.value = { ...expandedData.value, [productId]: [] };
  } finally {
    expandLoading.value = { ...expandLoading.value, [productId]: false };
  }
};

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));

const formatCurrency = (value, currency) => {
  if (value == null) return "-";
  return `${currency} ${Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPrice = (item) => {
  if (item.price_usd != null) return formatCurrency(item.price_usd, "USD");
  if (item.price_ars != null) return formatCurrency(item.price_ars, "ARS");
  return "-";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const truncate = (str, max = 20) => {
  if (!str || str.length <= max) return str;
  return str.slice(0, max) + "...";
};

const getSourceName = (sourceId) => {
  const source = sourcesById.value[sourceId];
  return source ? (source.friendly_name || source.name) : "-";
};

let searchTimeout = null;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchProducts();
  }, 400);
};

watch(page, () => {
  fetchProducts();
});

watch(filterMode, () => {
  page.value = 1;
  expanded.value = [];
  expandedData.value = {};
  fetchProducts();
});

watch(statusFilter, () => {
  page.value = 1;
  fetchProducts();
});

onMounted(() => {
  fetchProducts();
});
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="d-flex align-center ga-3 mb-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Buscar por código o descripción"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width: 400px"
        @input="onSearchInput"
        @click:clear="
          search = '';
          page = 1;
          fetchProducts();
        "
      />

      <v-select
        v-if="sources.length > 1"
        v-model="filterMode"
        :items="sourceFilterOptions"
        label="Vista"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 300px"
      />

      <v-btn-toggle
        v-model="statusFilter"
        mandatory
        density="compact"
        variant="outlined"
        divided
        color="primary"
      >
        <v-btn value="all" size="small">Todos</v-btn>
        <v-btn value="active" size="small">Activos</v-btn>
        <v-btn value="discontinued" size="small">Discontinuados</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Error -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4">
      {{ error.message || error }}
    </v-alert>

    <!-- Table -->
    <v-data-table-server
      v-model:expanded="expanded"
      :headers="headers"
      :items="products"
      :items-length="totalCount"
      :loading="loading"
      :page="page"
      :items-per-page="pageSize"
      item-value="provider_product_id"
      hover
      class="elevation-1 rounded-lg"
      @update:page="page = $event"
      :items-per-page-options="[{ value: pageSize, title: String(pageSize) }]"
      :row-props="({ item }) => item.discontinued ? { class: 'discontinued-row' } : {}"
    >
      <template #item.provider_product_id="{ item }">
        <div class="d-flex align-center ga-1">
          <span class="code-text">{{ item.provider_product_id }}</span>
          <v-btn
            icon="mdi-eye-outline"
            variant="text"
            size="x-small"
            density="compact"
            class="detail-btn"
            @click="selectedProduct = item"
          />
        </div>
      </template>

      <template #item.price="{ item }">
        {{ formatPrice(item) }}
      </template>

      <template #item.sales_unit="{ item }">
        {{ item.sales_unit != null ? item.sales_unit : "-" }}
      </template>

      <template #item.iva="{ item }">
        {{ item.iva != null ? `${item.iva}%` : "-" }}
      </template>

      <template #item.source_friendly_name="{ item }">
        <v-chip size="x-small" variant="tonal" :title="item.source_friendly_name">
          {{ truncate(item.source_friendly_name) || "-" }}
        </v-chip>
      </template>

      <template #item.source_count="{ item }">
        <v-chip
          v-if="item.source_count > 1"
          size="x-small"
          variant="elevated"
          color="amber-darken-2"
          class="expand-chip"
          @click.stop="toggleExpand(item.provider_product_id)"
        >
          <v-icon start size="12">
            {{ expanded.includes(item.provider_product_id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
          {{ item.source_count }}
        </v-chip>
        <v-chip
          v-else
          size="x-small"
          variant="elevated"
          color="blue-grey-lighten-1"
        >
          {{ item.source_count }}
        </v-chip>
      </template>

      <template #item.source_name="{ item }">
        <v-chip size="x-small" variant="tonal" :title="getSourceName(item.provider_source_id)">
          {{ truncate(getSourceName(item.provider_source_id)) }}
        </v-chip>
      </template>

      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>

      <!-- Expanded row: per-source breakdown -->
      <template #expanded-row="{ columns, item }">
        <tr class="expanded-row">
          <td :colspan="columns.length" class="pa-0">
            <div class="expanded-content pa-3">
              <div v-if="expandLoading[item.provider_product_id]" class="text-center pa-3">
                <v-progress-circular indeterminate size="20" width="2" />
              </div>
              <v-table v-else-if="expandedData[item.provider_product_id]?.length" density="compact" class="expanded-table">
                <thead>
                  <tr>
                    <th>Fuente</th>
                    <th class="text-end">Precio</th>
                    <th class="text-end">Unidad</th>
                    <th class="text-end">IVA</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in expandedData[item.provider_product_id]" :key="row.internal_id">
                    <td>
                      <v-chip size="x-small" variant="tonal" :title="getSourceName(row.provider_source_id)">
                        {{ truncate(getSourceName(row.provider_source_id)) }}
                      </v-chip>
                    </td>
                    <td class="text-end">{{ formatPrice(row) }}</td>
                    <td class="text-end">{{ row.sales_unit != null ? row.sales_unit : "-" }}</td>
                    <td class="text-end">{{ row.iva != null ? `${row.iva}%` : "-" }}</td>
                    <td class="text-caption">{{ row.description || "-" }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </td>
        </tr>
      </template>

      <template #no-data>
        <div class="text-center py-6 text-medium-emphasis">
          <v-icon size="48" color="grey">mdi-package-variant-closed</v-icon>
          <div class="mt-2">No hay productos para este proveedor</div>
        </div>
      </template>
    </v-data-table-server>

    <!-- Pagination info -->
    <div
      v-if="totalCount > 0"
      class="d-flex align-center justify-space-between mt-3 text-body-2 text-grey"
    >
      <span>
        Mostrando {{ (page - 1) * pageSize + 1 }}-{{
          Math.min(page * pageSize, totalCount)
        }}
        de {{ totalCount }} productos
      </span>
      <span>Página {{ page }} de {{ totalPages }}</span>
    </div>
    <!-- Detail Dialog -->
    <ProviderProductDetailDialog
      :product="selectedProduct"
      @close="selectedProduct = null"
    />
  </div>
</template>

<style scoped>
.code-text {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  user-select: text;
}

.detail-btn {
  opacity: 0.4;
}

.detail-btn:hover {
  opacity: 1;
}

.expand-chip {
  cursor: pointer;
}

.expanded-row {
  background: #f8f9fa !important;
}

.expanded-content {
  border-left: 3px solid #667eea;
  background: #f8f9fa;
}

.expanded-table {
  background: transparent !important;
}
</style>

<style>
.discontinued-row {
  background-color: rgba(255, 193, 7, 0.08) !important;
}

.discontinued-row td {
  color: #9e8600 !important;
  opacity: 0.85;
}
</style>
