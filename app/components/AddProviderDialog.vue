<script setup>
const client = useSupabaseClient();

const dialog = defineModel({ type: Boolean, default: false });

const form = ref({
  name: "",
});

const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  if (!form.value.name.trim()) return;

  try {
    loading.value = true;
    error.value = null;

    const { error: insertError } = await client.from("providers").insert({
      name: form.value.name.trim(),
      legacy: false,
    });

    if (insertError) throw insertError;

    form.value = { name: "" };
    dialog.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  form.value = { name: "" };
  error.value = null;
  dialog.value = false;
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="500" persistent>
    <v-card class="dialog-card">
      <v-card-title class="dialog-header">
        <v-icon class="mr-3" color="white">mdi-plus-circle</v-icon>
        Agregar Proveedor
      </v-card-title>

      <v-card-text class="pa-6">
        <v-alert
          v-if="error"
          type="error"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="form.name"
            label="Nombre del proveedor"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-domain"
            :disabled="loading"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey"
          :disabled="loading"
          @click="handleClose"
        >
          Cancelar
        </v-btn>
        <v-btn
          variant="flat"
          color="primary"
          class="save-btn"
          :loading="loading"
          :disabled="!form.name.trim()"
          @click="handleSubmit"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  padding: 20px 24px;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid #eee;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 8px;
  font-weight: 600;
  text-transform: none;
}
</style>
