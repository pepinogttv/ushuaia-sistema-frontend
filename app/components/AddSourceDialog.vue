<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  providerId: { type: String, default: null },
  providerName: { type: String, default: null },
});

const emit = defineEmits(["update:modelValue", "source-created"]);

const {
  analyzeExcelFingerprint,
  classifyFingerprint,
  createFingerprintSource,
} = useExternalBackend();

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// ==================== STATE ====================

const step = ref(1);

// Step 1: Upload & Analyze (automatic)
const selectedFile = ref(null);
const isAnalyzing = ref(false);
const analyzeError = ref(null);
const fingerprintResult = ref(null);

// Step 2: AI Classification
const isClassifying = ref(false);
const classifyError = ref(null);
const aiClassifications = ref(null);

// Step 3: Column Mapping + Naming
const columnMappings = ref({});
const sourceFriendlyName = ref("");
const sourceNameInput = ref("");

// Step 4: Save
const isSaving = ref(false);
const saveError = ref(null);

// ==================== STEPS CONFIG ====================

const steps = [
  { num: 1, label: "Subir" },
  { num: 2, label: "Clasificar" },
  { num: 3, label: "Mapear" },
  { num: 4, label: "Guardar" },
];

// ==================== COMPUTED ====================

const enrichedFingerprints = computed(() => {
  if (!fingerprintResult.value?.fingerprints) return [];

  const classificationMap = new Map();
  if (Array.isArray(aiClassifications.value)) {
    for (const c of aiClassifications.value) {
      if (c.fingerprint) classificationMap.set(c.fingerprint, c);
    }
  }

  return fingerprintResult.value.fingerprints.map((fp) => ({
    ...fp,
    ai: classificationMap.get(fp.fingerprint) || null,
  }));
});

const productFingerprints = computed(() =>
  enrichedFingerprints.value.filter((fp) => fp.ai?.tipo === "producto"),
);

const otherFingerprints = computed(() =>
  enrichedFingerprints.value.filter((fp) => fp.ai?.tipo !== "producto"),
);

// Group by type: products first, rest alphabetical
const groupedFingerprints = computed(() => {
  const groups = {};
  for (const fp of enrichedFingerprints.value) {
    const tipo = fp.ai?.tipo || "sin clasificar";
    if (!groups[tipo]) groups[tipo] = [];
    groups[tipo].push(fp);
  }

  const tipos = Object.keys(groups);
  const products = tipos.filter((t) => t === "producto");
  const rest = tipos
    .filter((t) => t !== "producto")
    .sort((a, b) => a.localeCompare(b));

  return [...products, ...rest].map((tipo) => ({ tipo, items: groups[tipo] }));
});

const finalSourceName = computed(() => sourceNameInput.value.trim() || "");

const allMappingsValid = computed(() => {
  if (productFingerprints.value.length === 0) return false;
  return productFingerprints.value.every((fp) => {
    const m = columnMappings.value[fp.fingerprint];
    if (!m) return false;
    return (
      m.provider_product_id !== undefined &&
      m.description !== undefined &&
      (m.price_usd !== undefined || m.price_ars !== undefined)
    );
  });
});

const canProceed = computed(() => {
  switch (step.value) {
    case 1:
      return !!fingerprintResult.value;
    case 2:
      return !!aiClassifications.value && productFingerprints.value.length > 0;
    case 3:
      return (
        allMappingsValid.value &&
        sourceFriendlyName.value.trim() &&
        sourceNameInput.value.trim()
      );
    default:
      return false;
  }
});

// ==================== METHODS ====================

const close = () => {
  dialog.value = false;
  resetAll();
};

const resetAll = () => {
  step.value = 1;
  selectedFile.value = null;
  isAnalyzing.value = false;
  analyzeError.value = null;
  fingerprintResult.value = null;
  isClassifying.value = false;
  classifyError.value = null;
  aiClassifications.value = null;
  columnMappings.value = {};
  sourceFriendlyName.value = "";
  sourceNameInput.value = "";
  isSaving.value = false;
  saveError.value = null;
};

