<script setup lang="ts">
import { computed } from 'vue'
import { useAccessTokenStore } from '~/stores/accessToken'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const tokenStore = useAccessTokenStore()

const headers = computed(() => ({
  Authorization: tokenStore.accessToken ? `Bearer ${tokenStore.accessToken}` : '',
  Accept: "application/json",
}))

const detailUrl = computed(() => {
  return tokenStore.accessToken ? `${runtimeConfig.public.API_V2_URL}/user/auth/detail` : null
})

const { data: userDetail } = await useFetch<any>(detailUrl, {
  headers,
  key: `user-detail-${tokenStore.accessToken || 'guest'}`
})

const links = computed(() => [
  [],
  [
    {
      "label": "Dashboard",
      "icon": "i-tabler-layout-dashboard",
      "to": "/"
    },
    { "label": "Rawat Inap", "icon": "i-tabler-bed", "to": "/ranap" },
    { "label": "Rawat Jalan", "icon": "i-tabler-walk", "to": "/ralan" },
    { "label": "Grade III", "icon": "i-tabler-alert-triangle", "to": "/grade-3" }
  ],
  [
    { 
      "label": userDetail.value?.data?.detail?.nama || 'User', 
      "icon": "i-tabler-user",
      "disabled": true
    },
    { "label": "Logout", "icon": "i-tabler-logout", "to": "/auth/logout" },
  ],
])
</script>

<template>
  <!-- main -->
  <div class="w-full bg-cool-100 text-cool-800 dark:bg-cool-800 dark:text-cool-100 min-h-screen">

    <UHorizontalNavigation :links="links" class="bg-white border-b border-cool-200 dark:bg-cool-800 dark:border-cool-700 shadow sticky top-0 z-[1] px-4" />

    <div class="p-4 pb-8">
      <slot />
    </div>

  </div>
</template>