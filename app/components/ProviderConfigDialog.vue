<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  providerName: {
    type: String,
    default: "",
  },
  providerId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const close = () => {
  dialogVisible.value = false;
};
</script>

<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Configuración del Proveedor</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form>
          <v-text-field
            label="Nombre del Proveedor"
            :model-value="providerName"
            variant="outlined"
            density="comfortable"
            readonly
            class="mb-4"
          />

          <v-text-field
            label="ID del Proveedor"
            :model-value="providerId"
            variant="outlined"
            density="comfortable"
            readonly
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" disabled>
          Guardar Cambios
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
