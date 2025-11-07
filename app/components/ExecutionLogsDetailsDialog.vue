<script>
export default {
  name: "ExecutionLogsDetailsDialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    sourceExecutionLog: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      copied: false,
    };
  },
  computed: {
    isOpen: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      },
    },
    formattedJson() {
      return JSON.stringify(this.sourceExecutionLog.metadata, null, 2);
    },
    highlightedJson() {
      return this.syntaxHighlight(this.formattedJson);
    },
  },
  methods: {
    syntaxHighlight(json) {
      json = json
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
          let cls = "json-number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "json-key";
            } else {
              cls = "json-string";
            }
          } else if (/true|false/.test(match)) {
            cls = "json-boolean";
          } else if (/null/.test(match)) {
            cls = "json-null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      );
    },
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.formattedJson);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (err) {
        console.error("Error al copiar:", err);
      }
    },
  },
};
</script>

<template>
  <v-dialog v-model="isOpen" max-width="900" scrollable>
    <v-card>
      <v-card-title
        class="d-flex justify-space-between align-center bg-primary"
      >
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-code-json</v-icon>
          <span class="text-h6">Metadata del Log</span>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn
            :color="copied ? 'success' : 'white'"
            :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
            variant="text"
            size="small"
            @click="copyToClipboard"
          >
            <v-icon>{{ copied ? "mdi-check" : "mdi-content-copy" }}</v-icon>
            <v-tooltip activator="parent" location="bottom">
              {{ copied ? "¡Copiado!" : "Copiar JSON" }}
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            color="white"
            @click="isOpen = false"
          />
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div class="json-container">
          <pre class="json-display pa-4" v-html="highlightedJson"></pre>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="bg-grey-lighten-4">
        <div class="text-caption text-grey-darken-1">
          <v-icon size="x-small" class="mr-1">mdi-information</v-icon>
          Secuencia: {{ sourceExecutionLog.sequence }} | Nivel:
          {{ sourceExecutionLog.level }}
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          @click="isOpen = false"
          prepend-icon="mdi-close"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.json-container {
  position: relative;
  max-height: 65vh;
  overflow: auto;
}

.json-display {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 0;
  font-family: "Fira Code", "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
  color: #2c3e50;
  tab-size: 2;
  letter-spacing: 0.02em;
}

/* Syntax Highlighting - Tema Claro */
.json-display :deep(.json-key) {
  color: #0055aa;
  font-weight: 600;
}

.json-display :deep(.json-string) {
  color: #008000;
}

.json-display :deep(.json-number) {
  color: #d73a49;
  font-weight: 500;
}

.json-display :deep(.json-boolean) {
  color: #c87000;
  font-weight: 600;
}

.json-display :deep(.json-null) {
  color: #9e9e9e;
  font-weight: 600;
  font-style: italic;
}

/* Tema oscuro */
.v-theme--dark .json-display {
  background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
  color: #d4d4d4;
}

.v-theme--dark .json-display :deep(.json-key) {
  color: #9cdcfe;
  font-weight: 600;
}

.v-theme--dark .json-display :deep(.json-string) {
  color: #ce9178;
}

.v-theme--dark .json-display :deep(.json-number) {
  color: #b5cea8;
  font-weight: 500;
}

.v-theme--dark .json-display :deep(.json-boolean) {
  color: #569cd6;
  font-weight: 600;
}

.v-theme--dark .json-display :deep(.json-null) {
  color: #808080;
  font-weight: 600;
  font-style: italic;
}

/* Scrollbar personalizado */
.json-container::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.json-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.json-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.json-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.v-theme--dark .json-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.v-theme--dark .json-container::-webkit-scrollbar-thumb {
  background: #555;
}

.v-theme--dark .json-container::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
