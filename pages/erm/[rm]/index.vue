<template>
  <!-- Prevent server-side rendering dengan ClientOnly wrapper -->
  <ClientOnly>
    <div v-if="isInitializing" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon name="i-tabler-loader-2" class="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p class="text-gray-600">Loading...</p>
      </div>
    </div>
    <TableDataErm v-else :data="data" :refresh="onRefresh" :status="status" :pending="pending" />
  </ClientOnly>
</template>

<script lang="ts" setup>
// Disable SSR untuk halaman ini
definePageMeta({
  ssr: false
})

const route = useRoute();
const config = useRuntimeConfig()
const tokenStore = useAccessTokenStore()

const toast = useToast()
const currentPage = ref(1)

// Loading state untuk ClientOnly
const isInitializing = ref(true)

// Decode base64 parameter (client-only)
const rm = ref('')

const decodeRmParameter = () => {
  try {
    if (route.params.rm && typeof route.params.rm === 'string') {
      const decoded = atob(route.params.rm)
      if (decoded && decoded.trim()) {
        rm.value = decoded
        return true
      }
    }
  } catch (error) {
    console.error('Error decoding RM parameter:', error)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Invalid patient RM parameter',
      color: 'red'
    })
  }
  return false
}

// Initialize data refs
const data = ref<any>(null)
const error = ref<any>(null)
const status = ref('idle')
const pending = ref(false)

const fetchData = async () => {
  if (!rm.value) return

  status.value = 'pending'
  pending.value = true

  try {
    const result = await $fetch(`${config.public.API_V2_URL}/sep/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStore.accessToken}`
      },
      body: JSON.stringify({
        "sort": [
          { "field": "no_rawat", "direction": "desc" }
        ],
        "filters": [
          { "field": "nomr", "operator": "=", "value": rm.value },
        ],
        "includes": [
          { "relation": "tanggal_pulang" },
          { "relation": "status_klaim" },
          { "relation": "groupStage" },
          { "relation": "pasien" },
          { "relation": "rsia_klaim_idrg" },
        ]
      })
    })

  
    data.value = result
    status.value = 'success'
  } catch (err: any) {
    error.value = err
    status.value = 'error'
    console.error('API Error:', err)

    // More robust error message extraction with extra null checks
    let errorMessage = 'Terjadi kesalahan saat memuat data'

    // Check if err exists and is not null/undefined
    if (err && err !== null && err !== undefined) {
      try {
        if (typeof err === 'string') {
          errorMessage = err
        } else if (err && typeof err === 'object') {
          // Safely access nested properties
          if (err.data && err.data.message) {
            errorMessage = err.data.message
          } else if (err.message) {
            errorMessage = err.message
          } else if (err.statusMessage) {
            errorMessage = err.statusMessage
          } else if (err.statusText) {
            errorMessage = err.statusText
          } else if (err.error) {
            errorMessage = err.error
          }
        }
      } catch (propError) {
        console.error('Error accessing error properties:', propError)
        errorMessage = 'Terjadi kesalahan saat memproses response'
      }
    } else {
      errorMessage = 'Terjadi kesalahan koneksi atau server error'
    }

    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error!',
      description: errorMessage,
      color: 'red',
      timeout: 2000
    })
  } finally {
    pending.value = false
    isInitializing.value = false
  }
}

function onRefresh() {
  fetchData()
}

// Client-side initialization
onMounted(() => {
  try {
    if (decodeRmParameter()) {
      fetchData()
    } else {
      isInitializing.value = false
    }
  } catch (err) {
    console.error('Initialization error:', err)
    isInitializing.value = false
  }
})
</script>