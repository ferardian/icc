<template>
  <UContainer class="p-0">
    <div class="flex justify-between items-center mb-5">
      <h1 class="text-2xl font-semibold text-indigo-500">Form Klaim</h1>
      <div class="flex items-center space-x-2">
        <template v-if="bridgingSep?.data?.klsnaik">
          <UButton icon="i-heroicons-pencil-square" size="sm" color="yellow" variant="ghost" label="Edit Detail Naik Kelas" @click="openUpdateNaikKelas = true" :trailing="false"/>
        </template>
        <UButton color="indigo" variant="soft" size="sm" icon="i-heroicons-cpu-chip"
          :loading="isAnalyzing"
          @click="triggerAiAnalysis">
          Analisis AI
        </UButton>
        <UButton color="indigo" variant="soft" size="sm" icon="i-tabler-file-text"
          @click="openDokumen = true; pdfReady = false">
          Berkas Klaim
        </UButton>
        <UButton color="indigo" variant="soft" size="sm" icon="i-tabler-pig-money"
          :disabled="!bridgingSep?.data.nomr"
          @click="openNewTab(buildUrlErm(bridgingSep?.data.nomr, bridgingSep?.data.no_sep))">
          ERM BPJS
        </UButton>
      </div>
    </div>

    <div class="px-6 py-4 rounded-lg border-[1px] shadow bg-white dark:bg-gray-900 dark:border-gray-800 mb-5">
      <!-- nama & no_rkm_medis -->
      <div class="flex flex-row gap-5 items-center justify-between ">
        <div>
          <h3 class="text-sm font-semibold text-indigo-500 mb-1">Nama Pasien</h3>
          <p class="font-semibold">{{ bridgingSep?.data.nama_pasien }}</p>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-indigo-500 mb-1">Nomor Rawat</h3>
          <p class="font-semibold">{{ bridgingSep?.data.no_rawat }}</p>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-indigo-500 mb-1">No. Rekam Medis</h3>
          <p class="font-semibold">{{ bridgingSep?.data.nomr }}</p>
        </div>
      </div>
    </div>

    <UCard class="mb-5">
      <ClientOnly fallback="Loading Forms . . .">
        <FormKlaimNew 
          :sep="bridgingSep?.data"  
          :regPeriksa="allData.regPeriksa?.data" 
          :kamarInap="allData.kamarInap?.data" 
          :billing="allData.billing?.data"
          :diagnosa="allData.diagnosa?.data" 
          :prosedur="allData.prosedur?.data" 
          :tensi="allData.sisDiastole?.data" 

          :sudahDiGrouping="klaimData?.data ? true : false"

          :refreshLatestKlaim="refreshLatestKlaim" 
          :setTotalTarifRs="setTotalTarifRs"
          :setIsVip="setIsVip"
        />
      </ClientOnly>
    </UCard>

    <template v-if="klaimData?.data">
      <UCard class="mb-5">
        <!-- <template #header>
          <div class="w-full flex items-center justify-between">
            <h2 class="text-lg font-semibold text-indigo-500">Hasil Klaim Terakhir</h2>

            <template v-if="bridgingSep?.data?.klsnaik">
              <UButton icon="i-heroicons-pencil-square" size="sm" color="yellow" variant="ghost" label="Edit Detail Naik Kelas" @click="openUpdateNaikKelas = true" :trailing="false"/>
            </template>
          </div>
        </template> -->

        <!-- show 3 information, code cbg, deskripsi dan tarif -->
        <!-- <div class="flex flex-col xl:flex-row gap-5 items-stretch">
          <div class="">
            <h3 class="text-sm font-semibold text-indigo-500 mb-1">CBG</h3>
            <UBadge color="sky" variant="subtle" class="text-sm">
              {{ klaimData?.data?.code_cbg }}
            </UBadge>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-indigo-500 mb-1">Deskripsi</h3>
            <p>{{ klaimData?.data?.deskripsi }}</p>
          </div>
          <div class="">
            <h3 class="text-sm font-semibold text-indigo-500 mb-1">Tarif</h3>
            <p>{{ klaimData?.data?.tarif ? formatRupiah(klaimData?.data?.tarif) : '-' }}</p>
          </div>
        </div> -->

        <template v-if="isVip && totalTarifRs && totalTarifRs < klaimData?.data?.tarif">
          <UDivider class="my-5" label="Tambahan Biaya" />
          <p class="text-red-500">Tambahan biaya tidak berlaku, karena total tarif RS lebih kecil dari tarif klaim ({{ formatRupiah(totalTarifRs) }} < {{ formatRupiah(klaimData?.data?.tarif) }})</p>
        </template>

        <template v-if="(klaimData?.data as any)?.naik_kelas">
          <UDivider class="my-5" label="Tambahan Biaya" />

          <div class="flex flex-col xl:flex-row justify-between">
            <div class="font-mono">
              {{ formatRupiah((klaimData?.data as any)?.naik_kelas.tarif_1) }} - {{ formatRupiah((klaimData?.data as any)?.naik_kelas.tarif_2) }} 
              <template v-if="(klaimData?.data as any)?.naik_kelas.presentase > 0">
                + ( {{ formatRupiah((klaimData?.data as any)?.naik_kelas.tarif_1) }} x {{ (klaimData?.data as any)?.naik_kelas.presentase }}% )
              </template>
            </div>
            <div class="">
              = {{ formatRupiah((klaimData?.data as any)?.naik_kelas.tarif_akhir) }}
            </div>
          </div>
        </template>
      </UCard>
    </template>

  </UContainer>

  <USlideover v-model="openDokumen" :ui="{ width: 'w-screen max-w-[50%]' }">
    <div class="p-4 flex-1">
      <UButton color="gray" variant="ghost" size="sm" icon="i-tabler-x"
        class="flex sm:hidden absolute end-5 top-5 z-10" square padded @click="openDokumen = false" />
      <div v-if="!pdfReady"
        class="absolute inset-0 flex justify-center items-center bg-gray-100 z-10 bg-gray-200/50 dark:bg-gray-800/50">
        <div class="loader">Loading...</div>
      </div>

      <iframe :src="pdfUrl" frameborder="0" width="100%" height="100%" @load="pdfReady = true"></iframe>
    </div>
  </USlideover>

  <ModalUpdateNaikKelas v-model:isOpen="openUpdateNaikKelas" :sep="no_sep" />

  <!-- AI Analysis Result Modal -->
  <UModal v-model="showAiModal" :ui="{ width: 'sm:max-w-xl' }">
    <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 text-indigo-500" />
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Hasil Analisis Klaim AI
            </h3>
          </div>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="showAiModal = false" />
        </div>
      </template>

      <div class="space-y-6">
        <!-- Model Histori RSIA -->
        <div class="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <div class="text-center mb-4">
            <p class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Referensi Tarif Histori RSIA</p>
          </div>
          
          <div class="grid grid-cols-3 gap-2">
            <div class="text-center">
              <p class="text-[9px] text-gray-500 uppercase mb-1">Kasus Standar</p>
              <p class="text-[15px] font-black text-gray-800 dark:text-gray-200">{{ formatRupiah(aiResult?.ai_analysis?.histori_model?.baseline || 0) }}</p>
            </div>
            <div class="text-center border-x border-indigo-100/50 dark:border-indigo-800/50 px-2">
              <p class="text-[9px] text-indigo-600 font-bold uppercase mb-1">Kasus Serupa</p>
              <p class="text-[15px] font-black text-indigo-700 dark:text-indigo-400">{{ formatRupiah(aiResult?.ai_analysis?.histori_model?.mirror || 0) }}</p>
            </div>
            <div class="text-center">
              <p class="text-[9px] text-gray-500 uppercase mb-1">Nilai Tertinggi</p>
              <p class="text-[15px] font-black text-gray-800 dark:text-gray-200">{{ formatRupiah(aiResult?.ai_analysis?.histori_model?.max || 0) }}</p>
            </div>
          </div>
          
          <div v-if="aiResult?.ai_analysis?.kode_inacbg_estimasi" class="mt-4 pt-3 border-t border-indigo-100/30 dark:border-indigo-800/30 text-center">
            <p class="text-[10px] text-indigo-400 font-medium">Prediksi Kode INA-CBG: <span class="font-bold border-b border-indigo-200 dark:border-indigo-800 pb-0.5">{{ aiResult.ai_analysis.kode_inacbg_estimasi }}</span></p>
          </div>
        </div>

        <!-- Status & Severity -->
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1 text-center sm:text-left">
            <h5 class="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2 justify-center sm:justify-start">
              <UIcon name="i-heroicons-check-circle" :class="aiResult?.ai_analysis?.status_berkas === 'LENGKAP' ? 'text-green-500' : 'text-orange-500'" />
              Berkas
            </h5>
            <UBadge 
              :color="aiResult?.ai_analysis?.status_berkas === 'LENGKAP' ? 'green' : 'orange'" 
              variant="subtle"
              class="px-3 py-1 font-bold uppercase text-[10px]"
            >
              {{ aiResult?.ai_analysis?.status_berkas || 'MEMPROSES' }}
            </UBadge>
          </div>
          <div class="flex-1 text-center sm:text-left">
            <h5 class="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2 justify-center sm:justify-start">
              <UIcon name="i-heroicons-shield-check" class="text-indigo-500" />
              Severity Level
            </h5>
            <UBadge color="indigo" variant="subtle" class="px-3 py-1 font-bold uppercase text-[10px]">
              {{ aiResult?.ai_analysis?.severity_level || 'Level I' }}
            </UBadge>
          </div>
        </div>

        <!-- Faktor Penambah Nilai -->
        <div v-if="aiResult?.ai_analysis?.faktor_penambah?.length" class="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50">
          <h5 class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2">Analisa Keparahan:</h5>
          <div class="flex flex-wrap gap-2">
            <template v-for="(factor, idx) in aiResult.ai_analysis.faktor_penambah" :key="idx">
              <span class="text-[11px] px-2 py-0.5 bg-white dark:bg-gray-800 rounded border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                + {{ factor }}
              </span>
            </template>
          </div>
        </div>

        <!-- Dokumen yang Kurang -->
        <div v-if="aiResult?.ai_analysis?.dokumen_kurang?.length">
          <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dokumen Perlu Dilengkapi:</h5>
          <ul class="space-y-1">
            <li v-for="(doc, idx) in aiResult.ai_analysis.dokumen_kurang" :key="idx" class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span class="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
              {{ doc }}
            </li>
          </ul>
        </div>

        <!-- Catatan AI -->
        <div>
          <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catatan Analisa:</h5>
          <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic">
            "{{ aiResult?.ai_analysis?.catatan || 'Tidak ada catatan khusus.' }}"
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="ghost" @click="showAiModal = false">Tutup</UButton>
          <UButton color="indigo" @click="triggerAiAnalysis" :loading="isAnalyzing">Analisis Ulang</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script lang="ts" setup>
