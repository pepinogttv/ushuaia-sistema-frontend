/**
 * Composable para interactuar con el backend externo (Express server)
 * Centraliza las llamadas HTTP al chatbot-server
 */
export function useExternalBackend() {
  const config = useRuntimeConfig();
  const client = useSupabaseClient();

  // Base URL del backend externo
  const baseUrl = config.public.externalBackendUrl || "http://localhost:4001";

  /**
   * Realiza una petición HTTP al backend externo
   * @param {string} endpoint - Endpoint relativo (ej: '/api/llm/refresh/tenant123')
   * @param {object} options - Opciones de fetch (method, body, headers, etc.)
   * @param {boolean} withAuth - Si incluir token de autenticación
   */
  const request = async (endpoint, options = {}, withAuth = false) => {
    const url = `${baseUrl}${endpoint}`;

    // Headers por defecto
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    // Agregar autenticación si es requerida
    if (withAuth) {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("No se pudo obtener el token de autenticación");
        }

        defaultHeaders.Authorization = `Bearer ${session.access_token}`;
      } catch (error) {
        console.error("Error obteniendo sesión para autenticación:", error);
        throw error;
      }
    }

    // Combinar headers
    const headers = {
      ...defaultHeaders,
      ...options.headers,
    };

    // Realizar petición
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parsear respuesta
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Si no es JSON válido, usar el texto
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(
        data.error?.description ||
          data.message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Retornar data.data si existe (formato de respuesta estándar del backend), sino data
    return data.data || data;
  };

  // ==================== MÉTODOS ESPECÍFICOS ====================

  /**
   * Sube un archivo a un source específico
   * @param {string} sourceName - Nombre del source
   * @param {File} file - Archivo a subir
   * @returns {Promise<object>} - Información del archivo subido
   */
  const sourceUploadFile = async (sourceName, file) => {
    if (!sourceName) {
      throw new Error("sourceName es requerido");
    }
    if (!file) {
      throw new Error("file es requerido");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sourceName", sourceName);

    const url = `${baseUrl}/api/sources/${sourceName}/files`;

    // Obtener token de autenticación
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("No se pudo obtener el token de autenticación");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        // NO incluir Content-Type, el navegador lo establece automáticamente con boundary para FormData
      },
      body: formData,
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(
        data.error?.description ||
          data.message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data.data || data;
  };

  /**
   * Lista los archivos de un source específico
   * @param {string} sourceName - Nombre del source
   * @returns {Promise<object>} - Lista de archivos con formato { sourceName, files: [], count }
   */
  const sourceListFiles = async (sourceName) => {
    if (!sourceName) {
      throw new Error("sourceName es requerido");
    }

    return await request(
      `/api/sources/${sourceName}/files`,
      {
        method: "GET",
      },
      true
    );
  };

  /**
   * Elimina un archivo de un source específico
   * @param {string} sourceName - Nombre del source
   * @param {string} filename - Nombre del archivo a eliminar
   * @returns {Promise<object>} - Confirmación de eliminación
   */
  const sourceDeleteFile = async (sourceName, filename) => {
    if (!sourceName) {
      throw new Error("sourceName es requerido");
    }
    if (!filename) {
      throw new Error("filename es requerido");
    }

    return await request(
      `/api/sources/${sourceName}/files/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
      },
      true
    );
  };

  const executeSource = async (sourceName) => {
    if (!sourceName) {
      throw new Error("sourceName es requerido");
    }

    return await request(
      `/api/sources/${sourceName}/execute`,
      {
        method: "POST",
      },
      true
    );
  };

  /**
   * Cancela la ejecución de un source
   * @param {string} sourceName - Nombre del source
   * @returns {Promise<object>} - Estado del trabajo y información de cancelación
   */
  const cancelSourceExecution = async (sourceName) => {
    if (!sourceName) {
      throw new Error("sourceName es requerido");
    }

    return await request(
      `/api/sources/${sourceName}/cancel-execution`,
      {
        method: "POST",
      },
      true
    );
  };

  /**
   * Elimina un provider source log
   * @param {number|string} logId - ID del log a eliminar
   * @returns {Promise<object>} - Confirmación de eliminación
   */
  const deleteProviderSourceLog = async (logId) => {
    if (!logId) {
      throw new Error("logId es requerido");
    }

    return await request(
      `/api/sources/provider-source-logs/${logId}`,
      {
        method: "DELETE",
      },
      true
    );
  };

  return {
    // Método genérico
    request,

    // Métodos específicos para sources
    sourceUploadFile,
    sourceListFiles,
    sourceDeleteFile,
    executeSource,
    cancelSourceExecution,
    deleteProviderSourceLog,

    // Propiedades útiles
    baseUrl,
  };
}
