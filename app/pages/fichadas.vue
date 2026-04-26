
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

// Paso 2: Feriados y Marcas
const feriados = ref([]);
const fechasEnRango = ref([]);
const vacaciones = ref({}); // { legajo: { fecha: tipo } }
const vacacionesExpandido = ref(null);
const medioDiaMinutos = ref(285); // 4:45 default

// Context menu state
const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuLegajo = ref(null);
const menuFecha = ref(null);

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
  // Inicializar vacaciones vacías para cada legajo seleccionado
  const vac = {};
  for (const l of selectedLegajos.value) {
    vac[l] = {};
  }
  vacaciones.value = vac;
  vacacionesExpandido.value = null;
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
      vacaciones: vacaciones.value,
      medioDiaMinutos: medioDiaMinutos.value,
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
      vacaciones: vacaciones.value,
      medioDiaMinutos: medioDiaMinutos.value,
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
  vacaciones.value = {};
  vacacionesExpandido.value = null;
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

// Click izquierdo: toggle vacacion completa
function onChipClick(legajo, fecha) {
  const marcas = vacaciones.value[legajo] || {};
  if (marcas[fecha]) {
    delete marcas[fecha];
  } else {
    marcas[fecha] = "vacacion";
  }
  vacaciones.value[legajo] = { ...marcas };
}

// Click derecho: abrir context menu
function onChipRightClick(event, legajo, fecha) {
  event.preventDefault();
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuLegajo.value = legajo;
  menuFecha.value = fecha;
  showMenu.value = true;
}

// Seleccionar tipo desde context menu
function setMarca(tipo) {
  const legajo = menuLegajo.value;
  const fecha = menuFecha.value;
  if (!legajo || !fecha) return;
  const marcas = vacaciones.value[legajo] || {};
  marcas[fecha] = tipo;
  vacaciones.value[legajo] = { ...marcas };
  showMenu.value = false;
}

function quitarMarca() {
  const legajo = menuLegajo.value;
  const fecha = menuFecha.value;
  if (!legajo || !fecha) return;
  const marcas = vacaciones.value[legajo] || {};
  delete marcas[fecha];
  vacaciones.value[legajo] = { ...marcas };
  showMenu.value = false;
}

// Color y label para chips según tipo de marca
const TIPOS_VACACIONES = new Set(["vacacion", "vacacion_medio"]);
const TIPOS_ENFERMO = new Set(["enfermo_gaston", "enfermo_dario"]);
const TIPOS_TARDE_OK = new Set(["tarde_ok_gaston", "tarde_ok_dario"]);

function getChipColor(legajo, fecha) {
  const tipo = (vacaciones.value[legajo] || {})[fecha];
  if (!tipo) return "default";
  if (TIPOS_VACACIONES.has(tipo)) return "info";
  if (TIPOS_ENFERMO.has(tipo) || TIPOS_TARDE_OK.has(tipo)) return "purple";
  return "default";
}

function getChipVariant(legajo, fecha) {
  const tipo = (vacaciones.value[legajo] || {})[fecha];
  return tipo ? "flat" : "outlined";
}

function getChipSuffix(legajo, fecha) {
  const tipo = (vacaciones.value[legajo] || {})[fecha];
  if (tipo === "vacacion_medio") return " \u00BD";
  if (tipo === "enfermo_gaston") return " Enf.G";
  if (tipo === "enfermo_dario") return " Enf.D";
  if (tipo === "tarde_ok_gaston") return " T.OK G";
  if (tipo === "tarde_ok_dario") return " T.OK D";
  return "";
}

// Resumen de marcas para el title del expansion panel
function getMarcasResumen(legajo) {
  const marcas = vacaciones.value[legajo] || {};
  const tipos = Object.values(marcas);
  if (tipos.length === 0) return "";
  const vac = tipos.filter((t) => t === "vacacion").length;
  const medio = tipos.filter((t) => t === "vacacion_medio").length;
  const enf = tipos.filter((t) => TIPOS_ENFERMO.has(t)).length;
  const tok = tipos.filter((t) => TIPOS_TARDE_OK.has(t)).length;
  const parts = [];
  if (vac) parts.push(`${vac} vac`);
  if (medio) parts.push(`${medio} \u00BD`);
  if (enf) parts.push(`${enf} enf`);
  if (tok) parts.push(`${tok} t.ok`);
  return parts.join(", ");
}

function getNombreLegajo(legajo) {
  const found = uploadData.value?.legajos.find((l) => l.legajo === legajo);
  return found ? found.nombre : legajo;
}

// Computed: formato legible de medioDiaMinutos
const medioDiaLabel = computed(() => {
  const h = Math.floor(medioDiaMinutos.value / 60);
  const m = medioDiaMinutos.value % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
});

function toggleAllLegajos() {
  if (selectedLegajos.value.length === uploadData.value.legajos.length) {
    selectedLegajos.value = [];
  } else {
    selectedLegajos.value = uploadData.value.legajos.map((l) => l.legajo);
  }
}
</script>

