<script setup>
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text) {
  if (!text) return "";
  return DOMPurify.sanitize(marked.parse(text));
}

definePageMeta({ layout: "default" });

const {
  chatGetConversations,
  chatCreateConversation,
  chatGetMessages,
  chatDeleteConversation,
  chatSendMessage,
} = useExternalBackend();

const conversations = ref([]);
const activeConversationId = ref(null);
const messages = ref([]);
const userInput = ref("");
const loading = ref(false);
const loadingConversations = ref(false);
const messagesContainer = ref(null);
const searchQuery = ref("");

const activeConversation = computed(() =>
  conversations.value.find((c) => c.id === activeConversationId.value),
);

const filteredConversations = computed(() => {
  if (!searchQuery.value) return conversations.value;
  const q = searchQuery.value.toLowerCase();
  return conversations.value.filter((c) =>
    (c.title || "").toLowerCase().includes(q),
  );
});

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

async function loadConversations() {
  loadingConversations.value = true;
  try {
    const result = await chatGetConversations();
    conversations.value = result;
  } catch (e) {
    console.error("[Chat] Error cargando conversaciones:", e);
  } finally {
    loadingConversations.value = false;
  }
}

async function createConversation() {
  try {
    const conv = await chatCreateConversation();
    conversations.value.unshift(conv);
    selectConversation(conv.id);
  } catch (e) {
    console.error("[Chat] Error creando conversacion:", e);
  }
}

async function removeConversation(id) {
  try {
    await chatDeleteConversation(id);
    conversations.value = conversations.value.filter((c) => c.id !== id);
    if (activeConversationId.value === id) {
      activeConversationId.value = null;
      messages.value = [];
    }
  } catch (e) {
    console.error("Error eliminando conversacion:", e);
  }
}

async function selectConversation(id) {
  activeConversationId.value = id;
  messages.value = [];
  try {
    const history = await chatGetMessages(id);
    if (history?.length) {
      messages.value = history;
      scrollToBottom();
    }
  } catch (e) {
    console.error("[Chat] Error cargando historial:", e);
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || loading.value || !activeConversationId.value) return;

  userInput.value = "";
  messages.value.push({ role: "user", content: text });
  messages.value.push({ role: "assistant", content: "" });
  const assistantIdx = messages.value.length - 1;

  loading.value = true;
  await nextTick();
  scrollToBottom();

  try {
    await chatSendMessage(activeConversationId.value, text, (chunk) => {
      if (chunk.content) {
        messages.value[assistantIdx].content += chunk.content;
        scrollToBottom();
      }
      if (chunk.title) {
        const conv = conversations.value.find(c => c.id === activeConversationId.value);
        if (conv) conv.title = chunk.title;
      }
    });
  } catch (e) {
    console.error("[Chat] sendMessage error:", e);
    messages.value[assistantIdx].content += `\n\n[Error: ${e.message}]`;
  } finally {
    loading.value = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop =
        messagesContainer.value.scrollHeight;
    }
  });
}

function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

onMounted(() => {
  loadConversations();
});
</script>

