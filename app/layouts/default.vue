<script setup>
const route = useRoute();
const client = useSupabaseClient();
const user = useSupabaseUser();

const signOut = async () => {
  const { error } = await client.auth.signOut();
  if (error) {
    console.log(error);
  } else {
    navigateTo("/login");
  }
};

const navItems = [
  { title: "Proveedores", icon: "mdi-truck-delivery", to: "/providers" },
  // { title: "Documentación", icon: "mdi-book-open-variant", to: "/docs" },
  { title: "Chat IA", icon: "mdi-robot", to: "/chat" },
];

const isFullBleedPage = computed(() => route.path.startsWith("/chat"));

const currentTab = computed(() => {
  const path = route.path;
  if (path.startsWith("/providers")) return "/providers";
  if (path.startsWith("/docs")) return "/docs";
  if (path.startsWith("/chat")) return "/chat";
  return "/providers";
});

const userInitials = computed(() => {
  const name = user.value?.user_metadata?.name || user.value?.email || "U";
  return name.charAt(0).toUpperCase();
});
</script>

<template>
  <v-app>
    <v-app-bar elevation="0" class="app-bar-custom" height="56">
      <div class="navbar-content">
        <!-- Logo -->
        <div class="brand">
          <img
            src="/logo-electricidad-ushuaia.png"
            alt="Electricidad Ushuaia S.R.L."
            class="brand-logo"
          />
        </div>

        <div class="nav-divider" />

        <!-- Navegación con pills -->
        <div class="nav-items">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="['nav-pill', { 'nav-pill--active': currentTab === item.to }]"
          >
            <v-icon size="18">{{ item.icon }}</v-icon>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </div>

        <v-spacer />

        <!-- Usuario con menú -->
        <v-menu offset-y transition="slide-y-transition">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              class="user-btn"
              rounded="pill"
            >
              <v-avatar size="30" class="user-avatar mr-2">
                <span class="avatar-text">{{ userInitials }}</span>
              </v-avatar>
              <span class="user-name-btn">{{
                user?.user_metadata?.name || "Usuario"
              }}</span>
              <v-icon size="16" class="ml-1" style="opacity: 0.7">mdi-chevron-down</v-icon>
            </v-btn>
          </template>

          <v-card min-width="240" class="user-menu-card">
            <div class="user-menu-header">
              <v-avatar size="48" color="primary">
                <span class="avatar-text-lg">{{ userInitials }}</span>
              </v-avatar>
              <div class="user-menu-info">
                <p class="user-menu-name">
                  {{ user?.user_metadata?.name || "Usuario" }}
                </p>
                <p class="user-menu-email">{{ user?.email }}</p>
              </div>
            </div>

            <v-divider />

            <v-list density="compact" class="py-1">
              <v-list-item @click="signOut" class="logout-item">
                <template #prepend>
                  <v-icon color="error" size="20">mdi-logout</v-icon>
                </template>
                <v-list-item-title class="logout-text"
                  >Cerrar sesión</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </v-app-bar>

    <v-main class="main-content">
      <template v-if="isFullBleedPage">
        <slot />
      </template>
      <v-container v-else fluid class="pa-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-bar-custom {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.navbar-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 20px;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
}

.brand-logo {
  height: 40px;
  width: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.nav-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

/* Nav pills */
.nav-items {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-pill:hover {
  color: white;
  background: rgba(255, 255, 255, 0.12);
}

.nav-pill--active {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

/* User */
.user-btn {
  text-transform: none;
  padding: 4px 10px 4px 4px !important;
  height: auto !important;
  color: white !important;
}

.user-avatar {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.user-name-btn {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.avatar-text {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.avatar-text-lg {
  font-size: 17px;
  font-weight: 600;
  color: white;
}

/* User menu dropdown */
.user-menu-card {
  border-radius: 12px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.user-menu-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-menu-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.user-menu-email {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.logout-item {
  margin: 4px 8px;
  border-radius: 8px;
}

.logout-item:hover {
  background-color: #fef2f2 !important;
}

.logout-text {
  font-size: 14px;
  color: #ef4444;
  font-weight: 500;
}

.main-content {
  background-color: #f9fafb;
}
</style>