<template>
  <v-container class="py-6" style="max-width: 1200px;">
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

        <!-- Action bar sticky -->
        <div
          v-if="(step === 1 && uploadData) || step === 2 || (step === 3 && previewData)"
          class="action-bar mb-4"
        >
          <template v-if="step === 1 && uploadData">
            <v-spacer />
            <v-btn color="primary" variant="flat" :loading="loading" @click="goToFeriados">
              Continuar
            </v-btn>
          </template>
          <template v-if="step === 2">
            <v-btn variant="text" @click="step = 1">Volver</v-btn>
            <v-spacer />
            <v-btn color="primary" variant="flat" :loading="loading" @click="goToPreview">
              Ver Preview
            </v-btn>
          </template>
          <template v-if="step === 3 && previewData">
            <v-btn variant="text" @click="step = 2">Volver a Feriados</v-btn>
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
          </template>
        </div>

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
            </v-card>
          </template>
        </template>

        <!-- PASO 2: Feriados y Vacaciones -->
        <template v-if="step === 2">
          <!-- Feriados -->
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
          </v-card>

          <!-- Marcas por empleado (vacaciones, autorizaciones) -->
          <v-card class="mb-4">
            <v-card-title class="text-subtitle-1">
              Marcas por empleado
            </v-card-title>
            <v-card-subtitle>
              Click = vacaciones. Click derecho = otras opciones (1/2, enfermo, tarde OK).
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex align-center ga-3 mb-4">
                <span class="text-caption text-grey">Medio d&iacute;a (L-V):</span>
                <v-text-field
                  v-model="medioDiaLabel"
                  density="compact"
                  variant="outlined"
                  style="max-width: 100px"
                  hide-details
                  readonly
                />
                <v-slider
                  v-model="medioDiaMinutos"
                  :min="180"
                  :max="420"
                  :step="15"
                  density="compact"
                  hide-details
                  style="max-width: 250px"
                  color="primary"
                />
              </div>
              <v-expansion-panels v-model="vacacionesExpandido">
                <v-expansion-panel
                  v-for="legajo in selectedLegajos"
                  :key="legajo"
                  :value="legajo"
                >
                  <v-expansion-panel-title>
                    <div class="d-flex align-center w-100">
                      <span>{{ legajo }} - {{ getNombreLegajo(legajo) }}</span>
                      <v-chip
                        v-if="getMarcasResumen(legajo)"
                        size="x-small"
                        color="info"
                        variant="tonal"
                        class="ml-2"
                      >
                        {{ getMarcasResumen(legajo) }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div class="d-flex flex-wrap ga-2">
                      <v-chip
                        v-for="f in fechasEnRango"
                        :key="f"
                        :color="getChipColor(legajo, f)"
                        :variant="getChipVariant(legajo, f)"
                        size="small"
                        @click="onChipClick(legajo, f)"
                        @contextmenu="onChipRightClick($event, legajo, f)"
                      >
                        {{ formatFechaLabel(f) }}{{ getChipSuffix(legajo, f) }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>

          <!-- Context menu -->
          <v-menu
            v-model="showMenu"
            :style="{ position: 'fixed', left: menuX + 'px', top: menuY + 'px' }"
            :target="[menuX, menuY]"
            location="end"
          >
            <v-list density="compact">
              <v-list-item @click="setMarca('vacacion')">
                <v-list-item-title>Vacaciones</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setMarca('vacacion_medio')">
                <v-list-item-title>Vacaciones &frac12;</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="setMarca('enfermo_gaston')">
                <v-list-item-title>Enfermo (Gaston)</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setMarca('enfermo_dario')">
                <v-list-item-title>Enfermo (Dario)</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="setMarca('tarde_ok_gaston')">
                <v-list-item-title>Tarde OK (Gaston)</v-list-item-title>
              </v-list-item>
              <v-list-item @click="setMarca('tarde_ok_dario')">
                <v-list-item-title>Tarde OK (Dario)</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="quitarMarca()">
                <v-list-item-title class="text-red">Quitar marca</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <!-- PASO 3: Preview y descarga -->
        <template v-if="step === 3 && previewData">
          <v-card v-for="emp in previewData" :key="emp.legajo" class="mb-4" variant="outlined">
            <div class="emp-header">
              <span class="emp-legajo">{{ emp.legajo }}</span>
              <span class="emp-nombre">{{ emp.nombre }}</span>
            </div>
            <div class="table-wrap">
              <table class="fichadas-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>DIA</th>
                    <template v-for="i in (emp.maxPares || 2)" :key="i">
                      <th>E{{ i }}</th>
                      <th>S{{ i }}</th>
                    </template>
                    <th>HN</th>
                    <th>EX</th>
                    <th class="th-obs">OBS</th>
                    <th>HORARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(fila, idx) in emp.filas"
                    :key="idx"
                    :class="{
                      'row-error': fila.incompleta || fila.ausenciaInjustificada,
                      'row-warn': fila.irregular || fila.anomalia,
                      'row-feriado': fila.feriado,
                      'row-vacaciones': fila.vacaciones,
                      'row-autorizacion': fila.autorizacion,
                      'row-descanso': (fila.descanso || fila.domingo) && !fila.anomalia,
                    }"
                  >
                    <td>{{ fila.fecha }}</td>
                    <td>{{ fila.dia }}</td>
                    <template v-for="i in (emp.maxPares || 2)" :key="i">
                      <td :class="{ 'cell-tarde': fila.slots?.[(i - 1) * 2]?.tarde }">
                        {{ fila.slots?.[(i - 1) * 2]?.hora || '' }}
                        <span v-if="fila.slots?.[(i - 1) * 2]?.real" class="cell-real"> ({{ fila.slots[(i - 1) * 2].real }})</span>
                      </td>
                      <td>{{ fila.slots?.[(i - 1) * 2 + 1]?.hora || '' }}</td>
                    </template>
                    <td class="cell-num">{{ fila.hn }}</td>
                    <td class="cell-num" :class="{ 'text-orange': fila.exExcesiva }">{{ fila.ex }}</td>
                    <td :class="{
                      'obs-error': fila.incompleta || fila.ausenciaInjustificada,
                      'obs-warn': fila.irregular || fila.anomalia,
                      'obs-feriado': fila.feriado,
                      'obs-vacaciones': fila.vacaciones,
                      'obs-autorizacion': fila.autorizacion,
                      'obs-descanso': (fila.descanso || fila.domingo) && !fila.anomalia,
                    }">
                      {{ fila.observacion }}
                    </td>
                    <td class="cell-horario">{{ fila.horario }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="foot-subtotal">
                    <td :colspan="2 + (emp.maxPares || 2) * 2">SUBTOTAL</td>
                    <td class="cell-num">{{ emp.subtotalHN }}</td>
                    <td class="cell-num">{{ emp.subtotalEX }}</td>
                    <td class="foot-extras">TOTAL EXTRAS 100%</td>
                    <td />
                  </tr>
                  <tr class="foot-total">
                    <td :colspan="2 + (emp.maxPares || 2) * 2">TOTAL HORAS</td>
                    <td class="cell-num">{{ emp.totalHoras }}</td>
                    <td colspan="3" />
                  </tr>
                  <tr class="foot-total">
                    <td :colspan="2 + (emp.maxPares || 2) * 2">LLEGADAS TARDE</td>
                    <td class="cell-num" :class="{ 'text-orange': emp.totalTardes > 0 }">{{ emp.totalTardes || 0 }}</td>
                    <td colspan="3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </v-card>
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
.action-bar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  min-height: 52px;
}