<template>
  <div class="chat-page">
    <!-- Sidebar -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <v-btn
          block
          variant="tonal"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-plus"
          @click="createConversation"
        >
          Nueva conversacion
        </v-btn>
      </div>

      <div class="sidebar-search">
        <v-text-field
          v-model="searchQuery"
          placeholder="Buscar conversaciones..."
          variant="solo-filled"
          density="compact"
          flat
          hide-details
          prepend-inner-icon="mdi-magnify"
          rounded="lg"
          clearable
        />
      </div>

      <v-progress-linear v-if="loadingConversations" indeterminate color="primary" />

      <div class="sidebar-list">
        <div
          v-for="conv in filteredConversations"
          :key="conv.id"
          :class="['conversation-item', { 'conversation-item--active': conv.id === activeConversationId }]"
          @click="selectConversation(conv.id)"
        >
          <v-icon size="18" class="conversation-icon">mdi-chat-outline</v-icon>
          <div class="conversation-info">
            <span class="conversation-title">{{ conv.title || "Sin titulo" }}</span>
            <span class="conversation-date">{{ formatDate(conv.updated_at) }}</span>
          </div>
          <v-btn
            icon
            size="x-small"
            variant="text"
            class="conversation-delete"
            @click.stop="removeConversation(conv.id)"
          >
            <v-icon size="16">mdi-delete-outline</v-icon>
          </v-btn>
        </div>

        <div v-if="!loadingConversations && filteredConversations.length === 0" class="sidebar-empty">
          <v-icon size="32" color="grey-lighten-1">mdi-chat-remove-outline</v-icon>
          <span>Sin conversaciones</span>
        </div>
      </div>
    </aside>

    <!-- Chat Area -->
    <main class="chat-main">
      <!-- Empty state -->
      <div v-if="!activeConversationId" class="chat-empty-state">
        <div class="empty-icon-wrapper">
          <v-icon size="48" color="primary">mdi-chat-processing-outline</v-icon>
        </div>
        <h3 class="empty-title">Selecciona o crea una conversacion</h3>
        <p class="empty-subtitle">Usa el chat para buscar productos y armar presupuestos</p>
      </div>

      <!-- Active conversation -->
      <template v-else>
        <!-- Header -->
        <header class="chat-header">
          <v-icon size="20" class="mr-2" color="primary">mdi-chat</v-icon>
          <span class="chat-header-title">{{ activeConversation?.title || "Chat" }}</span>
        </header>

        <!-- Messages (ONLY this scrolls) -->
        <div ref="messagesContainer" class="messages-container">
          <div class="messages-inner">
            <div
              v-for="(msg, i) in messages"
              :key="i"
              :class="['message-row', msg.role === 'user' ? 'message-row--user' : 'message-row--assistant']"
            >
              <!-- Avatar for assistant -->
              <v-avatar v-if="msg.role === 'assistant'" size="32" color="primary" class="message-avatar">
                <v-icon size="18" color="white">mdi-robot</v-icon>
              </v-avatar>

              <!-- Bubble -->
              <div :class="['message-bubble', `message-bubble--${msg.role}`]">
                <!-- Assistant: render markdown -->
                <div
                  v-if="msg.role === 'assistant' && msg.content"
                  class="message-text markdown-body"
                  v-html="renderMarkdown(msg.content)"
                />
                <!-- User: plain text -->
                <span v-else-if="msg.content" class="message-text">{{ msg.content }}</span>
                <div v-if="msg.role === 'assistant' && !msg.content && loading" class="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input (pinned to bottom) -->
        <footer class="chat-input-area">
          <div class="input-wrapper">
            <v-textarea
              v-model="userInput"
              placeholder="Escribe tu mensaje..."
              variant="outlined"
              density="compact"
              rows="1"
              auto-grow
              max-rows="5"
              hide-details
              :disabled="loading"
              rounded="xl"
              class="chat-textarea"
              @keydown="handleKeydown"
            />
            <v-btn
              icon
              color="primary"
              size="40"
              :loading="loading"
              :disabled="!userInput.trim()"
              rounded="circle"
              class="send-btn"
              @click="sendMessage"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
/* ===== Page root ===== */
.chat-page {
  height: calc(100vh - 56px);
  display: flex;
  overflow: hidden;
}

/* ===== Sidebar ===== */
.chat-sidebar {
  width: 300px;
  min-width: 300px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px 16px 12px;
}

.sidebar-search {
  padding: 0 16px 12px;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.conversation-item:hover {
  background: #f3f4f6;
}

.conversation-item:hover .conversation-delete {
  opacity: 1;
}

.conversation-item--active {
  background: #ede9fe;
}

.conversation-item--active:hover {
  background: #e0d7fc;
}

.conversation-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.conversation-item--active .conversation-icon {
  color: #7c3aed;
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-date {
  font-size: 11px;
  color: #9ca3af;
}

.conversation-delete {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 13px;
}

/* ===== Chat main ===== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: #fafafa;
}

/* ===== Empty state ===== */
.chat-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
}

.empty-icon-wrapper {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: #ede9fe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.empty-subtitle {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

/* ===== Chat header ===== */
.chat-header {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.chat-header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

/* ===== Messages ===== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 20px;
}

.messages-inner {
  max-width: 800px;
  margin: 0 auto;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant {
  justify-content: flex-start;
}

.message-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.message-bubble {
  max-width: 85%;
  padding: 10px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-bubble--user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}

.message-bubble--assistant {
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.message-text {
  display: block;
}

/* ===== Markdown styles for assistant messages ===== */
.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin-bottom: 2px;
}

.markdown-body :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: "Fira Code", "Cascadia Code", "JetBrains Mono", monospace;
}

.markdown-body :deep(pre) {
  background: #1f2937;
  color: #e5e7eb;
  padding: 12px 16px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #667eea;
  margin: 8px 0;
  padding: 4px 12px;
  color: #6b7280;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 1.3em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 12px 0;
}

.markdown-body :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(strong) {
  font-weight: 600;
}

/* ===== Typing indicator ===== */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ===== Input area ===== */
.chat-input-area {
  padding: 12px 20px 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.chat-textarea {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
  margin-bottom: 2px;
}
</style>
