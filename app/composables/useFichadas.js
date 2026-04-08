/**
 * Composable para la feature de fichadas.
 * Maneja upload del TXT, procesamiento y descarga del Excel.
 */
export function useFichadas() {
  const config = useRuntimeConfig();
  const client = useSupabaseClient();
  const baseUrl = config.public.externalBackendUrl || "http://localhost:4001";

  async function getAuthHeaders() {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("No se pudo obtener el token de autenticación");
    }

    return { Authorization: `Bearer ${session.access_token}` };
  }

  /**
   * Sube el archivo TXT y obtiene metadata (legajos, rango de fechas).
   */
  async function uploadTxt(file) {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/fichadas/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || data.message || `HTTP ${response.status}`);
    }

    return data.data || data;
  }

  /**
   * Procesa las fichadas con filtros y devuelve datos para preview.
   */
  async function processFichadas({ filePath, fechaDesde, fechaHasta, legajos, feriados, vacaciones }) {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/fichadas/process`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath, fechaDesde, fechaHasta, legajos, feriados, vacaciones }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || data.message || `HTTP ${response.status}`);
    }

    return data.data || data;
  }

  /**
   * Descarga el Excel generado.
   */
  async function downloadExcel({ filePath, fechaDesde, fechaHasta, legajos, feriados, vacaciones }) {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/fichadas/download`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath, fechaDesde, fechaHasta, legajos, feriados, vacaciones }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.description || `HTTP ${response.status}`);
    }

    // Descargar como blob y crear link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichadas_${fechaDesde}_${fechaHasta}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return {
    uploadTxt,
    processFichadas,
    downloadExcel,
  };
}
