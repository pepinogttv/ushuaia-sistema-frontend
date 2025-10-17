<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  source: {
    type: Object,
    default: () => null,
  },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const reloading = ref(false);
const reload = () => {
  reloading.value = true;
  setTimeout(() => {
    reloading.value = false;
  }, 100);
};
</script>

<template>
  <v-navigation-drawer
    v-if="isOpen"
    v-model="isOpen"
    location="right"
    temporary
    width="800"
    class="source-details-drawer"
  >
    <div class="d-flex flex-column h-100">
      <!-- Header -->
      <div class="pa-4 border-b">
        <div class="d-flex align-center justify-space-between">
          <h2 class="text-h5 font-weight-bold">
            {{
              source?.friendly_name || source?.name || "Detalles de la Fuente"
            }}
          </h2>
          <div>
            <v-btn icon="mdi-reload" variant="text" @click="reload" />
            <v-btn icon="mdi-close" variant="text" @click="isOpen = false" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-grow-1 pa-6" v-if="!reloading">
        <SourcesFileSource
          v-if="source && source.type === 'file-source'"
          :source="source"
        />
        <SourcesWebScraperSource
          v-else-if="source && source.type === 'web-scraper-source'"
          :source="source"
        />
        <v-alert v-else-if="source" type="warning" variant="tonal">
          No hay un componente específico para el tipo "{{ source.type }}"
        </v-alert>
        <v-alert v-else type="info" variant="tonal">
          No hay información disponible
        </v-alert>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.source-details-drawer {
  z-index: 9999;
}
</style>
