<script setup>
const props = defineProps({
  providerId: {
    type: [String, Number],
    required: true,
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

const headers = [
  { title: "Código", key: "provider_product_id", sortable: true },
  { title: "Descripción", key: "description", sortable: true },
  { title: "USD", key: "price_usd", sortable: true, align: "end" },
  { title: "ARS", key: "price_ars", sortable: true, align: "end" },
  { title: "Unidad", key: "sales_unit", sortable: true, align: "end" },
  { title: "IVA", key: "iva", sortable: true, align: "end" },
  { title: "Discontinuado", key: "discontinued", sortable: true, align: "center" },
  { title: "Creado", key: "created_at", sortable: true },
  { title: "", key: "actions", sortable: false, width: 50 },
];

const selectedProduct = ref(null);

const fetchProducts = async () => {
  console.log("[ProviderProductsTable] fetchProducts called, providerId:", props.providerId);
  if (!props.providerId) {
    console.warn("[ProviderProductsTable] No providerId, skipping fetch");
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    const from = (page.value - 1) * pageSize;
    const to = from + pageSize - 1;
    console.log("[ProviderProductsTable] Fetching range:", from, "-", to, "page:", page.value);

    let query = client
      .from("provider_products")
      .select("*", { count: "exact" })
      .eq("provider_id", props.providerId);

    if (search.value.trim()) {
      const term = `%${search.value.trim()}%`;
      console.log("[ProviderProductsTable] Search filter:", term);
      query = query.or(
        `description.ilike.${term},provider_product_id.ilike.${term}`
      );
    }

    const { data, count, error: fetchError } = await query
      .order("description", { ascending: true })
      .range(from, to);

    console.log("[ProviderProductsTable] Response:", { data: data?.length, count, error: fetchError });

    if (fetchError) throw fetchError;

    products.value = data || [];
    totalCount.value = count || 0;
  } catch (err) {
    console.error("[ProviderProductsTable] Error:", err);
    error.value = err;
    products.value = [];
    totalCount.value = 0;
  } finally {
    loading.value = false;
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

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

onMounted(() => {
  fetchProducts();
});
</script>

<template>
  <div>
    <!-- Search -->
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="Buscar por código o descripción"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      class="mb-4"
      style="max-width: 450px"
      @input="onSearchInput"
      @click:clear="
        search = '';
        page = 1;
        fetchProducts();
      "
    />

    <!-- Error -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4">
      {{ error.message || error }}
    </v-alert>

    <!-- Table -->
    <v-data-table-server
      :headers="headers"
      :items="products"
      :items-length="totalCount"
      :loading="loading"
      :page="page"
      :items-per-page="pageSize"
      hover
      class="elevation-1 rounded-lg"
      @update:page="page = $event"
      :items-per-page-options="[{ value: pageSize, title: String(pageSize) }]"
    >
      <template #item.provider_product_id="{ item }">
        <v-chip size="small" label color="primary" variant="tonal">
          {{ item.provider_product_id }}
        </v-chip>
      </template>

      <template #item.price_usd="{ item }">
        {{ formatCurrency(item.price_usd, "U$D") }}
      </template>

      <template #item.price_ars="{ item }">
        {{ formatCurrency(item.price_ars, "$") }}
      </template>

      <template #item.sales_unit="{ item }">
        {{ item.sales_unit != null ? item.sales_unit : "-" }}
      </template>

      <template #item.iva="{ item }">
        {{ item.iva != null ? `${item.iva}%` : "-" }}
      </template>

      <template #item.discontinued="{ item }">
        <v-icon
          :icon="item.discontinued ? 'mdi-close-circle' : 'mdi-check-circle'"
          :color="item.discontinued ? 'error' : 'success'"
          size="20"
        />
      </template>

      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>

      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-eye"
          variant="text"
          size="small"
          @click="selectedProduct = item"
        />
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
