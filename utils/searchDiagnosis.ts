import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const loadingStates = {
  unuDiagnosa: ref(false),
  unuProsedur: ref(false),
  idrgDiagnosa: ref(false),
  idrgProsedur: ref(false),
  inacbgDiagnosa: ref(false),
  inacbgProsedur: ref(false),
}

async function fetchHelper(query: string, endpoint: string, loader: any) {
  const config = useRuntimeConfig()
  loader.value = true

  if (query.length < 3) {
    loader.value = false
    return []
  }

  try {
    const debounced = useDebounceFn(async () => {
      const res: any = await $fetch(`${config.public.API_V2_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { search: { value: query } },
      })

      let items: any[] = []

      // ==== Cek struktur response ====
      if (res?.data?.data) {
        // struktur UNU / IDRG
        items = res.data.data
        return items.map((item: any) => ({
          value: item.code,
          title: item.description,
          label: `${item.code} - ${item.description}`,
          accpdx: item.accpdx, // Add accpdx to the response item
          validcode: item.validcode, // Add validcode to the response item
          disabled: item.validcode === "0" // 👉 kalau 0, otomatis disabled
        }))
      } else if (res?.response?.data) {
        // struktur INACBG
        items = res.response.data
        return items.map((arr: any[]) => ({
          value: arr[1],             // kode ICD
          title: arr[0],             // deskripsi
          label: `${arr[1]} - ${arr[0]}`,
        }))
      }

      return []
    }, 800)

    return await debounced()
  } catch (err) {
    console.error('fetchHelper error:', err)
    return []
  } finally {
    loader.value = false
  }
}

// === Wrappers ===
export async function fetchDiagnosaUnu(query: string) {
  return fetchHelper(query, '/icd10_im', loadingStates.unuDiagnosa)
}
export async function fetchProsedurUnu(query: string) {
  return fetchHelper(query, '/icd9_im', loadingStates.unuProsedur)
}
export async function fetchDiagnosaIdrg(query: string) {
  return fetchHelper(query, '/icd10_idrg', loadingStates.idrgDiagnosa)
}
export async function fetchProsedurIdrg(query: string) {
  return fetchHelper(query, '/icd9_idrg', loadingStates.idrgProsedur)
}
export async function fetchDiagnosaInacbg(query: string) {
  return fetchHelper(query, '/eklaim/diagnosis/search', loadingStates.inacbgDiagnosa)
}
export async function fetchProsedurInacbg(query: string) {
  return fetchHelper(query, '/eklaim/procedures/search', loadingStates.inacbgProsedur)
}

export { loadingStates }
