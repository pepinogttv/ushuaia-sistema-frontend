<script setup>
const props = defineProps({
  /** The fingerprint object with fingerprint string, examples, etc. */
  fingerprint: {
    type: Object,
    required: true,
  },
  /** The AI classification for this fingerprint (optional) */
  aiClassification: {
    type: Object,
    default: null,
  },
  /** Current column mapping (v-model) */
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue"]);

// Available fields to map
const MAPPABLE_FIELDS = [
  {
    value: null,
    title: "(ignorar)",
    icon: "mdi-close-circle-outline",
    color: "grey",
  },
  {
    value: "provider_product_id",
    title: "Codigo Producto",
    icon: "mdi-barcode",
    color: "blue",
    required: true,
  },
  {
    value: "description",
    title: "Descripcion",
    icon: "mdi-text",
    color: "teal",
    required: true,
  },
  {
    value: "price_usd",
    title: "Precio USD",
    icon: "mdi-currency-usd",
    color: "green",
  },
  {
    value: "price_ars",
    title: "Precio ARS",
    icon: "mdi-cash",
    color: "purple",
  },
  {
    value: "sales_unit",
    title: "Unidad de Venta",
    icon: "mdi-package-variant",
    color: "orange",
  },
  { value: "iva", title: "IVA", icon: "mdi-percent", color: "red" },
];

// Parse fingerprint types
const fingerprintTypes = computed(() =>
  props.fingerprint.fingerprint.split("|"),
);

// Get example values for each column from the first example
const exampleValues = computed(() => {
  if (!props.fingerprint.examples?.length) return [];
  return props.fingerprint.examples[0].values || [];
});

// Current mapping as reactive - inverted: { columnIndex: field }
const columnAssignments = computed(() => {
  const assignments = {};
  if (props.modelValue) {
    for (const [field, colIndex] of Object.entries(props.modelValue)) {
      assignments[colIndex] = field;
    }
  }
  return assignments;
});

// When the user changes a column assignment
const onColumnAssign = (columnIndex, field) => {
  const newMapping = { ...props.modelValue };

  // Remove any previous assignment for this column
  for (const [existingField, existingCol] of Object.entries(newMapping)) {
    if (existingCol === columnIndex) {
      delete newMapping[existingField];
    }
  }

  // Remove any previous column assigned to this field (a field can only be mapped once)
  if (field) {
    delete newMapping[field];
    newMapping[field] = columnIndex;
  }

  emit("update:modelValue", newMapping);
};

// Get the field assigned to a column
const getAssignedField = (columnIndex) => {
  return columnAssignments.value[columnIndex] || null;
};

// Check which fields are already used
const usedFields = computed(() => {
  return new Set(Object.keys(props.modelValue || {}));
});

// Get available options for a specific column (disable already-used fields)
const getFieldOptions = (columnIndex) => {
  const currentField = getAssignedField(columnIndex);
  return MAPPABLE_FIELDS.map((f) => ({
    ...f,
    disabled:
      f.value && f.value !== currentField && usedFields.value.has(f.value),
  }));
};

// Validation
const validation = computed(() => {
  const mapping = props.modelValue || {};
  const errors = [];

  if (!mapping.provider_product_id && mapping.provider_product_id !== 0) {
    errors.push("Falta mapear: Codigo Producto");
  }
  if (!mapping.description && mapping.description !== 0) {
    errors.push("Falta mapear: Descripcion");
  }
  if (
    !mapping.price_usd &&
    mapping.price_usd !== 0 &&
    !mapping.price_ars &&
    mapping.price_ars !== 0
  ) {
    errors.push("Falta mapear al menos un precio (USD o ARS)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
});

// Type display helpers
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

const getTypeLabel = (type) => {
  const labels = {
    string: "Texto",
    number: "Numero",
    price: "Precio",
    date: "Fecha",
    boolean: "Si/No",
    email: "Email",
    link: "Enlace",
    empty: "Vacio",
  };
  return labels[type] || type;
};

// Expose validation for parent
defineExpose({ validation });
</script>

<template>
  <div>
    <!-- Validation alerts -->
    <v-alert
      v-if="!validation.isValid"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      <div class="text-body-2">
        <div v-for="error in validation.errors" :key="error">
          {{ error }}
        </div>
      </div>
    </v-alert>

    <v-alert
      v-else
      type="success"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      Mapeo completo - todos los campos requeridos estan asignados
    </v-alert>

    <!-- Column mapping table -->
    <v-table density="compact" class="rounded-lg column-mapping-table">
      <thead>
        <tr>
          <th style="width: 50px">#</th>
          <th style="width: 100px">Tipo</th>
          <th style="width: 220px">Valor de ejemplo</th>
          <th>Asignar a campo</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(type, index) in fingerprintTypes"
          :key="index"
          :class="{
            'mapped-row': getAssignedField(index),
            'empty-row': type === 'empty',
          }"
        >
          <!-- Column index -->
          <td>
            <v-chip size="x-small" label variant="flat" color="surface-variant">
              {{ index + 1 }}
            </v-chip>
          </td>

          <!-- Detected type -->
          <td>
            <v-chip
              :color="getTypeColor(type)"
              size="small"
              variant="flat"
              label
            >
              {{ getTypeLabel(type) }}
            </v-chip>
          </td>

          <!-- Example value -->
          <td>
            <span class="example-value text-body-2">
              {{
                exampleValues[index] === "" || exampleValues[index] == null
                  ? "(vacio)"
                  : exampleValues[index]
              }}
            </span>
          </td>

          <!-- Field assignment dropdown -->
          <td>
            <v-select
              :model-value="getAssignedField(index)"
              :items="getFieldOptions(index)"
              item-value="value"
              item-title="title"
              density="compact"
              variant="outlined"
              hide-details
              :clearable="!!getAssignedField(index)"
              placeholder="(ignorar)"
              class="field-select"
              @update:model-value="(val) => onColumnAssign(index, val)"
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps" :disabled="item.raw.disabled">
                  <template #prepend>
                    <v-icon
                      :icon="item.raw.icon"
                      :color="
                        item.raw.disabled ? 'grey-lighten-1' : item.raw.color
                      "
                      size="small"
                    />
                  </template>
                  <template #append>
                    <v-chip
                      v-if="item.raw.required"
                      size="x-small"
                      color="error"
                      variant="tonal"
                    >
                      req
                    </v-chip>
                  </template>
                </v-list-item>
              </template>

              <template #selection="{ item }">
                <div class="d-flex align-center ga-2">
                  <v-icon
                    :icon="item.raw.icon"
                    :color="item.raw.color"
                    size="small"
                  />
                  <span>{{ item.title }}</span>
                </div>
              </template>
            </v-select>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
.column-mapping-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.mapped-row {
  background: rgba(var(--v-theme-primary), 0.04);
}

.empty-row {
  opacity: 0.5;
}

.example-value {
  font-family: "Monaco", "Consolas", monospace;
  font-size: 12px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.field-select {
  max-width: 250px;
}
</style>