import type { ResponseSepData, ResponseTensi, ResponseRegPeriksa, KamarInapResponse, BillingPasienResponse, ResourcePagination } from '~/types';

const toast = useToast();
const route = useRoute();
const isVip = ref(false);
const totalTarifRs = ref(0);
const pdfReady = ref(false);
const openDokumen = ref(false);
const config = useRuntimeConfig();
const no_sep = ref(route.params.sep);
const openUpdateNaikKelas = ref(false);
const isAnalyzing = ref(false);
const showAiModal = ref(false);
const aiResult = ref<any>(null);
const tokenStore = useAccessTokenStore();
const pdfUrl = `${config.public.API_V2_URL}/sep/${no_sep.value}/print?token=${tokenStore.accessToken}`;

const buildUrlErm = (noRm: string, noSep?: string) => noSep ? `/erm/${btoa(noRm)}?sep=${noSep}` : `/erm/${btoa(noRm)}`;
const openNewTab = (url: string) => {
  window.open(url, '_blank');
};

const triggerAiAnalysis = async () => {
  if (!bridgingSep.value?.data?.no_rawat) {
    toast.add({
      title: 'Data Tidak Lengkap',
      description: 'Nomor rawat tidak ditemukan dalam data SEP.',
      color: 'orange'
    });
    return;
  }

  // Cek apakah diagnosa sudah terisi
  if (!allData.value.diagnosa?.data || allData.value.diagnosa.data.length === 0) {
    toast.add({
      title: 'Diagnosa Kosong',
      description: 'Silakan isi Diagnosa Utama terlebih dahulu sebelum melakukan analisa AI.',
      color: 'orange'
    });
    return;
  }

  isAnalyzing.value = true;
  try {
    const rawat = bridgingSep.value.data.no_rawat;
    const response = await $fetch<any>(`${config.public.API_V2_URL}/eklaim/analisis/${btoa(rawat)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
    });

    if (response?.success) {
      aiResult.value = { ai_analysis: response.message };
      showAiModal.value = true;
      toast.add({
        title: 'Analisis Selesai',
        description: 'Klaim Anda telah dianalisis oleh AI.',
        color: 'green'
      });
    } else {
      throw new Error(response?.message || 'Gagal melakukan analisis AI');
    }
  } catch (err: any) {
    console.error('AI Analysis Error:', err);
    toast.add({
      title: 'Gagal Analisis',
      description: err.data?.message || err.message || 'Terjadi kesalahan saat menghubungi server AI.',
      color: 'red'
    });
  } finally {
    isAnalyzing.value = false;
  }
};

const setTotalTarifRs = (tarif: number) => {
  totalTarifRs.value = tarif;
};

const setIsVip = (vip: boolean) => {
  isVip.value = vip;
};

// Fungsi untuk membangun URL tensi
const buildUrlTensi = (noRm: string, noRawat: string, status: number) => {
  if (status !== 1 && status !== 2) return '';
  let stts = status === 1 ? 'ranap' : 'ralan';
  return `${config.public.API_V2_URL}/pasien/${noRm}/riwayat/${noRawat}/${stts}/get-tensi`;
};

const allData = ref<{
  regPeriksa: ResponseRegPeriksa | null,
  kamarInap: KamarInapResponse | null,
  billing: BillingPasienResponse | null,
  diagnosa: ResourcePagination | null,
  prosedur: ResourcePagination | null,
  sisDiastole: ResponseTensi | null
}>({
  regPeriksa: null,
  kamarInap: null,
  billing: null,
  diagnosa: null,
  prosedur: null,
  sisDiastole: null
});

// Helper function to fetch data with error handling
async function fetchDataOrNull(url: any, options = {}) {
  try {
    return await $fetch(url, options);
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return null;
  }
}

// Function to fetch all required data
async function fetchAllData(noRawat: string, noRm: string, statusPasien: any) {
  allData.value.regPeriksa = await fetchDataOrNull(`${config.public.API_V2_URL}/registrasi/periksa/${btoa(noRawat)}`, {
    query: { include: 'pasienBayi,dokter' },
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
  });

  allData.value.kamarInap = await fetchDataOrNull(`${config.public.API_V2_URL}/kamar/inap/${btoa(noRawat)}`, {
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
  });

  allData.value.billing = await fetchDataOrNull(`${config.public.API_V2_URL}/pasien/ranap/${btoa(noRawat)}/billing`, {
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
  }).then((res) => {
    if (res) {
      Object.keys(res.data).forEach((key) => {
        if (typeof res.data[key] === 'number') {
          res.data[key] = Math.round(res.data[key]);
        }
      });
      return res;
    }
  });

  allData.value.diagnosa = await fetchDataOrNull(`${config.public.API_V2_URL}/pasien/diagnosa/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` },
    body: JSON.stringify({
      filters: [{ field: 'no_rawat', operator: '=', value: noRawat }],
      sort: [{ field: 'prioritas', direction: 'asc' }]
    })
  });

  allData.value.prosedur = await fetchDataOrNull(`${config.public.API_V2_URL}/pasien/prosedur/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` },
    body: JSON.stringify({
      filters: [{ field: 'no_rawat', operator: '=', value: noRawat }],
      sort: [{ field: 'prioritas', direction: 'asc' }]
    })
  });

  allData.value.sisDiastole = await fetchDataOrNull(buildUrlTensi(noRm, btoa(noRawat), statusPasien), {
    headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
  });
}

// Fetch data SEP and then other related data
const { data: bridgingSep, pending: bridgingSepPending, error: bridgingSepError } = await useFetch<ResponseSepData>(`${config.public.API_V2_URL}/sep/${no_sep.value}`, {
  method: 'GET',
  query: { include: 'chunk' },
  headers: { Authorization: `Bearer ${tokenStore.accessToken}` },
});

if (bridgingSepError.value) {
  console.error(bridgingSepError);
  toast.add({
    icon: 'i-tabler-circle-x',
    title: 'Error!',
    description: bridgingSepError.value.data.message,
    color: 'red',
    timeout: 2000
  });
} else if (!bridgingSepPending.value && bridgingSep.value) {
  const noRawat = bridgingSep.value.data.no_rawat || '';
  const noRm = bridgingSep.value.data.nomr || '';
  const statusPasien = bridgingSep.value.data.jnspelayanan || 0;

  await fetchAllData(noRawat, noRm, statusPasien);
}

interface Klaim {
  code_cbg: string;
  deskripsi: string;
  tarif: number;
}

interface KlaimResponse {
  data: Klaim;
  message: string;
}


const { data: klaimData, error, status, refresh: refreshLatestKlaim } = await useFetch<KlaimResponse>(`${config.public.API_V2_URL}/sep/${no_sep.value}/klaim/latest`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${tokenStore.accessToken}` }
})

if (error.value) {
  console.error(error)
  toast.add({
    icon: 'i-tabler-circle-x',
    title: 'Error!',
    description: error.value.data.message,
    color: 'red',
    timeout: 2000
  })
}

const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 1
  }).format(value);
}
</script>
