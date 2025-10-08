<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Estados
const sign = ref('in')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

// Formulario
const form = ref({
  email: '',
  password: ''
})

const formValid = ref(false)

// Reglas de validación
const rules = {
  required: (v) => !!v || 'Este campo es requerido',
  email: (v) => {
    if (!v) return true
    return /.+@.+\..+/.test(v) || 'Email debe ser válido'
  }
}

// Watcher para redirigir si ya está logueado
watchEffect(() => {
  if (user.value) {
    return navigateTo('/providers')
  }
})

// Función de login
const signIn = async () => {
  if (!formValid.value) return

  try {
    loading.value = true
    error.value = ''

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.value.email,
      password: form.value.password,
    })

    if (authError) {
      error.value = authError.message
    }
  } catch (err) {
    error.value = 'Error de conexión. Inténtalo más tarde.'
  } finally {
    loading.value = false
  }
}

// Función de registro
const signUp = async () => {
  if (!formValid.value) return

  try {
    loading.value = true
    error.value = ''

    const { error: authError } = await supabase.auth.signUp({
      email: form.value.email,
      password: form.value.password,
    })

    if (authError) {
      error.value = authError.message
    } else {
      // Registro exitoso, hacer login automáticamente
      await signIn()
    }
  } catch (err) {
    error.value = 'Error de conexión. Inténtalo más tarde.'
  } finally {
    loading.value = false
  }
}

// Función de submit
const handleSubmit = async () => {
  if (sign.value === 'in') {
    await signIn()
  } else {
    await signUp()
  }
}

// Cambiar entre login y registro
const toggleSignMode = () => {
  sign.value = sign.value === 'in' ? 'up' : 'in'
  error.value = ''
}
</script>

<template>
  <div class="login-container">
    <v-container fluid class="fill-height">
      <v-row justify="center" align="center" class="fill-height">
        <v-col cols="12" sm="8" md="6" lg="4" xl="3">
          <v-card class="login-card" elevation="8">
            <v-card-title class="text-center pa-6">
              <div class="d-flex flex-column align-center">
                <v-icon 
                  size="48" 
                  color="primary" 
                  class="mb-3"
                >
                  mdi-account-circle
                </v-icon>
                <h2 class="text-h5 font-weight-bold">
                  {{ sign === 'in' ? 'Iniciar Sesión' : 'Crear Cuenta' }}
                </h2>
                <p class="text-body-2 text-grey-darken-1 mt-2">
                  {{ sign === 'in' ? 'Accede a tu cuenta' : 'Regístrate para comenzar' }}
                </p>
              </div>
            </v-card-title>

            <v-card-text class="pa-6">
              <!-- Mostrar error si existe -->
              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mb-4"
                closable
                @click:close="error = ''"
              >
                {{ error }}
              </v-alert>

              <!-- Formulario -->
              <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  variant="outlined"
                  type="email"
                  :rules="[rules.required, rules.email]"
                  prepend-inner-icon="mdi-email"
                  class="mb-4"
                  placeholder="Ingresa tu email"
                />

                <v-text-field
                  v-model="form.password"
                  label="Password"
                  variant="outlined"
                  :type="showPassword ? 'text' : 'password'"
                  :rules="[rules.required]"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  class="mb-4"
                  placeholder="Ingresa tu password"
                  @click:append-inner="showPassword = !showPassword"
                  @keyup.enter="handleSubmit"
                />

                <v-btn
                  type="submit"
                  color="primary"
                  variant="elevated"
                  size="large"
                  block
                  :loading="loading"
                  :disabled="!formValid"
                  class="mb-4"
                >
                  {{ loading ? 'Procesando...' : (sign === 'in' ? 'Iniciar Sesión' : 'Crear Cuenta') }}
                </v-btn>
              </v-form>

              <!-- Cambiar modo -->
              <div class="text-center">
                <p class="text-body-2 text-grey-darken-1">
                  {{ sign === 'up' ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?' }}
                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    @click="toggleSignMode"
                    :disabled="loading"
                  >
                    {{ sign === 'in' ? 'Crear cuenta' : 'Iniciar sesión' }}
                  </v-btn>
                </p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  border-radius: 16px !important;
}

.fill-height {
  min-height: 100vh;
}
</style>
