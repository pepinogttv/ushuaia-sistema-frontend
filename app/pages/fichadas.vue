<script setup>
const { uploadTxt, processFichadas, downloadExcel } = useFichadas();

// Estado general
const step = ref(1);
const loading = ref(false);
const error = ref("");

// Paso 1: Upload
const uploadData = ref(null); // { filePath, legajos, fechaMin, fechaMax }
const fechaDesde = ref("");
const fechaHasta = ref("");
const selectedLegajos = ref([]);

// Paso 2: Feriados
const feriados = ref([]);
const fechasEnRango = ref([]);

// Paso 3: Preview
const previewData = ref(null);

// Handlers
async function handleFileSelected(files) {
  if (!files || files.length === 0) return;
  error.value = "";
  loading.value = true;

  try {
    const result = await uploadTxt(files[0]);
    uploadData.value = result;

    // Pre-fill date range with previous month
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-indexed
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    const mm = String(prevMonth + 1).padStart(2, "0");
    fechaDesde.value = `${prevYear}-${mm}-01`;
    fechaHasta.value = `${prevYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

    selectedLegajos.value = result.legajos.map((l) => l.legajo);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function handleFileError(msg) {
  error.value = msg;
}

function goToFeriados() {
  if (!fechaDesde.value || !fechaHasta.value) {
    error.value = "Selecciona un rango de fechas";
    return;
  }
  if (selectedLegajos.value.length === 0) {
    error.value = "Selecciona al menos un legajo";
    return;
  }
  error.value = "";

  // Generar lista de fechas en el rango
  const fechas = [];
  const current = new Date(fechaDesde.value + "T12:00:00");
  const end = new Date(fechaHasta.value + "T12:00:00");
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    fechas.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  fechasEnRango.value = fechas;
  feriados.value = [];
  step.value = 2;
}

async function goToPreview() {
  error.value = "";
  loading.value = true;

  try {
    const result = await processFichadas({
      filePath: uploadData.value.filePath,
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value,
      legajos: selectedLegajos.value,
      feriados: feriados.value,
    });
    previewData.value = result;
    step.value = 3;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleDownload() {
  loading.value = true;
  error.value = "";

  try {
    await downloadExcel({
      filePath: uploadData.value.filePath,
      fechaDesde: fechaDesde.value,
      fechaHasta: fechaHasta.value,
      legajos: selectedLegajos.value,
      feriados: feriados.value,
    });
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function resetAll() {
  step.value = 1;
  uploadData.value = null;
  fechaDesde.value = "";
  fechaHasta.value = "";
  selectedLegajos.value = [];
  feriados.value = [];
  fechasEnRango.value = [];
  previewData.value = null;
  error.value = "";
}

// Helpers
const diasSemana = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
function formatFechaLabel(fechaStr) {
  const d = new Date(fechaStr + "T12:00:00");
  const dia = diasSemana[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia} ${dd}/${mm}`;
}

function toggleAllLegajos() {
  if (selectedLegajos.value.length === uploadData.value.legajos.length) {
    selectedLegajos.value = [];
  } else {
    selectedLegajos.value = uploadData.value.legajos.map((l) => l.legajo);
  }
}
</script>

<template>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-icon icon="mdi-clock-check-outline" size="32" class="mr-3" color="primary" />
          <h1 class="text-h5 font-weight-bold">Fichadas</h1>
          <v-spacer />
          <v-btn v-if="step > 1" variant="text" prepend-icon="mdi-restart" @click="resetAll">
            Empezar de nuevo
          </v-btn>
        </div>

        <!-- Stepper indicator -->
        <v-stepper
          :model-value="step"
          alt-labels
          flat
          class="mb-6 bg-transparent elevation-0"
        >
          <v-stepper-header>
            <v-stepper-item :value="1" title="Subir archivo" />
            <v-divider />
            <v-stepper-item :value="2" title="Feriados" />
            <v-divider />
            <v-stepper-item :value="3" title="Preview y Descarga" />
          </v-stepper-header>
        </v-stepper>

        <!-- Error alert -->
        <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
          {{ error }}
        </v-alert>

        <!-- PASO 1: Upload y filtros -->
        <template v-if="step === 1">
          <v-card v-if="!uploadData" class="mb-4">
            <v-card-text>
              <FileDropZone
                :accept="['txt']"
                accept-label=".txt"
                :multiple="false"
                title="Arrastra el archivo de fichadas aquí"
                button-text="Seleccionar archivo TXT"
                :disabled="loading"
                @files-selected="handleFileSelected"
                @error="handleFileError"
              />
            </v-card-text>
          </v-card>

          <template v-if="uploadData">
            <v-card class="mb-4">
              <v-card-title class="text-subtitle-1">
                <v-icon icon="mdi-check-circle" color="success" class="mr-2" />
                Archivo cargado - {{ uploadData.totalRecords }} registros
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="fechaDesde"
                      label="Fecha desde"
                      type="date"
                      density="compact"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="fechaHasta"
                      label="Fecha hasta"
                      type="date"
                      density="compact"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex align-center mb-2">
                  <span class="text-subtitle-2 mr-2">Legajos</span>
                  <v-btn size="x-small" variant="text" @click="toggleAllLegajos">
                    {{ selectedLegajos.length === uploadData.legajos.length ? 'Deseleccionar todos' : 'Seleccionar todos' }}
                  </v-btn>
                </div>

                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="l in uploadData.legajos"
                    :key="l.legajo"
                    :color="selectedLegajos.includes(l.legajo) ? 'primary' : 'default'"
                    :variant="selectedLegajos.includes(l.legajo) ? 'flat' : 'outlined'"
                    size="small"
                    @click="
                      selectedLegajos.includes(l.legajo)
                        ? (selectedLegajos = selectedLegajos.filter((x) => x !== l.legajo))
                        : selectedLegajos.push(l.legajo)
                    "
                  >
                    {{ l.legajo }} - {{ l.nombre }}
                  </v-chip>
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn color="primary" variant="flat" :loading="loading" @click="goToFeriados">
                  Continuar
                </v-btn>
              </v-card-actions>
            </v-card>
          </template>
        </template>

        <!-- PASO 2: Feriados -->
        <template v-if="step === 2">
          <v-card class="mb-4">
            <v-card-title class="text-subtitle-1">
              Marcar feriados en el período {{ fechaDesde }} a {{ fechaHasta }}
            </v-card-title>
            <v-card-subtitle>
              Si no hubo feriados, simplemente continua.
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="f in fechasEnRango"
                  :key="f"
                  :color="feriados.includes(f) ? 'warning' : 'default'"
                  :variant="feriados.includes(f) ? 'flat' : 'outlined'"
                  size="small"
                  @click="
                    feriados.includes(f)
                      ? (feriados = feriados.filter((x) => x !== f))
                      : feriados.push(f)
                  "
                >
                  {{ formatFechaLabel(f) }}
                </v-chip>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" @click="step = 1">Volver</v-btn>
              <v-spacer />
              <v-btn color="primary" variant="flat" :loading="loading" @click="goToPreview">
                Ver Preview
              </v-btn>
            </v-card-actions>
          </v-card>
        </template>

        <!-- PASO 3: Preview y descarga -->
        <template v-if="step === 3 && previewData">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <span class="text-subtitle-1">Preview de Fichadas</span>
              <v-spacer />
              <v-btn
                color="success"
                variant="flat"
                prepend-icon="mdi-download"
                :loading="loading"
                @click="handleDownload"
              >
                Descargar Excel
              </v-btn>
            </v-card-title>
          </v-card>

          <v-card v-for="emp in previewData" :key="emp.legajo" class="mb-6">
            <v-card-title class="text-subtitle-2 py-2 bg-grey-lighten-4">
              {{ emp.legajo }} - {{ emp.nombre }}
            </v-card-title>
            <v-card-text class="pa-0">
              <v-table dense class="fichadas-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>DIA</th>
                    <th>E1</th>
                    <th>S1</th>
                    <th>E2</th>
                    <th>S2</th>
                    <th>HN</th>
                    <th>EX</th>
                    <th>OBS</th>
                    <th>HORARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(fila, idx) in emp.filas"
                    :key="idx"
                    :class="{
                      'bg-red-lighten-5': fila.incompleta,
                      'bg-green-lighten-5': fila.observacion === 'FERIADO',
                    }"
                  >
                    <td>{{ fila.fecha }}</td>
                    <td>{{ fila.dia }}</td>
                    <td>{{ fila.e1 }}</td>
                    <td>{{ fila.s1 }}</td>
                    <td>{{ fila.e2 }}</td>
                    <td>{{ fila.s2 }}</td>
                    <td class="font-weight-medium">{{ fila.hn }}</td>
                    <td class="font-weight-medium">{{ fila.ex }}</td>
                    <td :class="{ 'text-red': fila.incompleta, 'text-green': fila.observacion === 'FERIADO' }">
                      {{ fila.observacion }}
                    </td>
                    <td class="text-grey">{{ fila.horario }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-weight-bold bg-grey-lighten-4">
                    <td colspan="6" class="text-right">SUBTOTAL</td>
                    <td>{{ emp.subtotalHN }}</td>
                    <td>{{ emp.subtotalEX }}</td>
                    <td class="text-red font-weight-bold">TOTAL EXTRAS 100%</td>
                    <td />
                  </tr>
                  <tr class="font-weight-bold">
                    <td colspan="6" class="text-right">TOTAL HORAS</td>
                    <td>{{ emp.totalHoras }}</td>
                    <td colspan="3" />
                  </tr>
                </tfoot>
              </v-table>
            </v-card-text>
          </v-card>

          <div class="d-flex mb-6">
            <v-btn variant="text" @click="step = 2">Volver a Feriados</v-btn>
          </div>
        </template>

        <!-- Loading overlay -->
        <v-overlay :model-value="loading" class="align-center justify-center" persistent>
          <v-progress-circular indeterminate color="primary" size="64" />
        </v-overlay>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.fichadas-table th,
.fichadas-table td {
  font-size: 0.8rem !important;
  padding: 4px 8px !important;
  white-space: nowrap;
}
</style>