// Auto-analyze on file selection
const onFileChange = async (event) => {
  const files = event?.target?.files || event;
  const file = files?.[0] || files;
  if (!file) return;

  selectedFile.value = file;
  analyzeError.value = null;
  fingerprintResult.value = null;
  aiClassifications.value = null;
  columnMappings.value = {};

  // Auto-analyze immediately
  isAnalyzing.value = true;
  try {
    const result = await analyzeExcelFingerprint(file);
    fingerprintResult.value = result;

    // Pre-fill names
    if (!sourceFriendlyName.value) {
      const name = file.name?.replace(/\.(xlsx|xls)$/i, "") || "";
      sourceFriendlyName.value = `Lista Excel - ${name}`;
    }
    if (!sourceNameInput.value && props.providerName) {
      const slug = props.providerName.toLowerCase().replace(/\s+/g, "-");
      sourceNameInput.value = `${slug}.fingerprint-source.xlsx`;
    }
  } catch (err) {
    analyzeError.value = err.message || "Error al analizar el archivo";
  } finally {
    isAnalyzing.value = false;
  }
};

const classifyWithAI = async () => {
  if (!fingerprintResult.value) return;

  isClassifying.value = true;
  classifyError.value = null;
  aiClassifications.value = null;

  try {
    const result = await classifyFingerprint(fingerprintResult.value);
    aiClassifications.value = result.classifications || result;

    // Pre-populate column mappings from AI suggestions
    if (Array.isArray(aiClassifications.value)) {
      for (const classification of aiClassifications.value) {
        if (
          classification.tipo === "producto" &&
          classification.column_mapping_suggestion
        ) {
          const mapping = {};
          for (const [colIndex, suggestion] of Object.entries(
            classification.column_mapping_suggestion,
          )) {
            if (suggestion.field) {
              mapping[suggestion.field] = Number(colIndex);
            }
          }
          if (Object.keys(mapping).length > 0) {
            columnMappings.value[classification.fingerprint] = mapping;
          }
        }
      }
    }
  } catch (err) {
    classifyError.value = err.message || "Error al clasificar con IA";
  } finally {
    isClassifying.value = false;
  }
};

const saveSource = async () => {
  if (!allMappingsValid.value) return;
  isSaving.value = true;
  saveError.value = null;

  try {
    const productFps = productFingerprints.value.map((fp) => ({
      fingerprint: fp.fingerprint,
      tipo: "producto",
      confianza: fp.ai?.confianza || "media",
      column_mapping: columnMappings.value[fp.fingerprint],
    }));

    await createFingerprintSource({
      providerId: props.providerId,
      sourceName: finalSourceName.value,
      friendlyName: sourceFriendlyName.value.trim(),
      fingerprintConfig: {
        product_fingerprints: productFps,
        ignored_fingerprints: otherFingerprints.value.map(
          (fp) => fp.fingerprint,
        ),
        source_filename: selectedFile.value?.name || null,
      },
    });

    emit("source-created");
    close();
  } catch (err) {
    saveError.value = err.message || "Error al guardar la fuente";
  } finally {
    isSaving.value = false;
  }
};

const nextStep = () => {
  if (step.value < 4 && canProceed.value) step.value++;
};
const prevStep = () => {
  if (step.value > 1) step.value--;
};

// ==================== HELPERS ====================

const getTypeColor = (type) =>
  ({
    string: "blue",
    number: "green",
    price: "purple",
    date: "orange",
    boolean: "teal",
    email: "indigo",
    link: "cyan",
    empty: "grey",
  })[type] || "grey";

const getTypeLabel = (type) =>
  ({
    string: "Texto",
    number: "Num",
    price: "Precio",
    date: "Fecha",
    boolean: "Bool",
    email: "Email",
    link: "Link",
    empty: "Vacio",
  })[type] || type;

const getTipoColor = (tipo) =>
  ({
    producto: "success",
    encabezado: "info",
    categoria: "purple",
    vacio: "grey",
    error: "error",
    subtotal: "orange",
    nota: "brown",
  })[tipo] || "grey";

const getTipoIcon = (tipo) =>
  ({
    producto: "mdi-package-variant",
    encabezado: "mdi-format-header-1",
    categoria: "mdi-folder",
    vacio: "mdi-checkbox-blank-outline",
    error: "mdi-alert-circle",
    subtotal: "mdi-sigma",
    nota: "mdi-note-text",
  })[tipo] || "mdi-help";

const getConfianzaColor = (c) =>
  ({ alta: "success", media: "warning", baja: "error" })[c] || "grey";

const parseFingerprint = (fp) => fp.split("|");

const FIELD_LABELS = {
  provider_product_id: "Codigo",
  description: "Descripcion",
  price_usd: "USD",
  price_ars: "ARS",
  sales_unit: "Unidad",
  iva: "IVA",
};
</script>

