export const useErmBpjsStatus = () => {
  const config = useRuntimeConfig()
  const tokenStore = useAccessTokenStore() as any

  // Cache untuk menyimpan status ERM BPYS
  const ermStatusCache = ref<Map<string, boolean>>(new Map())
  const loadingStatus = ref<Set<string>>(new Set())

  /**
   * Cek apakah SEP sudah dikirim ke BPJS dengan status 200
   * @param noSep Nomor SEP yang akan dicek
   * @returns Promise<boolean>
   */
  const checkErmBpjsStatus = async (noSep: string): Promise<boolean> => {
    if (!noSep) return false

    console.log(`🔍 Checking ERM BPJS status for SEP: ${noSep}`)

    // Check cache first
    if (ermStatusCache.value.has(noSep)) {
      const cachedStatus = ermStatusCache.value.get(noSep) || false
      console.log(`📦 Found cached status for ${noSep}: ${cachedStatus}`)
      return cachedStatus
    }

    // Check if already loading
    if (loadingStatus.value.has(noSep)) {
      console.log(`⏳ Already loading ${noSep}`)
      return false
    }

    loadingStatus.value.add(noSep)
    console.log(`🌐 Making API request for ${noSep}`)

    try {
      const response = await $fetch(`${config.public.API_V2_URL}/bpjs/erm/${noSep}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      })

      // Parse response untuk mengecek status code 200
      if (response && (response as any).data && (response as any).data.erm_response) {
        // Extract response dari erm_response field
        const ermResponse = (response as any).data.erm_response

        // Check both possible locations for response code
        let responseCode = null

        if (ermResponse && ermResponse.response && ermResponse.response.metadata && ermResponse.response.metadata.code) {
          responseCode = ermResponse.response.metadata.code
        } else if (ermResponse && ermResponse.metadata && ermResponse.metadata.code) {
          responseCode = ermResponse.metadata.code
        }

        if (responseCode === 200 || responseCode === '200') {
          ermStatusCache.value.set(noSep, true)
          console.log(`✅ ERM BPJS status: ${noSep} - Success (HTTP 200)`)
          return true
        } else {
          console.log(`❌ ERM BPJS status: ${noSep} - Response Code: ${responseCode} (type: ${typeof responseCode})`)
          console.log(`Full response structure:`, JSON.stringify(ermResponse, null, 2))
        }
      } else {
        console.log(`❌ ERM BPJS status: ${noSep} - Invalid response structure:`, response)
      }

      // Jika tidak ada status 200, set ke false
      ermStatusCache.value.set(noSep, false)
      return false

    } catch (error: any) {
      console.error(`Error checking ERM BPJS status for SEP ${noSep}:`, error)

      // Handle different error scenarios
      if (!error) {
        console.error('Unknown error occurred')
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Handle 404 (not found) - belum ada data ERM
      if (error.response?.status === 404) {
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Handle 500 (server error)
      if (error.response?.status === 500) {
        console.error('Server error checking ERM BPJS status')
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Handle network errors
      if (error.name === 'TypeError' || error.message?.includes('fetch')) {
        console.error('Network error checking ERM BPJS status')
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Handle JSON parsing errors
      if (error.name === 'SyntaxError' || error.message?.includes('JSON')) {
        console.error('Response parsing error checking ERM BPJS status')
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Handle timeout errors
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.error('Timeout checking ERM BPJS status')
        ermStatusCache.value.set(noSep, false)
        return false
      }

      // Log detailed error information for debugging
      console.error('Detailed error info:', {
        name: error.name,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: `${config.public.API_V2_URL}/bpjs/erm/${noSep}`
      })

      // For any other error, set to false
      ermStatusCache.value.set(noSep, false)
      return false
    } finally {
      loadingStatus.value.delete(noSep)
    }
  }

  
  /**
   * Cek multiple SEP sekaligus
   * @param noSepArray Array of SEP numbers
   * @returns Promise<Map<string, boolean>>
   */
  const checkMultipleErmStatus = async (noSepArray: string[]): Promise<Map<string, boolean>> => {
    const results = new Map<string, boolean>()

    // Cek cache dulu
    const uncachedSeps: string[] = []
    noSepArray.forEach(noSep => {
      if (!noSep) {
        results.set(noSep, false)
        return
      }

      if (ermStatusCache.value.has(noSep)) {
        const cachedStatus = ermStatusCache.value.get(noSep) || false
        results.set(noSep, cachedStatus)
      } else {
        uncachedSeps.push(noSep)
      }
    })

    // Batch check untuk yang belum ada di cache
    if (uncachedSeps.length > 0) {
      try {
        const promises = uncachedSeps.map(noSep => checkErmBpjsStatus(noSep))
        const batchResults = await Promise.all(promises)

        uncachedSeps.forEach((noSep, index) => {
          results.set(noSep, batchResults[index])
        })
      } catch (error) {
        console.error('Error in batch ERM status check:', error)
        uncachedSeps.forEach(noSep => {
          results.set(noSep, false)
        })
      }
    }

    return results
  }

  /**
   * Clear cache untuk SEP tertentu atau semua
   * @param noSep Nomor SEP (optional)
   */
  const clearCache = (noSep?: string) => {
    if (noSep) {
      ermStatusCache.value.delete(noSep)
      console.log(`🧹 Cleared cache for SEP: ${noSep}`)
    } else {
      console.log(`🧹 Cleared all ERM cache (${ermStatusCache.value.size} entries)`)
      ermStatusCache.value.clear()
    }
  }

  /**
   * Get loading status untuk SEP tertentu
   * @param noSep Nomor SEP
   * @returns boolean
   */
  const isLoading = (noSep: string): boolean => {
    return loadingStatus.value.has(noSep)
  }

  return {
    checkErmBpjsStatus,
    checkMultipleErmStatus,
    clearCache,
    isLoading,
    ermStatusCache: readonly(ermStatusCache)
  }
}