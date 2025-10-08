<script setup>
const props = defineProps({
  conversationId: {
    type: String,
    required: true,
  }
})

const client = useSupabaseClient()
const user = useSupabaseUser()

// ==================== ESTADO REACTIVO ====================

// Estado principal
const pendingMessages = ref([])
const pending = ref(true)
const error = ref(null)

// Estado del tenant
const tenant = ref(null)
const tenantSchema = ref(null)

// Realtime channel
let realtimeChannel = null

// ==================== COMPUTEDS ====================

const isLoading = computed(() => pending.value)

const hasPendingMessages = computed(() => pendingMessages.value.length > 0)

const sortedMessages = computed(() => 
  [...pendingMessages.value].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  )
)

const messagesCount = computed(() => pendingMessages.value.length)

// ==================== FUNCIONES PRIVADAS ====================

const fetchTenant = async () => {
  if (!user.value?.email) {
    throw new Error('Usuario no autenticado')
  }

  const { data: tenantData, error: tenantError } = await client
    .from('tenants')
    .select('schema_name, name, status')
    .eq('email', user.value.email)
    .eq('status', 'active')
    .single()

  if (tenantError || !tenantData) {
    throw new Error('Tenant no encontrado')
  }

  if (!tenantData.schema_name) {
    throw new Error('Schema del tenant no configurado')
  }

  tenant.value = tenantData
  tenantSchema.value = tenantData.schema_name
  
  console.log('Tenant found for pending messages:', tenantData.name, 'Schema:', tenantSchema.value)
}