<template>
  <v-dialog v-model="dialog" max-width="1100" persistent scrollable>
    <v-card class="d-flex flex-column" style="max-height: 90vh">
      <!-- Header + Stepper -->
      <div class="pa-5 pb-0">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <div class="text-h5 font-weight-bold">Agregar Fuente</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ providerName }}
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="close"
          />
        </div>

        <!-- Step indicator -->
        <div class="step-indicator mb-4">
          <div
            v-for="(s, i) in steps"
            :key="s.num"
            class="step-item"
            :class="{
              active: step === s.num,
              completed: step > s.num,
              upcoming: step < s.num,
            }"
          >
            <div class="step-connector" v-if="i > 0" />
            <div class="step-circle">
              <v-icon v-if="step > s.num" icon="mdi-check" size="14" />
              <span v-else class="text-caption font-weight-bold">{{
                s.num
              }}</span>
            </div>
            <span class="step-label text-caption">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Step Content -->
      <v-card-text
        class="flex-grow-1 overflow-y-auto pa-5"
        style="min-height: 400px"
      >
        <!-- ==================== STEP 1: Upload ==================== -->
        <div v-if="step === 1">
          <!-- File input that auto-analyzes -->
          <div
            v-if="!isAnalyzing && !fingerprintResult"
            class="text-center py-8"
          >
            <v-icon
              icon="mdi-file-excel"
              size="56"
              color="green-darken-2"
              class="mb-3"
            />
            <div class="text-h6 mb-1">Subi un archivo Excel</div>
            <div class="text-body-2 text-medium-emphasis mb-5">
              El sistema va a analizar la estructura automaticamente
            </div>
            <v-btn
              color="primary"
              variant="flat"
              size="large"
              @click="$refs.fileInput.click()"
            >
              <v-icon start>mdi-upload</v-icon>
              Seleccionar archivo
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="onFileChange"
            />
          </div>

          <!-- Analyzing state -->
          <div v-else-if="isAnalyzing" class="text-center py-12">
            <v-progress-circular
              indeterminate
              color="primary"
              size="56"
              width="4"
              class="mb-4"
            />
            <div class="text-h6 mb-1">Analizando estructura...</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedFile?.name }}
            </div>
          </div>

          <!-- Error -->
          <div v-else-if="analyzeError" class="text-center py-8">
            <v-icon
              icon="mdi-alert-circle"
              size="56"
              color="error"
              class="mb-3"
            />
            <div class="text-h6 mb-2">Error al analizar</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ analyzeError }}
            </div>
            <v-btn
              variant="outlined"
              @click="
                analyzeError = null;
                fingerprintResult = null;
                selectedFile = null;
              "
            >
              Intentar de nuevo
            </v-btn>
          </div>

          <!-- Results -->
          <div v-else-if="fingerprintResult">
            <div class="d-flex align-center ga-3 mb-5">
              <v-icon icon="mdi-check-circle" color="success" size="28" />
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ selectedFile?.name }}
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  Estructura analizada correctamente
                </div>
              </div>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="
                  fingerprintResult = null;
                  selectedFile = null;
                "
              >
                Cambiar archivo
              </v-btn>
            </div>

            <v-row dense>
              <v-col cols="4">
                <v-card variant="outlined" class="text-center pa-4">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ fingerprintResult.totalRowsAnalyzed.toLocaleString() }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Filas</div>
                </v-card>
              </v-col>
              <v-col cols="4">
                <v-card variant="outlined" class="text-center pa-4">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ fingerprintResult.uniqueFingerprints }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Patrones</div>
                </v-card>
              </v-col>
              <v-col cols="4">
                <v-card variant="outlined" class="text-center pa-4">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ fingerprintResult.worksheets?.length || 1 }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Hojas</div>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- ==================== STEP 2: AI Classification ==================== -->
        <div v-else-if="step === 2">
          <!-- Before classification -->
          <div
            v-if="!aiClassifications && !isClassifying && !classifyError"
            class="text-center py-8"
          >
            <v-icon icon="mdi-robot" size="56" color="secondary" class="mb-3" />
            <div class="text-h6 mb-1">Clasificacion con IA</div>
            <div
              class="text-body-2 text-medium-emphasis mb-5"
              style="max-width: 400px; margin: 0 auto"
            >
              La IA va a analizar los
              {{ fingerprintResult?.uniqueFingerprints || 0 }}
              patrones detectados y clasificarlos automaticamente
            </div>
            <v-btn
              color="primary"
              variant="flat"
              size="large"
              @click="classifyWithAI"
            >
              <v-icon start>mdi-robot</v-icon>
              Clasificar patrones
            </v-btn>
          </div>

          <!-- Classifying -->
          <div v-else-if="isClassifying" class="text-center py-12">
            <v-progress-circular
              indeterminate
              color="secondary"
              size="56"
              width="4"
              class="mb-4"
            />
            <div class="text-h6 mb-1">Clasificando patrones...</div>
            <div class="text-body-2 text-medium-emphasis">
              Esto puede tardar unos segundos
            </div>
          </div>

          <!-- Error -->
          <div
            v-else-if="classifyError && !aiClassifications"
            class="text-center py-8"
          >
            <v-icon
              icon="mdi-alert-circle"
              size="56"
              color="error"
              class="mb-3"
            />
            <div class="text-h6 mb-2">Error al clasificar</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ classifyError }}
            </div>
            <v-btn variant="outlined" @click="classifyError = null">
              Intentar de nuevo
            </v-btn>
          </div>

          <!-- Results -->
          <div v-else-if="aiClassifications">
            <!-- Summary -->
            <v-alert
              v-if="productFingerprints.length > 0"
              type="success"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              <strong>{{ productFingerprints.length }}</strong> patron(es) de
              producto identificados,
              <strong>{{ otherFingerprints.length }}</strong> ignorados
            </v-alert>
            <v-alert
              v-else
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              La IA no identifico ningun patron como producto. Revisa los
              resultados.
            </v-alert>

            <!-- Classification list grouped by type -->
            <div
              v-for="group in groupedFingerprints"
              :key="group.tipo"
              class="mb-4"
            >
              <!-- Group header -->
              <div class="d-flex align-center ga-2 mb-2">
                <v-chip
                  :color="getTipoColor(group.tipo)"
                  size="small"
                  variant="flat"
                >
                  <v-icon
                    :icon="getTipoIcon(group.tipo)"
                    start
                    size="x-small"
                  />
                  {{ group.tipo }}
                </v-chip>
                <span class="text-caption text-medium-emphasis">
                  {{ group.items.length }} patron(es)
                </span>
              </div>

              <!-- Items in group -->
              <div class="d-flex flex-column ga-2">
                <v-card
                  v-for="(fp, index) in group.items"
                  :key="index"
                  variant="outlined"
                  :class="{ 'border-primary': group.tipo === 'producto' }"
                >
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center ga-2 flex-wrap">
                      <!-- Confidence -->
                      <v-chip
                        v-if="fp.ai?.confianza"
                        :color="getConfianzaColor(fp.ai.confianza)"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ fp.ai.confianza }}
                      </v-chip>

                      <!-- Occurrences -->
                      <span class="text-body-2 text-medium-emphasis">
                        {{ fp.occurrences.toLocaleString() }} filas
                        <span class="text-caption">({{ fp.percentage }}%)</span>
                      </span>

                      <v-spacer />

                      <!-- Column types -->
                      <div class="d-flex ga-1 flex-wrap">
                        <v-chip
                          v-for="(type, ti) in parseFingerprint(
                            fp.fingerprint,
                          ).slice(0, 8)"
                          :key="ti"
                          :color="getTypeColor(type)"
                          size="x-small"
                          variant="tonal"
                        >
                          {{ getTypeLabel(type) }}
                        </v-chip>
                        <v-chip
                          v-if="parseFingerprint(fp.fingerprint).length > 8"
                          size="x-small"
                          variant="tonal"
                        >
                          +{{ parseFingerprint(fp.fingerprint).length - 8 }}
                        </v-chip>
                      </div>
                    </div>

                    <!-- Reason -->
                    <div
                      v-if="fp.ai?.razon"
                      class="text-caption text-medium-emphasis mt-2"
                    >
                      {{ fp.ai.razon }}
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== STEP 3: Column Mapping ==================== -->
        <div v-else-if="step === 3">
          <div class="text-body-2 text-medium-emphasis mb-4">
            Asigna que columna corresponde a cada campo. La IA ya sugirio un
            mapeo, editalo si hace falta.
          </div>

          <v-row dense class="mb-5">
            <v-col cols="6">
              <v-text-field
                v-model="sourceFriendlyName"
                label="Nombre visible"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-label"
                hint="Se muestra en la interfaz"
                persistent-hint
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="sourceNameInput"
                label="Identificador (source name)"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-identifier"
                hint="Identificador unico, sin espacios"
                persistent-hint
              />
            </v-col>
          </v-row>

          <div
            v-for="(fp, index) in productFingerprints"
            :key="fp.fingerprint"
            class="mb-6"
          >
            <div class="d-flex align-center ga-2 mb-2">
              <v-chip color="primary" size="small" label>
                Producto #{{ index + 1 }}
              </v-chip>
              <span class="text-body-2 text-medium-emphasis">
                {{ fp.occurrences.toLocaleString() }} filas ({{
                  fp.percentage
                }}%)
              </span>
            </div>

            <ColumnMappingEditor
              :fingerprint="fp"
              :ai-classification="fp.ai"
              v-model="columnMappings[fp.fingerprint]"
            />
          </div>
        </div>

        <!-- ==================== STEP 4: Confirm ==================== -->
        <div v-else-if="step === 4">
          <div class="text-body-2 text-medium-emphasis mb-4">
            Revisa el resumen y confirma para crear la fuente.
          </div>

          <v-card variant="outlined" class="mb-4">
            <v-list density="compact" class="pa-0">
              <v-list-item>
                <template #prepend
                  ><v-icon icon="mdi-label" color="primary"
                /></template>
                <v-list-item-title>{{ sourceFriendlyName }}</v-list-item-title>
                <v-list-item-subtitle>Nombre visible</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend
                  ><v-icon icon="mdi-identifier" color="primary"
                /></template>
                <v-list-item-title>
                  <code>{{ finalSourceName }}</code>
                </v-list-item-title>
                <v-list-item-subtitle>Identificador</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend
                  ><v-icon icon="mdi-domain" color="primary"
                /></template>
                <v-list-item-title>{{ providerName }}</v-list-item-title>
                <v-list-item-subtitle>Proveedor</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend
                  ><v-icon icon="mdi-file-excel" color="primary"
                /></template>
                <v-list-item-title>{{ selectedFile?.name }}</v-list-item-title>
                <v-list-item-subtitle>Archivo base</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Mapping summary per product fingerprint -->
          <div
            v-for="(fp, index) in productFingerprints"
            :key="fp.fingerprint"
            class="mb-3"
          >
            <div class="text-body-2 font-weight-medium mb-1">
              Producto #{{ index + 1 }}
              <span class="text-medium-emphasis font-weight-regular">
                - {{ fp.occurrences }} filas
              </span>
            </div>
            <div class="d-flex ga-1 flex-wrap">
              <v-chip
                v-for="(colIndex, field) in columnMappings[fp.fingerprint]"
                :key="field"
                size="small"
                variant="tonal"
                color="primary"
                label
              >
                Col {{ colIndex + 1 }} = {{ FIELD_LABELS[field] || field }}
              </v-chip>
            </div>
          </div>

          <v-alert
            v-if="saveError"
            type="error"
            class="mt-4"
            closable
            @click:close="saveError = null"
          >
            {{ saveError }}
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Footer -->
      <v-card-actions class="pa-4">
        <v-btn variant="text" color="grey" @click="close">Cancelar</v-btn>
        <v-spacer />
        <v-btn
          v-if="step > 1"
          variant="text"
          @click="prevStep"
          :disabled="isSaving"
        >
          <v-icon start>mdi-arrow-left</v-icon>
          Anterior
        </v-btn>
        <v-btn
          v-if="step < 4"
          color="primary"
          variant="flat"
          @click="nextStep"
          :disabled="!canProceed"
        >
          Siguiente
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          @click="saveSource"
          :loading="isSaving"
          :disabled="!allMappingsValid || isSaving"
        >
          <v-icon start>mdi-content-save</v-icon>
          Crear Fuente
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-item:first-child {
  flex: 0 0 auto;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: rgba(var(--v-border-color), 0.3);
  margin: 0 8px;
  min-width: 20px;
}

.step-item.completed .step-connector {
  background: rgb(var(--v-theme-primary));
}

.step-item.active .step-connector {
  background: rgb(var(--v-theme-primary));
}

.step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  transition: all 0.2s ease;
}

.step-item.completed .step-circle {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.step-item.active .step-circle {
  background: rgb(var(--v-theme-primary));
  color: white;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2);
}

.step-item.upcoming .step-circle {
  background: rgba(var(--v-border-color), 0.15);
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.step-label {
  white-space: nowrap;
}

.step-item.upcoming .step-label {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.step-item.active .step-label {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.border-primary {
  border-color: rgb(var(--v-theme-primary)) !important;
}
</style>
