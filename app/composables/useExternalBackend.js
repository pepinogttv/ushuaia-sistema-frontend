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
          `HTTP ${response.status}: ${response.statusText}`,
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
          `HTTP ${response.status}: ${response.statusText}`,
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
      true,
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
      true,
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
      true,
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
      true,
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
      true,
    );
  };

  /**
   * Consulta el estado de un job de rollback en BullMQ
   * @param {string|number} jobId - ID del job de BullMQ
   * @returns {Promise<object>} - { found, jobId?, state?, progress?, failedReason? }
   */
  const getRollbackJobStatus = async (jobId) => {
    if (!jobId) {
      throw new Error("jobId es requerido");
    }

    return await request(`/api/sources/rollback-job/${jobId}`, {}, true);
  };

  /**
   * Sube un Excel y devuelve la lista de hojas (sin procesar filas)
   * @param {File} file - Archivo Excel
   * @returns {Promise<{filepath: string, worksheets: Array<{name: string, index: number}>}>}
   */
  const previewWorksheets = async (file) => {
    if (!file) throw new Error("file es requerido");

    const formData = new FormData();
    formData.append("file", file);

    const url = `${baseUrl}/api/sources/preview-worksheets`;

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
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return data.data || data;
  };

  /**
   * Analiza un archivo Excel y devuelve los fingerprints de las filas
   * @param {File|null} file - Archivo Excel a analizar (si es upload nuevo)
   * @param {object} [options] - { filepath, includedWorksheets } si ya se hizo preview
   * @returns {Promise<object>} - Resultados del análisis con fingerprints
   */
  const analyzeExcelFingerprint = async (file, options = {}) => {
    const { filepath, includedWorksheets } = options;

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("No se pudo obtener el token de autenticación");
    }

    const url = `${baseUrl}/api/sources/analyze-fingerprint`;

    let response;

    if (filepath) {
      // Use previously uploaded file by filepath
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filepath, includedWorksheets }),
      });
    } else if (file) {
      // Upload new file
      const formData = new FormData();
      formData.append("file", file);

      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
    } else {
      throw new Error("file o filepath es requerido");
    }

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
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return data.data || data;
  };

  /**
   * Valida un archivo Excel contra los fingerprints almacenados de un source
   * @param {string} sourceName - Nombre del source
   * @param {File} file - Archivo Excel a validar
   * @returns {Promise<{fileInfo, driftResult}>} - Resultado de la validación
   */
  const validateFingerprintUpload = async (sourceName, file) => {
    if (!sourceName) throw new Error("sourceName es requerido");
    if (!file) throw new Error("file es requerido");

    const formData = new FormData();
    formData.append("file", file);

    const url = `${baseUrl}/api/sources/${sourceName}/validate-upload`;

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
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return data.data || data;
  };

  /**
   * Ejecuta un source con un filepath específico (archivo ya subido)
   * @param {string} sourceName - Nombre del source
   * @param {string} filepath - Path del archivo en el servidor
   * @returns {Promise<object>}
   */
  const executeSourceWithFile = async (sourceName, filepath) => {
    if (!sourceName) throw new Error("sourceName es requerido");
    if (!filepath) throw new Error("filepath es requerido");

    return await request(
      `/api/sources/${sourceName}/execute`,
      {
        method: "POST",
        body: JSON.stringify({ filepath }),
      },
      true,
    );
  };

  /**
   * Clasifica fingerprints usando el agente IA (via backend proxy a n8n)
   * @param {object} fingerprints - Resultado del análisis de fingerprints
   * @returns {Promise<object>} - Clasificaciones del agente IA
   */
  const classifyFingerprint = async (fingerprints) => {
    if (!fingerprints) {
      throw new Error("fingerprints es requerido");
    }

    return await request(
      "/api/sources/classify-fingerprint",
      {
        method: "POST",
        body: JSON.stringify({ fingerprints }),
      },
      true,
    );
  };

  /**
   * Crea una nueva fuente basada en fingerprints
   * @param {object} params - { providerId, sourceName, friendlyName, fingerprintConfig }
   * @returns {Promise<object>} - La fuente creada
   */
  const createFingerprintSource = async ({
    providerId,
    sourceName,
    friendlyName,
    fingerprintConfig,
  }) => {
    return await request(
      "/api/sources/create-fingerprint-source",
      {
        method: "POST",
        body: JSON.stringify({
          providerId,
          sourceName,
          friendlyName,
          fingerprintConfig,
        }),
      },
      true,
    );
  };

  /**
   * Actualiza la prioridad de un source
   * @param {string} sourceId - UUID del source
   * @param {number} priority - Nueva prioridad (1 = máxima)
   * @returns {Promise<object>} - Source actualizado
   */
  const updateSourcePriority = async (sourceId, priority) => {
    if (!sourceId) throw new Error("sourceId es requerido");
    if (!priority) throw new Error("priority es requerido");

    return await request(
      `/api/sources/${sourceId}/priority`,
      {
        method: "PATCH",
        body: JSON.stringify({ priority }),
      },
      true,
    );
  };

  // ==================== CHAT ====================

  const chatGetConversations = async () => {
    return await request("/api/chat/conversations", { method: "GET" }, true);
  };

  const chatCreateConversation = async (title) => {
    return await request(
      "/api/chat/conversations",
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
      true,
    );
  };

  const chatGetMessages = async (conversationId) => {
    return await request(
      `/api/chat/conversations/${conversationId}/messages`,
      { method: "GET" },
      true,
    );
  };

  const chatDeleteConversation = async (id) => {
    return await request(
      `/api/chat/conversations/${id}`,
      { method: "DELETE" },
      true,
    );
  };

  /**
   * Envia un mensaje al chat y lee el stream SSE de respuesta
   * @param {string} conversationId - UUID de la conversacion
   * @param {string} message - Mensaje del usuario
   * @param {Function} onChunk - Callback llamado con cada chunk de texto { content }
   */
  const chatSendMessage = async (conversationId, message, onChunk) => {
    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("No se pudo obtener el token de autenticacion");
    }

    const response = await fetch(
      `${baseUrl}/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content || parsed.title) onChunk(parsed);
        } catch (e) {
          if (e.message !== "Unexpected end of JSON input") throw e;
        }
      }
    }
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
    getRollbackJobStatus,
    analyzeExcelFingerprint,

    // Fingerprint source
    previewWorksheets,
    classifyFingerprint,
    createFingerprintSource,
    validateFingerprintUpload,
    executeSourceWithFile,

    // Source priority
    updateSourcePriority,

    // Chat
    chatGetConversations,
    chatCreateConversation,
    chatGetMessages,
    chatDeleteConversation,
    chatSendMessage,

    // Propiedades útiles
    baseUrl,
  };
}