const setupRealtimeSubscription = () => {
  if (!tenantSchema.value) {
    console.error('Cannot setup realtime subscription: tenant schema not available')
    return
  }

  console.log('Setting up realtime subscription for pending messages:', props.conversationId, 'in schema:', tenantSchema.value)
  
  realtimeChannel = client
    .channel(`pending-messages-${props.conversationId}-${tenant.value.schema_name}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: tenantSchema.value,
        table: 'conversation_pending_messages',
        filter: `chatwoot_conversation_id=eq.${props.conversationId}`
      },
      (payload) => {
        console.log('🔄 Pending messages realtime event received:', {
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema,
          timestamp: new Date().toISOString()
        })
        
        if (payload.eventType === 'INSERT') {
          // Solo agregar si no está procesado
          if (!payload.new.processed_at) {
            pendingMessages.value.push(payload.new)
            console.log('✅ New pending message added')
          }
        } else if (payload.eventType === 'UPDATE') {
          const index = pendingMessages.value.findIndex(msg => msg.id === payload.new.id)
          if (payload.new.processed_at) {
            // Si se procesó, remover de la lista
            if (index !== -1) {
              pendingMessages.value.splice(index, 1)
              console.log('✅ Message processed, removed from pending list')
            }
          } else {
            // Si sigue pendiente, actualizar
            if (index !== -1) {
              pendingMessages.value[index] = payload.new
              console.log('✅ Pending message updated')
            }
          }
        } else if (payload.eventType === 'DELETE') {
          pendingMessages.value = pendingMessages.value.filter(msg => msg.id !== payload.old.id)
          console.log('🗑️ Pending message removed')
        }
      }
    )
    .subscribe((status, err) => {
      console.log('📡 Pending messages realtime subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to pending messages updates')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Pending messages channel error:', err)
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Pending messages subscription timed out')
      } else if (status === 'CLOSED') {
        console.log('📡 Pending messages channel closed')
      }
      
      if (err) {
        console.error('❌ Pending messages realtime subscription error:', err)
        error.value = err
      }
    })
}

// ==================== FUNCIONES PÚBLICAS ====================

const fetchPendingMessages = async () => {
  try {
    pending.value = true
    error.value = null
    
    // Primero obtener el tenant si no lo tenemos
    if (!tenant.value || !tenantSchema.value) {
      await fetchTenant()
    }
    
    console.log('Fetching pending messages for conversation:', props.conversationId, 'in schema:', tenantSchema.value)
    
    const { data, error: fetchError } = await client
      .schema(tenantSchema.value)
      .from("conversation_pending_messages")
      .select("*")
      .eq("chatwoot_conversation_id", props.conversationId)
      .is("processed_at", null) // Solo mensajes no procesados
      .order("created_at", { ascending: true })
    
    if (fetchError) {
      console.error('Database fetch error for pending messages:', fetchError)
      throw fetchError
    }
    
    console.log('Fetched pending messages:', data?.length || 0, 'messages')
    pendingMessages.value = data || []
  } catch (err) {
    console.error('Error fetching pending messages:', err)
    error.value = err
    pendingMessages.value = []
  } finally {
    pending.value = false
  }
}

const refreshPendingMessages = async () => {
  await fetchPendingMessages()
}

// Formatear contenido del mensaje
const formatMessageContent = (content) => {
  if (typeof content === 'string') {
    return content
  }
  
  if (content?.text) {
    return content.text
  }
  
  if (content?.content) {
    return content.content
  }
  
  return JSON.stringify(content)
}

// Formatear tiempo relativo
const formatTimeAgo = (timestamp) => {
  const now = new Date()
  const messageTime = new Date(timestamp)
  const diffMs = now - messageTime
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return 'Ahora'
  if (diffMinutes < 60) return `${diffMinutes}m`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

// ==================== INICIALIZACIÓN Y CLEANUP ====================

const initialize = async () => {
  try {
    await fetchPendingMessages()
    setupRealtimeSubscription()
  } catch (err) {
    console.error('Error during pending messages initialization:', err)
    error.value = err
    pending.value = false
  }
}

const cleanup = () => {
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

// Inicializar al montar
onMounted(() => {
  initialize()
})

// Cleanup al desmontar
onUnmounted(() => {
  cleanup()
})

// Re-inicializar si cambia la conversación
watch(() => props.conversationId, () => {
  cleanup()
  initialize()
})
</script>

<template>
  <div class="pending-messages">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex align-center justify-center pa-4">
      <v-progress-circular
        indeterminate
        color="primary"
        size="20"
        width="2"
      />
      <span class="ml-2 text-caption text-grey">Cargando...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="pa-3">
      <v-alert
        type="error"
        variant="tonal"
        density="compact"
        :text="error.message || 'Error cargando mensajes pendientes'"
      />
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasPendingMessages" class="pa-4 text-center">
      <v-icon 
        size="32" 
        color="success"
        class="mb-2"
      >
        mdi-check-circle-outline
      </v-icon>
      <p class="text-caption text-grey mb-0">No hay mensajes pendientes</p>
    </div>

    <!-- Pending Messages List -->
    <div v-else class="pa-2">
      <div 
        v-for="message in sortedMessages"
        :key="message.id"
        class="pending-message-item mb-2"
      >
        <v-card
          variant="outlined"
          density="compact"
          class="bg-orange-lighten-5 border-orange-lighten-2"
        >
          <v-card-text class="pa-3">
            <!-- Header with time and attachment indicator -->
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center">
                <v-icon 
                  color="orange-darken-2" 
                  size="16"
                  class="mr-1"
                >
                  mdi-clock-outline
                </v-icon>
                <span class="text-caption text-orange-darken-2 font-weight-medium">
                  {{ formatTimeAgo(message.created_at) }}
                </span>
              </div>
              
              <div class="d-flex align-center gap-1">
                <v-chip
                  v-if="message.includes_attachments"
                  size="x-small"
                  variant="outlined"
                  color="info"
                  prepend-icon="mdi-paperclip"
                >
                  Archivo
                </v-chip>
                
                <v-chip
                  size="x-small"
                  variant="flat"
                  color="orange"
                >
                  Pendiente
                </v-chip>
              </div>
            </div>

            <!-- Message content -->
            <div class="message-content">
              <p class="text-body-2 mb-0 text-grey-darken-2">
                {{ formatMessageContent(message.content) }}
              </p>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Summary footer -->
      <div class="d-flex align-center justify-between mt-3 pa-2">
        <span class="text-caption text-grey">
          {{ messagesCount }} mensaje{{ messagesCount !== 1 ? 's' : '' }} pendiente{{ messagesCount !== 1 ? 's' : '' }}
        </span>
        
        <v-btn
          size="x-small"
          variant="text"
          @click="refreshPendingMessages"
          :loading="isLoading"
          prepend-icon="mdi-refresh"
          class="text-caption"
        >
          Actualizar
        </v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending-messages {
  width: 100%;
}

.pending-message-item {
  transition: all 0.2s ease;
}

.pending-message-item:hover {
  transform: translateY(-1px);
}

.message-content {
  line-height: 1.4;
  word-break: break-word;
}

/* Truncar texto largo */
.message-content p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>