.emp-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #fafafa;
}
.emp-legajo {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.4px;
}
.emp-nombre {
  font-size: 0.9rem;
  font-weight: 600;
  color: #222;
}

.table-wrap {
  overflow-x: auto;
  max-width: 100%;
}

.fichadas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.fichadas-table thead th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.7rem;
  letter-spacing: 0.3px;
  color: #555;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}

.fichadas-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  white-space: nowrap;
  color: #333;
}

.fichadas-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.025);
}

.cell-num {
  font-weight: 500;
}
.cell-horario {
  color: #999;
  font-size: 0.72rem;
}
.cell-real {
  color: #999;
  font-size: 0.7rem;
}
.cell-tarde {
  color: #e65100;
  font-weight: 600;
}

/* Row backgrounds — más sutiles que los lighten-5 de Vuetify */
.row-error    { background: #fdecec; }
.row-warn     { background: #fff4e5; }
.row-feriado  { background: #e8f5e9; }
.row-vacaciones { background: #e3f2fd; }
.row-autorizacion { background: #f3e5f5; }
.row-descanso { background: #f0f0f0; color: #888; }

.row-error:hover    { background: #fbe0e0; }
.row-warn:hover     { background: #ffebd0; }
.row-feriado:hover  { background: #dcedde; }
.row-vacaciones:hover { background: #d4e9fa; }
.row-autorizacion:hover { background: #ecd9f0; }
.row-descanso:hover { background: #e6e6e6; }

/* OBS column colors */
.obs-error    { color: #c62828; font-weight: 600; }
.obs-warn     { color: #ef6c00; }
.obs-feriado  { color: #2e7d32; }
.obs-vacaciones { color: #1565c0; }
.obs-autorizacion { color: #6a1b9a; }
.obs-descanso { color: #888; }

/* tfoot */
.fichadas-table tfoot td {
  padding: 6px 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  font-weight: 600;
  white-space: nowrap;
}
.foot-subtotal { background: #f5f5f5; }
.foot-total td { background: #fafafa; }
.foot-extras { color: #c62828; font-weight: 700; }

.text-orange { color: #e65100; }
</style>
