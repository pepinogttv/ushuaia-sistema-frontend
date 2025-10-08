<script setup>
const props = defineProps({
  source: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="web-scraper-source-content">
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-h6">
        <v-icon icon="mdi-web" class="mr-2" color="primary" />
        Fuente Web Scraper
      </v-card-title>
      <v-card-text>
        <v-list dense>
          <v-list-item>
            <v-list-item-title class="text-caption text-grey">Nombre</v-list-item-title>
            <v-list-item-subtitle class="text-body-1">{{ source.friendly_name || source.name }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <v-list-item-title class="text-caption text-grey">Tipo</v-list-item-title>
            <v-list-item-subtitle class="text-body-1">{{ source.type }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <v-list-item-title class="text-caption text-grey">ID</v-list-item-title>
            <v-list-item-subtitle class="text-body-1">{{ source.id }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal">
      Este source obtiene datos mediante web scraping.
    </v-alert>
  </div>
</template>

