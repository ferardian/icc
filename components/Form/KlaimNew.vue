  <script setup lang="ts">
  import { reactive, onMounted } from 'vue'
  import { Sortable } from "sortablejs-vue3"
  import { FormDataSchema } from '~/common/schema/formData'
  import { addToaster } from '~/common/helpers/toasterHelper'
  import { getTotalTarifRS } from '~/common/helpers/tarifHelper'
  
  import type { FormSubmitEvent } from '#ui/types'
  import type { BillingPasien, Diagnosa, KamarInap, Prosedur, RegPeriksa, SepData, TensiData, FormData } from '~/types';
  
  import { moneyMask } from '~/common/masks'
  import { tarifFields } from '~/data/tarifFields'
  import { getCaraPulangByLabel } from '~/utils/labelToValue'
  import { determineKelas } from '~/common/helpers/naikKelasHelpers'
  import { prepareKlaimData } from '~/common/helpers/PrepareKlaimData'
  import { getEnabledCobData, getCaraBayarData } from '~/utils/getStaticData'
  import { 
    loadingStates,
    fetchDiagnosaIdrg, 
    fetchProsedurIdrg,
    fetchDiagnosaInacbg, 
    fetchProsedurInacbg,
  } from '~/utils/searchDiagnosis'
  import { validasiSITB, inValidasiSITB, sitbState } from '~/services/eklaim/sitbValidation';
  import { fetchDpjp, getTanggalKeluar, kirimOnlineIndividual, moveItemInArray, caraPulangData, caraMasukData } from '~/common/helpers/dataHelpers'
  

  // Declare the new reactive state variables
const showGroupingResult = ref(false);
const groupingData = reactive({
  jenisRawat: '',
  mdc: '',
  mdcCode: '',
  drg: '',
  drgCode: '',
  status: 'normal',
});

// === STATE UNTUK TOMBOL ===
const showGroupingButton = ref(true)       // default: tampilkan tombol grouping
const showFinalButton = ref(false)          // default: tampilkan tombol final
const showEditUlangButton = ref(false)     // default: tombol edit ulang hidden


  const useDiagnosaLocal = ref(false) // flag
  const useProcedureLocal = ref(false) // flag

  const activeDiagnosa = computed(() => {
    return useDiagnosaLocal.value ? diagnosaLocal.value : (diagnosa ?? [])
  })

  const showForm = ref(true)   // default: semua form/komponen hidden
  const showFormInacbg = ref(false)   // default: semua form/komponen hidden
  const loadingSetKlaim = ref(false)
  const isFinalLoading = ref(false)
  const isReeditLoading = ref(false)
  const isImporting = ref(false) // State loading untuk tombol import
  const isFinalInacbgLoading = ref(false);
  const showInacbgImportGroupingButtons = ref(true);
  const showInacbgFinalButton = ref(true);
  const showInacbgReeditButton = ref(false);
  const isReeditInacbgLoading = ref(false);
  const isFinalKlaimLoading = ref(false);
  const isClaimFullyFinal = ref(false);
  const isReeditKlaimLoading = ref(false);
  const showReeditConfirmation = ref(false);
  const isGroupingStage2 = ref(false);
  const stage1Result = ref<any>(null);
  // Letakkan di dekat state lainnya
  const isMounted = ref(false);
  const isSendingClaimOnline = ref(false);
  const statusDcKemkes = ref({
  text: 'Klaim belum terkirim ke Pusat Data Kementerian Kesehatan',
  color: 'red',
  icon: 'i-heroicons-information-circle-20-solid',
  iconColor: 'text-blue-500'
});

// Letakkan di dekat state loading lainnya
const isPrintingClaim = ref(false);


  // Letakkan di dekat state INACBG lainnya

// State untuk melacak ketersediaan opsi Special CMG
const hasSpecialProcedureOptions = ref(false);
const hasSpecialProsthesisOptions = ref(false);
const hasSpecialInvestigationOptions = ref(false);
const hasSpecialDrugOptions = ref(false);

  // State untuk menyimpan daftar pilihan dari API
const specialProcedureOptions = ref([{ code: '', description: 'None' }]);
const specialProsthesisOptions = ref([{ code: '', description: 'None' }]);
const specialInvestigationOptions = ref([{ code: '', description: 'None' }]);
const specialDrugOptions = ref([{ code: '', description: 'None' }]);

// State untuk menyimpan nilai yang dipilih (v-model)
const selectedSpecialProcedure = ref('');
const selectedSpecialProsthesis = ref('');
const selectedSpecialInvestigation = ref('');
const selectedSpecialDrug = ref('');

  // Letakkan ini di dekat deklarasi state lain di <script setup>

  // === STATE UNTUK INACBG ===
  const isInacbgGrouping = ref(false) // Loading state khusus untuk tombol grouping INACBG
  const showInacbgResult = ref(false) // Tampilkan/sembunyikan tabel hasil INACBG
  const inacbgResultData = reactive({
    cbg: '',
    cbg_desc: '',
    groupTariff: 0, // <-- TAMBAHAN BARU
    total_tarif: '',
    kelas: '',
    versi: '',
    specialProcedureTariff: 0,
    specialProcedureCode: '', // <-- Tambahan Baru
    specialProsthesisTariff: 0,
    specialProsthesisCode: '', // <-- Tambahan Baru
    specialInvestigationTariff: 0,
    specialInvestigationCode: '', // <-- Tambahan Baru
    specialDrugTariff: 0,
    specialDrugCode: '', // <-- Tambahan Baru
  })

  
  const diagnosaKey = ref(0)
  
  const isLoading = ref(false)
  const optionLoading = ref(false)
  const openModalSync = ref(false);
  const runtimeConfig = useRuntimeConfig()
  const tokenStore = useAccessTokenStore()
  const { sep, regPeriksa, kamarInap, billing, diagnosa, prosedur, tensi, sudahDiGrouping, refreshLatestKlaim, setTotalTarifRs, setIsVip } = defineProps<{
    sep?: SepData
    regPeriksa?: RegPeriksa,
    kamarInap?: KamarInap
    billing?: BillingPasien,
    diagnosa?: Diagnosa[],
    prosedur?: Prosedur[],
    tensi?: TensiData,
    
    sudahDiGrouping?: boolean,
    
    refreshLatestKlaim: () => void,
    setTotalTarifRs: (tarif: number) => void,
    setIsVip: (vip: boolean) => void
  }>();
  
  // bikin state lokal (reactive)
const diagnosaLocal = ref<Diagnosa[]>(diagnosa ?? [])
const prosedurLocal = ref<Prosedur[]>(prosedur ?? [])


  // state INA-CBG
  const diagnosaInacbg = ref<any[]>([])
  const prosedurInacbg = ref<any[]>([])
  
  
  // Initialize an array to hold the options
  const jenisTarifOptions = reactive<{ label: string; value: string }[]>([])
  const carabayarOptions = reactive<{ label: string; value: string }[]>([])
  const cobOptions = reactive<{ label: string; value: string }[]>([])
  console.log("1. Kode DPJP dari Registrasi:", regPeriksa?.kd_dokter);
  // const { data: dpjp, status: dpjpStatus } = await fetchDpjp(runtimeConfig, tokenStore);
  // GANTI DENGAN BLOK INI

// 1. Deklarasikan state baru untuk menampung opsi DPJP
const dpjpOptions = ref<any[]>([]);

// 2. Panggil API seperti biasa
const { data: dpjp, status: dpjpStatus } = await fetchDpjp(runtimeConfig, tokenStore);

// 3. Logika baru: Cek hasil API dan buat opsi darurat jika perlu
if (dpjp.value?.data && Array.isArray(dpjp.value.data) && dpjp.value.data.length > 0) {
  // Jika API berhasil dan mengembalikan data, gunakan data tersebut
  dpjpOptions.value = dpjp.value.data;
} else if (regPeriksa?.kd_dokter && regPeriksa?.dokter?.nm_dokter) {
  // Jika API gagal TAPI kita punya data default, buat opsi darurat
  console.warn("API DPJP gagal atau kosong, membuat opsi default dari data registrasi.");
  dpjpOptions.value = [{
    kd_dokter: regPeriksa.kd_dokter,
    nm_dokter: regPeriksa.dokter.nm_dokter,
  }];
}
  console.log("2. Daftar Pilihan DPJP (dari API):", JSON.parse(JSON.stringify(dpjp.value)));
  
  // Define the reactive state for the form
  const state = reactive<FormData>({
    payor_label: '',
    payor_id: '',
    payor_cd: '',
    nomor_kartu: sep?.no_kartu ?? '',
    nomor_sep: sep?.no_sep ?? '',
    cob_cd: undefined,
    jenis_rawat: parseInt(`${sep?.jnspelayanan}`),
    upgrade_class_ind: !!sep?.klsnaik,
    icu_indikator: false,
    executive_class_ind: false,
    kelas_rawat: parseInt(`${sep?.jnspelayanan}`) == 1 ? parseInt(`${sep?.klsrawat}`) : 3,
    tgl_masuk: new Date(regPeriksa?.tgl_registrasi + ' ' + regPeriksa?.jam_reg),
    tgl_pulang: undefined,
    age: regPeriksa?.umurdaftar,
    cara_masuk: sep?.chunk?.cara_masuk ?? undefined,
    los: parseInt(`${sep?.jnspelayanan}`) == 1 ? kamarInap?.lama_inap : 1,
    los_in_hour: kamarInap?.lama_jam,
    birth_weight: (regPeriksa?.umurdaftar ?? 0) == 0 || ((regPeriksa?.umurdaftar ?? 0) <= 5 && regPeriksa?.sttsumur.toLowerCase() == 'hr') ? parseInt(`${regPeriksa?.pasien_bayi?.berat_badan}`) : 0,
    adl_sub_acute: undefined,
    adl_chronic: undefined,
    discharge_status: parseInt(`${sep?.jnspelayanan}`) == 1 ? ((await getCaraPulangByLabel(kamarInap?.detail?.[0]?.stts_pulang)).value ?? null) : 1,
    nama_dokter: '',
    kd_dokter: '',
    kode_tarif: "CP",
    co_insidence_ind_jkn: false,
    upgrade_class_class: determineKelas(sep?.klsnaik)?.value,
    upgrade_class_payor: sep?.pembiayaan ?? undefined,
    upgrade_class_los: undefined,
    use_ind: false,
    start_dttm: undefined,
    stop_dttm: undefined,
    icu_los: undefined,
    tarif_poli_eks: 0,
    
    // ===== SITB START
    jkn_sitb_checked_ind: sep?.chunk?.noreg_sitb ? true : false,
    jkn_sitb_noreg: sep?.chunk?.noreg_sitb ?? undefined,
    // ===== SITB END
    
    tarif_rs: {
      prosedur_non_bedah: `${billing?.prosedur_non_bedah ?? "0"}`,
      prosedur_bedah: `${billing?.prosedur_bedah ?? "0"}`,
      konsultasi: `${billing?.konsultasi ?? "0"}`,
      tenaga_ahli: `${billing?.tenaga_ahli ?? "0"}`,
      keperawatan: `${billing?.keperawatan ?? "0"}`,
      penunjang: `${billing?.penunjang ?? "0"}`,
      radiologi: `${billing?.radiologi ?? "0"}`,
      laboratorium: `${billing?.laboratorium ?? "0"}`,
      pelayanan_darah: `${billing?.pelayanan_darah ?? "0"}`,
      rehabilitasi: `${billing?.rehabilitasi ?? "0"}`,
      kamar: `${billing?.kamar ?? "0"}`,
      rawat_intensif: `${billing?.rawat_intensif ?? "0"}`,
      obat: `${Math.ceil(billing?.obat ?? 0).toString()}`,
      obat_kronis: `${billing?.obat_kronis ?? "0"}`,
      obat_kemoterapi: `${billing?.obat_kemoterapi ?? "0"}`,
      alkes: `${billing?.alkes ?? "0"}`,
      bmhp: `${billing?.bmhp ?? "0"}`,
      sewa_alat: `${billing?.sewa_alat ?? "0"}`,
    },

    sistole: tensi?.tensi ? tensi?.tensi.split('/')[0] : '',
    diastole: tensi?.tensi ? tensi?.tensi.split('/')[1] : '',
    
    // diagnosa_inagrouper: [],
    // procedure_inagrouper: [],
    
    usia_kehamilan: sep?.chunk?.usia_kehamilan ?? null,
    gravida: null,
    partus: null,
    abortus: null,
    onset_kontraksi: sep?.chunk?.onset_kontraksi ?? null,
  })
  console.log("3. Nilai state.kd_dokter setelah diatur:", state.kd_dokter);
  
  watch(() => [state.kd_dokter, state.nama_dokter], ([kd_dokter, nama_dokter]) => {
    if (kd_dokter && (dpjp?.value as any)?.data) {
      const dokter = (dpjp?.value as any)?.data.find((d: any) => d.kd_dokter === kd_dokter)

      console.log(`4. Mencari '${kd_dokter}'... Hasil:`, dokter ? 'DOKTER DITEMUKAN' : '== TIDAK DITEMUKAN ==');
      if (dokter) state.nama_dokter = dokter.nm_dokter
      else state.nama_dokter = ''
    } else {
      state.nama_dokter = ''
    }
  })
  
  watch(() => state.tgl_masuk, (tgl_masuk) => {
    if (state.jenis_rawat == 2) {
      state.tgl_pulang = new Date(tgl_masuk)
    }
  })

  watch(
  // Pantau keempat state pilihan Special CMG
  [selectedSpecialProcedure, selectedSpecialProsthesis, selectedSpecialInvestigation, selectedSpecialDrug],
  
  // Fungsi ini akan berjalan setiap kali salah satu dari state di atas berubah
  (newValues, oldValues) => {
    console.log("Special CMG selection changed, triggering Stage 2 grouping...");
    
    // Panggil fungsi grouping stage 2
    if (isMounted.value) {
      console.log("User action detected, triggering Stage 2 grouping...");
      groupingStage2();
    }
  }
);
  
    // Fetch the COB data on component mount
    onMounted(async () => {
      console.log("KlaimNew mounted")
      optionLoading.value = true

    
    showForm.value = true
    showFormInacbg.value = false
      
      state.kd_dokter = regPeriksa?.kd_dokter ?? ''
      state.nama_dokter = regPeriksa?.dokter?.nm_dokter ?? ''
      
      // Set Tanggal Keluar
      let tgl_keluar = ref('') 
      if (kamarInap && kamarInap.detail.length > 0) {
        tgl_keluar = computed(() => getTanggalKeluar(kamarInap));
      }
      
      if (state.jenis_rawat == 1) { // Set Tanggal Pulang by jenis rawat (1 = Rawat Inap, 2 = Rawat Jalan)
        state.tgl_pulang = new Date(tgl_keluar.value)
      } else {
        state.tgl_pulang = state.tgl_masuk
      }

      try {
      console.log("masuk try")  
      console.log("Jenis Rawat:", state.jenis_rawat)
      console.log("SEP:", sep)
      const { data, error, status, execute } = await useFetch(
        `${runtimeConfig.public.API_V2_URL}/eklaim/idrg/${sep?.no_sep}`,
        {
          headers: {
            Authorization: `Bearer ${tokenStore?.accessToken}`,
            Accept: 'application/json',
          },
           immediate: false,   // <--- paksa jalan langsung
        }
      )

      // jalankan fetch
await execute()
      console.log("STATUS:", status.value)
console.log("ERROR:", error.value)
console.log("DATA RAW:", data.value)
console.log("FULL RESPONSE:", JSON.stringify(data.value, null, 2))
      console.log("Data INI : ",data.value)

      if (error.value) {
      console.log("eror")

        console.error("Gagal ambil klaim:", error.value)
      } else if (data.value) {
        console.log("sukses")
        // parse isi kolom JSON
        let claimRes = null
        try {
          claimRes = JSON.parse(data.value.set_claim_res)
        } catch (e) {
          console.warn("Format JSON tidak valid:", e)
        }

          console.log("Parsed claimRes:", claimRes)

        if (claimRes?.metadata?.code === 200) {
          showForm.value = true
          console.log("Showform:",showForm.value)
        }

        // New logic for grouper_res
        let grouperRes = null;
        try {
            grouperRes = JSON.parse(data.value.grouper_res);
        } catch (e) {
            console.warn("Format JSON grouper_res tidak valid:", e);
        }

        if (grouperRes?.metadata?.code === 200) {
            const res = grouperRes.response_idrg;
            if (res) {
                showGroupingResult.value = true;
                groupingData.jenisRawat = `${state.jenis_rawat === 1 ? 'Rawat Inap' : 'Rawat Jalan'} (${state.los} Hari)`;
                groupingData.mdc = res.mdc_description;
                groupingData.mdcCode = res.mdc_number;
                groupingData.drg = res.drg_description;
                groupingData.drgCode = res.drg_code;
                groupingData.status = 'normal'; // The JSON indicates a 'normal' status
                groupingData.mdcCode = res.mdc_number; // Pastikan mdcCode terisi

                // =======================================================
                // KONDISI BARU UNTUK MDC NUMBER 36
                // =======================================================
                if (res.mdc_number !== '36') {
                  showFinalButton.value = true;
                } else {
                  showFinalButton.value = false;
                }

                 
            }
        }

      // --- NEW: parsing idrg_diagnosa_res ---
  let diagnosaRes = null
  try {
    diagnosaRes = JSON.parse(data.value.idrg_diagnosa_res)
  } catch (e) {
    console.warn("Format JSON idrg_diagnosa_res tidak valid:", e)
  }

  diagnosaLocal.value = []  // reset dulu
  if (diagnosaRes?.metadata?.code === 200) {
    const dxList = diagnosaRes.data?.expanded ?? []
    diagnosaLocal.value = dxList.map((dx: any) => ({
      kd_penyakit: dx.code,
      penyakit: {
        kd_penyakit: dx.code,
        nm_penyakit: dx.display
      }
    }))
    useDiagnosaLocal.value = true
    console.log("Loaded diagnosa dari idrg_diagnosa_res:", diagnosaLocal.value)
  } else {
    // fallback: pakai props diagnosa yang lama
    // fallback ke props diagnosa
    useDiagnosaLocal.value = false
    diagnosaLocal.value = diagnosa ?? []
  }

 // --- parsing idrg_procedure_res ---
let procedureRes = null
try {
  procedureRes = JSON.parse(data.value.idrg_procedure_res)
} catch (e) {
  console.warn("Format JSON idrg_procedure_res tidak valid:", e)
}

prosedurLocal.value = [] // reset
if (procedureRes?.metadata?.code === 200) {
  const pxList = procedureRes.data?.expanded ?? []
  prosedurLocal.value = pxList.map((px: any) => ({
    kode: px.code,
    penyakit: {
      deskripsi_panjang: px.display
    },
    jumlah: px.multiplicity ? Number(px.multiplicity) : 1 // ✅ ambil jumlah dari multiplicity
  }))
  useProcedureLocal.value = true
  console.log("Loaded prosedur dari idrg_procedure_res:", prosedurLocal.value)
} else {
  useProcedureLocal.value = false
  prosedurLocal.value = prosedur ?? []
}

// --- NEW: parsing final_res ---
let finalRes = null
try {
  finalRes = JSON.parse(data.value.final_res)
} catch (e) {
  console.warn("Format JSON final_res tidak valid:", e)
}

final_res.value = finalRes 

if (finalRes?.metadata?.code === 200) {
  final_res.value = finalRes
  console.log("Final grouper sudah sukses:", finalRes)

  // hide tombol Grouping & Final
  showGroupingButton.value = false
  showFinalButton.value = false

  // tampilkan tombol Edit Ulang IDRG
  showEditUlangButton.value = true

  // Tampilkan form INACBG
  showFormInacbg.value = true
  showInacbgResult.value = false;
} else {
  // kalau belum final, tetap tampilkan tombol Grouping & Final
  showGroupingButton.value = true
  // showFinalButton.value = true
  showEditUlangButton.value = false
}

// --- NEW: parsing reedit_res ---
let reeditRes = null
try {
  reeditRes = JSON.parse(data.value.reedit_res)
} catch (e) {
  console.warn("Format JSON reedit_res tidak valid:", e)
}

if (reeditRes?.metadata?.code === 200) {
  console.log("Re-edit IDRG aktif:", reeditRes)

   // DIUTAMAKAN: Reset status final agar form kembali aktif.
  // Ini akan membuat isFinalSuccess menjadi false.
  final_res.value = null;

  // Tampilkan tombol Grouping & Final lagi
  showGroupingButton.value = true
  showFinalButton.value = true

  // Hide tombol Edit Ulang IDRG
  showEditUlangButton.value = false
  showInacbgResult.value = false;
}

// Di dalam onMounted, setelah blok parsing 'reeditRes'...
// Gantikan SEMUA logika loading data INACBG dengan blok tunggal di bawah ini.

// =========================================================================
// AWAL BLOK FINAL UNTUK MEMUAT DATA INACBG
// =========================================================================

// Inisialisasi/kosongkan dulu state
diagnosaInacbg.value = [];
prosedurInacbg.value = [];

let inacbgDxLoaded = false;
let inacbgPxLoaded = false;

// --- PRIORITAS 1: Coba muat dari data INACBG yang sudah tersimpan ---
try {
    const savedDx = JSON.parse(data.value.inacbg_diagnosa_res);
    if (savedDx?.metadata?.code === 200 && Array.isArray(savedDx.data?.expanded)) {
        console.log("SUCCESS: Memuat diagnosa INACBG dari data tersimpan (prioritas). Item:", savedDx.data.expanded.length);
        diagnosaInacbg.value = savedDx.data.expanded.map((dx: any, index: number) => ({
            id: `dx-${dx.code}-${index}-${Date.now()}`,
            kd_penyakit: dx.code,
            penyakit: { kd_penyakit: dx.code, nm_penyakit: dx.display },
             is_valid: dx.metadata.code == 200,
            status_message: dx.metadata.message,
        }));
        inacbgDxLoaded = true;
    }
} catch (e) { /* Gagal parse, biarkan flag 'false' */ }

try {
    const savedPx = JSON.parse(data.value.inacbg_procedure_res);
    if (savedPx?.metadata?.code === 200 && Array.isArray(savedPx.data?.expanded)) {
        console.log("SUCCESS: Memuat prosedur INACBG dari data tersimpan (prioritas).");
        prosedurInacbg.value = savedPx.data.expanded.map((px: any, index: number) => ({
            id: `px-${px.code}-${index}-${Date.now()}`,
            kode: px.code,
            penyakit: { kode: px.code, deskripsi_panjang: px.display },
            jumlah: px.multiplicity ? Number(px.multiplicity) : 1,
            is_valid: px.metadata.code == 200,
            status_message: px.metadata.message,
        }));
        inacbgPxLoaded = true;
    }
} catch (e) { /* Gagal parse, biarkan flag 'false' */ }

// --- PRIORITAS 2 (FALLBACK): Jika data prioritas gagal dimuat, coba dari hasil import iDRG ---
if (!inacbgDxLoaded || !inacbgPxLoaded) {
    try {
        const importRes = JSON.parse(data.value.import_idrg_to_inacbg_res);
        if (importRes?.metadata?.code === 200 && importRes.data) {
            
            if (!inacbgDxLoaded) {
                console.log("FALLBACK: Memuat diagnosa INACBG dari hasil import iDRG.");
                const diagnosaData = importRes.data?.diagnosa?.expanded;
                if (Array.isArray(diagnosaData)) {
                    diagnosaInacbg.value = diagnosaData.map((dx: any, index: number) => ({
                        id: `dx-import-${dx.code}-${index}-${Date.now()}`,
                        kd_penyakit: dx.code,
                        penyakit: { kd_penyakit: dx.code, nm_penyakit: dx.display },
                        is_valid: dx.metadata.code == 200,
                        status_message: dx.metadata.message,
                    }));
                }
            }

            if (!inacbgPxLoaded) {
                console.log("FALLBACK: Memuat prosedur INACBG dari hasil import iDRG.");
                const prosedurData = importRes.data?.procedure?.expanded;
                if (Array.isArray(prosedurData)) {
                    prosedurInacbg.value = prosedurData.map((px: any, index: number) => ({
                        // Pastikan ada ID unik untuk Sortable
                        id: `px-import-${px.code}-${index}-${Date.now()}`,
                        kode: px.code,
                        penyakit: { 
                            kode: px.code, 
                            deskripsi_panjang: px.display 
                        },
                        is_valid: px.metadata.code == 200, 
                        status_message: px.metadata.message,
                        
                    }));
                }
            }
        }
    } catch (e) { /* Gagal parse, tidak ada data import */ }
}
// =========================================================================
// AKHIR BLOK FINAL
// =========================================================================




// // --- BARU: Parsing hasil grouping INA-CBG yang sudah ada ---
// let inacbgGrouperRes = null;
// try {
//   // Pastikan nama kolom 'inacbg_grouper_res' sesuai dengan yang ada di respons API Anda
//   inacbgGrouperRes = JSON.parse(data.value.grouper_inacbg_stage1_res); 
// } catch (e) {
//   console.warn("Format JSON inacbg_grouper_res tidak valid atau tidak ada");
// }

// if (inacbgGrouperRes?.metadata?.code === 200) {
//   console.log("Memuat hasil grouping INACBG yang sudah ada:", inacbgGrouperRes);

//   const cbgResult = inacbgGrouperRes.response_inacbg; // Sesuaikan dengan struktur respons Anda
  

//     // Mengaktifkan tampilan hasil
//     showInacbgResult.value = true;
    
//   if (cbgResult) {
//     showInacbgResult.value = true;
//     inacbgResultData.cbg = cbgResult.cbg.code;
//     inacbgResultData.cbg_desc = cbgResult.cbg.description;
//     inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(cbgResult.base_tariff)}`;
//     inacbgResultData.kelas = cbgResult.kelas;
//     inacbgResultData.versi = cbgResult.version;

//      // =======================================================
//       // PENYESUAIAN: Cek jika grouping gagal (ada 'X')
//       // =======================================================
//       if (cbgResult.cbg.code.includes('X')) {
//         showInacbgFinalButton.value = false;
//       } else {
//         showInacbgFinalButton.value = true;

//       }

//             // Reset pilihan setiap kali grouping stage 1 dijalankan
//       specialProcedureOptions.value = [{ code: '', description: 'None' }];
//       specialProsthesisOptions.value = [{ code: '', description: 'None' }];
//       specialInvestigationOptions.value = [{ code: '', description: 'None' }];
//       specialDrugOptions.value = [{ code: '', description: 'None' }];
      
//       hasSpecialProcedureOptions.value = false;
//       hasSpecialProsthesisOptions.value = false;
//       hasSpecialInvestigationOptions.value = false;
//       hasSpecialDrugOptions.value = false;

//       // Proses dan pilah opsi Special CMG dari response
//       const specialOptions = inacbgGrouperRes.special_cmg_option;
//       if (specialOptions && Array.isArray(specialOptions)) {
//         specialOptions.forEach((opt: any) => {
//           switch (opt.type) {
//            case 'Special Procedure':
//         specialProcedureOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialProcedureOptions.value = true;
//         break;
//       case 'Special Prosthesis':
//         specialProsthesisOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialProsthesisOptions.value = true;
//         break;
//       case 'Special Investigation':
//         specialInvestigationOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialInvestigationOptions.value = true;
//         break;
//       case 'Special Drug':
//         specialDrugOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialDrugOptions.value = true;
//         break;
//           }
//         });
//       }
//   }
// }

// try {
//   // Pastikan nama kolom ini sesuai dengan respons API Anda
//   const stage2Res = JSON.parse(data.value.grouper_inacbg_stage2_res); 

//   if (stage2Res?.metadata?.code === 200) {
//     console.log("SUCCESS: Memuat hasil dan OPSI grouping INACBG Stage 2.", stage2Res);
    
//     // =======================================================
//     // BAGIAN BARU: Isi ulang OPSI dropdown dari response Stage 2
//     // =======================================================
//     const specialOptions = stage2Res.special_cmg.special_cmg_option;
//     if (specialOptions && Array.isArray(specialOptions)) {
//       // Reset pilihan
//       specialProcedureOptions.value = [{ code: '', description: 'None' }];
//       specialProsthesisOptions.value = [{ code: '', description: 'None' }];
//       specialInvestigationOptions.value = [{ code: '', description: 'None' }];
//       specialDrugOptions.value = [{ code: '', description: 'None' }];
      
//       hasSpecialProcedureOptions.value = false;
//       hasSpecialProsthesisOptions.value = false;
//       hasSpecialInvestigationOptions.value = false;
//       hasSpecialDrugOptions.value = false;

      
//       // Isi pilihan dari response stage 2
//       specialOptions.forEach((opt: any) => {
//         switch (opt.type) {
//            case 'Special Procedure':
//         specialProcedureOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialProcedureOptions.value = true;
//         break;
//       case 'Special Prosthesis':
//         specialProsthesisOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialProsthesisOptions.value = true;
//         break;
//       case 'Special Investigation':
//         specialInvestigationOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialInvestigationOptions.value = true;
//         break;
//       case 'Special Drug':
//         specialDrugOptions.value.push({ code: opt.code, description: opt.description });
//         hasSpecialDrugOptions.value = true;
//         break;
//         }
//       });
//     }

//     // Lanjutkan dengan logika yang sudah ada untuk mengisi hasil dan nilai terpilih
//     const cbgResult = stage2Res.response_inacbg;
    
//     // 1. Perbarui Total Klaim
//     inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(cbgResult.tariff)}`;

//     // 2. Perbarui tarif, kode, DAN nilai dropdown yang terpilih
//     const specialCmgs = cbgResult.special_cmg;
//     if (specialCmgs && Array.isArray(specialCmgs)) {
//       specialCmgs.forEach((cmg: any) => {
//         // ... (logika switch-case Anda untuk mengisi tarif dan v-model) ...
//       });
//     }
//   }
// } catch (e) {
//   // Normal jika belum pernah grouping stage 2
// }


// =========================================================================
// BLOK PENGGANTI: Memproses Hasil & Opsi Grouping INACBG (Stage 1 & 2)
// =========================================================================
try {
  // 1. Parse kedua hasil grouping di awal (jika ada)
  const stage1Res = data.value.grouper_inacbg_stage1_res ? JSON.parse(data.value.grouper_inacbg_stage1_res) : null;
  const stage2Res = data.value.grouper_inacbg_stage2_res ? JSON.parse(data.value.grouper_inacbg_stage2_res) : null;

  // Tentukan sumber data utama (prioritaskan Stage 2 jika ada)
  const resultSource = stage2Res || stage1Res;

  // 2. Jika ada sumber data, proses OPSI terlebih dahulu
  if (resultSource) {
    // 2. Tampilkan tabel hasil
    showInacbgResult.value = true;
    const optionsSource = stage2Res || stage1Res; 
    const specialOptions = optionsSource.special_cmg_option;
    stage1Result.value = stage2Res || stage1Res;
    
    // Reset dan isi ulang daftar pilihan dropdown
    specialProcedureOptions.value = [{ code: '', description: 'None' }]; hasSpecialProcedureOptions.value = false;
    specialProsthesisOptions.value = [{ code: '', description: 'None' }]; hasSpecialProsthesisOptions.value = false;
    specialInvestigationOptions.value = [{ code: '', description: 'None' }]; hasSpecialInvestigationOptions.value = false;
    specialDrugOptions.value = [{ code: '', description: 'None' }]; hasSpecialDrugOptions.value = false;
    
    
    if (specialOptions && Array.isArray(specialOptions)) {
      specialOptions.forEach((opt: any) => {
        switch (opt.type) {
          case 'Special Procedure': specialProcedureOptions.value.push(opt); hasSpecialProcedureOptions.value = true; break;
          case 'Special Prosthesis': specialProsthesisOptions.value.push(opt); hasSpecialProsthesisOptions.value = true; break;
          case 'Special Investigation': specialInvestigationOptions.value.push(opt); hasSpecialInvestigationOptions.value = true; break;
          case 'Special Drug': specialDrugOptions.value.push(opt); hasSpecialDrugOptions.value = true; break;
        }
      });
    }
    
    // 3. Setelah OPSI siap, proses HASIL dan atur NILAI TERPILIH (v-model)
    const payload = resultSource.message || resultSource;
    const cbgResult = payload.response_inacbg;
     // =======================================================
    // TAMBAHKAN LOG DEBUG INI UNTUK MELIHAT ISI DATA
    // =======================================================
    console.log("DEBUG: Obyek cbgResult yang akan ditampilkan:", JSON.parse(JSON.stringify(cbgResult)));
    
    if (cbgResult) {
      inacbgResultData.groupTariff = parseInt(cbgResult.base_tariff, 10);
      showInacbgResult.value = true;
      inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(cbgResult.tariff)}`;
      inacbgResultData.cbg = cbgResult.cbg.code;
      inacbgResultData.cbg_desc = cbgResult.cbg.description;
      
      if (stage2Res) { // Proses detail hanya jika ada hasil stage 2
        const specialCmgs = cbgResult.special_cmg;
        if (specialCmgs && Array.isArray(specialCmgs)) {
          specialCmgs.forEach((cmg: any) => {
            const tariff = parseInt(cmg.tariff, 10);
               
            
            // =======================================================
            // LOGIKA DISERDERHANAKAN SESUAI PERMINTAAN ANDA
            // =======================================================
            switch (cmg.type) {
              case 'Special Procedure':
                // Implementasi komparasi cerdas
                const cleanCmgProcCode = cmg.code.replace(/-/g, '').toUpperCase();
                const procOpt = specialProcedureOptions.value.find(o => 
                  o.code && cleanCmgProcCode.includes(o.code.toUpperCase())
                );
                if (procOpt) selectedSpecialProcedure.value = procOpt.code;
                
                inacbgResultData.specialProcedureTariff = tariff;
                inacbgResultData.specialProcedureCode = cmg.code;
                break;
              case 'Special Prosthesis':
               let prosOpt = null;
              // =======================================================
              // LOGIKA BARU: Membandingkan kata terakhir (Hip/Knee)
              // =======================================================
              // Ambil kata terakhir dari kode hasil, contoh: "RR-04-III-Hip" -> "hip"
              const cmgSuffix = cmg.code.split('-').pop()?.toLowerCase();

              if (cmgSuffix) {
                // Cari di daftar pilihan yang memiliki akhiran yang sama
                prosOpt = specialProsthesisOptions.value.find(o => {
                  if (!o.code) return false;
                  // Ambil akhiran dari kode pilihan, contoh: "RR04Hip" -> "hip"
                  const optSuffix = o.code.replace('RR04', '').toLowerCase();
                  return optSuffix === cmgSuffix;
                });
              }
              
              if (prosOpt) {
                selectedSpecialProsthesis.value = prosOpt.code;
              }

              inacbgResultData.specialProsthesisTariff = tariff;
              inacbgResultData.specialProsthesisCode = cmg.code;
                break;
            }
          });
        }
      }
    }
  }
} catch (e) {
  console.error("Gagal memproses hasil grouping INACBG di onMounted:", e);
}
// Tambahkan blok ini di dalam onMounted, setelah parsing lainnya

try {
  // Asumsi hasil final INA-CBG disimpan di kolom 'inacbg_final_res'
  const finalInacbgRes = JSON.parse(data.value.final_inacbg_res);
  if (finalInacbgRes?.metadata?.code === 200) {
    console.log("SUCCESS: Klaim INA-CBG sudah final.");
    showInacbgImportGroupingButtons.value = false;
    showInacbgFinalButton.value = false;
    showInacbgReeditButton.value = true;
  }
} catch (e) {
  // Normal jika belum pernah final
}

// Di dalam onMounted, setelah blok 'try-catch' untuk 'final_inacbg_res'...

// ===================================================================
// TAMBAHKAN BLOK INI UNTUK MENANGANI RE-EDIT INACBG
// ===================================================================
try {
  // Asumsi hasil re-edit INACBG disimpan di kolom 'reedit_inacbg_res'
  const reeditInacbgRes = JSON.parse(data.value.reedit_inacbg_res); 

  if (reeditInacbgRes?.metadata?.code === 200) {
    console.log("INFO: Klaim terdeteksi dalam mode Edit Ulang INACBG.");
    
    // Pastikan status final total nonaktif
    isClaimFullyFinal.value = false;
    
    // Kembalikan tombol-tombol INACBG ke kondisi awal untuk bisa diedit kembali
    showInacbgImportGroupingButtons.value = true;
    showInacbgFinalButton.value = true;
    
    // Sembunyikan tombol "Edit Ulang INACBG" itu sendiri
    showInacbgReeditButton.value = false;
  }
} catch (e) {
  // Ini normal jika klaim belum pernah di-reedit, jadi biarkan kosong
}


// Letakkan blok ini di dalam onMounted, setelah semua parsing lainnya

// --- MEMERIKSA STATUS FINAL KLAIM SECARA KESELURUHAN ---
try {
  // Pastikan nama kolom 'claim_final_res' sesuai dengan respons API Anda
  const claimFinalRes = JSON.parse(data.value.final_klaim_res); 

  if (claimFinalRes?.metadata?.code === 200) {
    console.log("SUCCESS: Klaim ini sudah difinalisasi total.");
    
    // Sembunyikan semua tombol aksi utama jika klaim sudah final
    showGroupingButton.value = false;
    showFinalButton.value = false;
    showEditUlangButton.value = false;
    
    showInacbgImportGroupingButtons.value = false;
    showInacbgFinalButton.value = false;
    showInacbgReeditButton.value = false;
    isClaimFullyFinal.value = true;
  }
} catch (e) {
  // Normal jika klaim belum final
}

// --- TAMBAHKAN BLOK INI UNTUK MENANGANI RE-EDIT KLAIM TOTAL ---
try {
  // Asumsi hasil re-edit total disimpan di kolom 'reedit_claim_res'
  const reeditClaimRes = JSON.parse(data.value.reedit_klaim_res); 

  if (reeditClaimRes?.metadata?.code === 200) {
    console.log("INFO: Klaim dalam mode Edit Ulang Total.");
    
    // Sembunyikan status & footer final
    isClaimFullyFinal.value = false;
    
    // Tampilkan KEDUA tombol "Edit Ulang"
    showEditUlangButton.value = true;      // Tampilkan "Edit Ulang IDRG"
    showInacbgReeditButton.value = true;   // Tampilkan "Edit Ulang INACBG"

    // Sembunyikan tombol aksi lainnya (grouping/final)
    showGroupingButton.value = false;
    showFinalButton.value = false;
    showInacbgImportGroupingButtons.value = false;
    showInacbgFinalButton.value = false;
    
    // Pastikan form INACBG terlihat agar tombolnya bisa diakses
    showFormInacbg.value = true;
  }
} catch (e) {
  // Normal jika klaim belum pernah di-reedit total, jadi tidak perlu ada error
}

// Tambahkan blok ini di dalam onMounted, setelah parsing lainnya

// --- MEMERIKSA STATUS PENGIRIMAN KLAIM ONLINE ---
try {
  const sendClaimRes = JSON.parse(data.value.send_klaim_res); 
  if (sendClaimRes?.metadata?.code === 200) {
    console.log("INFO: Klaim ini sudah pernah terkirim online.");
    
    // Atur status ke "Terkirim"
    statusDcKemkes.value = {
      text: 'Terkirim',
      color: 'green',
      icon: 'i-heroicons-check-circle-20-solid',
      iconColor: 'text-green-500'
    };
  }
} catch (e) {
  // Normal jika klaim belum pernah terkirim
}

      }
      
    } finally {
      optionLoading.value = false
    }
      
      setTimeout(async () => {
        try {
          const [cob, cbo, jto] = await Promise.all([
          getEnabledCobData(),
          getCaraBayarData(),
          getJenisTarifData(),
          ]);
          
          state.payor_label = state.payor_cd = cbo[0].label
          state.payor_id = cbo[0].value
          
          cobOptions.push(...cob);
          carabayarOptions.push(...cbo);
          jenisTarifOptions.push(...jto);
        } catch (error) {
          console.error('Failed to load COB options:', error)
        }
        
        optionLoading.value = false
      }, 1300)
      
      setTotalTarifRs(getTotalTarifRS(state))
      setIsVip(determineKelas(sep?.klsnaik)?.code == 8)
      
      // if state.jkn_noreg_sitb is truly make sitbState.valid = true
      if (state.jkn_sitb_checked_ind) {
        sitbState.valid = true
      }
      nextTick(() => {
    isMounted.value = true;
  });
    })

    
  
  const onChangePayorCd = (payor: CarabayarData) => {
    state.payor_label = payor.label
    state.payor_cd = payor.description
    state.payor_id = payor.value
  }

  const setKlaim = async () => {
  isLoading.value = true

  try {
    if (sep?.no_sep == '' || sep?.no_sep == undefined) {
      throw new Error('Nomor SEP tidak ada, silahkan cek kembali data pasien')
    }

    if (state.upgrade_class_ind) {
      if (!state.upgrade_class_class) {
        throw new Error('Kelas pelayanan tidak boleh kosong')
      } else if (!state.upgrade_class_payor) {
        throw new Error('Pembiayaan tidak boleh kosong')
      } else if (!state.upgrade_class_los) {
        throw new Error('Lama upgrade kelas tidak boleh kosong')
      }
    }

    state.birth_weight = isNaN(parseInt(state.birth_weight))
      ? 0
      : parseInt(state.birth_weight)

    // siapkan data request
    const mappedData = prepareKlaimData(state)
    console.log("FINAL PAYLOAD >>>", JSON.stringify(mappedData, null, 2))

    // mappedData.diagnosa =
    //   diagnosa?.length == 0 ? ['#'] : diagnosa?.map(d => d.kd_penyakit)
    // mappedData.procedure =
    //   prosedur?.length == 0 ? ['#'] : prosedur?.map(p => p.kode)

    const { data, error, refresh, status } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep?.no_sep}`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        method: 'POST',
         body: JSON.stringify(mappedData) 
      }
    )

    if (error.value) {
      throw new Error(error.value.data.message)
    }

    if (status.value == 'success') {
      refreshLatestKlaim()
      addToaster(
        'Success',
        'Data berhasil disimpan & di grouping',
        'green',
        'i-tabler-discount-check-filled'
      )

      // tampilkan komponen diagnosa & prosedur setelah sukses
      showForm.value = true
    }
  } catch (error: any) {
    addToaster(
      'Error',
      error.message,
      'red',
      'i-tabler-info-circle-filled'
    )
  } finally {
    isLoading.value = false
  }
}

const groupingDiagnosaSet = async () => {
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    // Ambil kode diagnosa & prosedur
    const diagnosaPayload = getCurrentDiagnosa().length
  ? getCurrentDiagnosa().map((d) => d.kd_penyakit).join("#")
  : "#"


    const prosedurPayload = prosedur?.length
      ? prosedur.map((p) => p.kode).join("#")
      : "#"

    // Siapkan payload sesuai endpoint idrg_procedure_set
    const payload = {
      metadata: {
        method: "idrg_diagnosis_set", // atau "idrg_procedure_set"
        nomor_sep: sep.no_sep,
      },
      data: {
        diagnosa: diagnosaPayload,
        procedure: prosedurPayload,
      },
    }

    console.log("PAYLOAD GROUPING >>>", payload)

    const { data, error, status } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/grouping`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(payload),
      }
    )

    if (error.value) {
      throw new Error(error.value.data.message || "Gagal grouping diagnosa")
    }

    if (status.value === "success" && data.value) {
      addToaster(
        "Success",
        "Grouping diagnosa & prosedur berhasil",
        "green",
        "i-tabler-discount-check-filled"
      )
         // --- PARSE grouper_res ---
     
  console.log("RAW RESPONSE GROUPING >>>", data.value)
  const msg = data.value.message
      if (msg?.metadata?.code === 200) {
   const res = msg.response_idrg
    if (res) {
      showGroupingResult.value = true
    groupingData.jenisRawat = `${state.jenis_rawat === 1 ? 'Rawat Inap' : 'Rawat Jalan'} (${state.los} Hari)`
    groupingData.mdc = res.mdc_description
    groupingData.mdcCode = res.mdc_number
    groupingData.drg = res.drg_description
    groupingData.drgCode = res.drg_code
    groupingData.status = "normal"

    console.log(">>> SET STATE GROUPING", {
      showGroupingResult: showGroupingResult.value,
      groupingData: { ...groupingData }
    })
    }
  }
      // refreshLatestKlaim()
    }
  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  }
}

const saveAndGroupingKlaim = async () => {
  isLoading.value = true
  showInacbgResult.value = false;
  try {
    

    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    if (state.upgrade_class_ind) {
      if (!state.upgrade_class_class) {
        throw new Error('Kelas pelayanan tidak boleh kosong')
      } else if (!state.upgrade_class_payor) {
        throw new Error('Pembiayaan tidak boleh kosong')
      } else if (!state.upgrade_class_los) {
        throw new Error('Lama upgrade kelas tidak boleh kosong')
      }
    }

    state.birth_weight = isNaN(parseInt(state.birth_weight))
      ? 0
      : parseInt(state.birth_weight)
    // === STEP 1: Set Claim ===
    const mappedData = prepareKlaimData(state)
    console.log("FINAL PAYLOAD SET_CLAIM >>>", mappedData)

    const { data: setData, error: setError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify(mappedData),
      }
    )

    if (setError.value) {
      throw new Error(setError.value.data?.message || "Gagal set klaim")
    }

    console.log("RESPON SET_CLAIM >>>", setData.value)

    // tampilkan form setelah klaim berhasil
    showForm.value = true

    // === STEP 2: Grouping ===

    // 🔹 ambil diagnosa
const diagnosaPayload = getCurrentDiagnosa().length
  ? getCurrentDiagnosa().map((d) => d.kd_penyakit).join("#")
  : "#"

// prosedur sekarang via helper yang meng-handle multiplicity
const prosedurPayload = getProsedurPayload()

console.log('DEBUG => prosedurPayload', prosedurPayload)


    const { data: groupData, error: groupError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/grouping`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          nomor_sep: sep.no_sep,
          diagnosa: diagnosaPayload,
          procedure: prosedurPayload,
        }),
      }
    )

    if (groupError.value) {
      throw new Error(groupError.value.data?.message || "Gagal grouping")
    }

    console.log("RESPON GROUPING >>>", groupData.value)

    const msg = groupData.value?.metadata ? groupData.value : groupData.value?.message
    if (msg?.metadata?.code === 200) {
      const res = msg.response_idrg
      showGroupingResult.value = true
      groupingData.jenisRawat = `${state.jenis_rawat === 1 ? 'Rawat Inap' : 'Rawat Jalan'} (${state.los} Hari)`
      groupingData.mdc = res.mdc_description
      groupingData.mdcCode = res.mdc_number
      groupingData.drg = res.drg_description
      groupingData.drgCode = res.drg_code
      groupingData.status = "normal"
      groupingData.mdcCode = res.mdc_number; // Pastikan mdcCode terisi
  
      // =======================================================
      // KONDISI BARU UNTUK MDC NUMBER 36
      // =======================================================
      if (res.mdc_number === '36') {
        showFinalButton.value = false;
        addToaster("Informasi", "Hasil Grouping tidak dapat difinalisasi (MDC: 36)", "blue", "i-tabler-discount-check-filled");
      } else {
        showFinalButton.value = true;
      }
    }

    addToaster("Success", "Set klaim & grouping berhasil", "green", "i-tabler-discount-check-filled")

    // refresh data klaim terakhir
    refreshLatestKlaim()

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  } finally {
    isLoading.value = false
  }
}

const final_res = ref<any>(null) // simpan hasil respon final

const isFinalSuccess = computed(() => {
  return final_res.value?.metadata?.code === 200
})

const finalGrouper = async () => {
  isFinalLoading.value = true
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    // === STEP: Final Grouper ===
    const { data: finalData, error: finalError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/final`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          metadata: { method: "idrg_grouper_final" },
          data: { nomor_sep: sep.no_sep },
        }),
      }
    )

    if (finalError.value) {
      throw new Error(finalError.value.data?.message || "Gagal final grouper")
    }

    console.log("RESPON FINAL GROUPER >>>", finalData.value)

      // simpan hasil ke state
    final_res.value = finalData.value 
      

      // === VALIDASI JIKA FINAL BERHASIL ===
    if (final_res.value?.metadata?.code === 200) {
      showGroupingButton.value = false
      showFinalButton.value = false
      showEditUlangButton.value = true
      showFormInacbg.value = true
      showInacbgResult.value = false; 
    }


    addToaster("Success", "Final grouper berhasil", "green", "i-tabler-discount-check-filled")

    // refresh data klaim terakhir
    refreshLatestKlaim()
  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  } finally {
    isFinalLoading.value = false
  }
}

const editUlangIdrg = async () => {
  isReeditLoading.value = true
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    const { data: reeditData, error: reeditError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/reedit`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          metadata: { method: "idrg_grouper_reedit" },
          data: { nomor_sep: sep.no_sep },
        }),
      }
    )

    if (reeditError.value) {
      throw new Error(reeditError.value.data?.message || "Gagal edit ulang IDRG")
    }

    console.log("RESPON REEDIT GROUPER >>>", reeditData.value)

    // TAMBAHKAN BARIS DI BAWAH INI
    final_res.value = null; // Reset status final di frontend

    addToaster("Success", "Edit ulang IDRG berhasil", "green", "i-tabler-discount-check-filled")

    // setelah reedit, tampilkan lagi tombol Grouping & Final
    showGroupingButton.value = true
    showFinalButton.value = true
    showEditUlangButton.value = false
    showFormInacbg.value = false
    showInacbgImportGroupingButtons.value = true; // Munculkan lagi tombol Import & Grouping
    showInacbgFinalButton.value = true; // Siapkan tombol Final untuk proses berikutnya
    showInacbgReeditButton.value = false; // Sembunyikan tombol Edit Ulang INACBG

    // refresh data klaim
    refreshLatestKlaim()
  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  } finally {
    isReeditLoading.value = false
  }
}


const importIdrgToInacbg = async () => {
  isImporting.value = true
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    // Endpoint ini harus sesuai dengan yang Anda definisikan di backend
    const { data: importData, error: importError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/import-idrg`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          metadata: { method: "idrg_to_inacbg_import" },
          data: { nomor_sep: sep.no_sep },
        }),
      }
    )

    if (importError.value) {
      throw new Error(importError.value.data?.message || "Gagal mengimpor data coding iDRG")
    }

    console.log("RESPON IMPORT CODING >>>", importData.value)

    const response = importData.value;
    if (response?.metadata?.code === 200 && response?.data) {
      // Kosongkan data INACBG yang ada
      diagnosaInacbg.value = []
      prosedurInacbg.value = []

      // Isi dengan data hasil import dari response API
      const diagnosaData = response.data?.diagnosa?.expanded;
      if (diagnosaData && Array.isArray(diagnosaData)) {
        diagnosaInacbg.value = diagnosaData.map((dx: any) => ({
          kd_penyakit: dx.code,
          penyakit: {
            kd_penyakit: dx.code,
            nm_penyakit: dx.display,
          },
          // TAMBAHAN: Cek pesan error dari metadata
          is_valid: dx.metadata.code == 200, 
          status_message: dx.metadata.message,
        }));
      }

      const prosedurData = response.data?.procedure?.expanded;
      if (prosedurData && Array.isArray(prosedurData)) {
        prosedurInacbg.value = prosedurData.map((px: any) => ({
          kode: px.code,
          penyakit: {
            kode: px.code,
            deskripsi_panjang: px.display,
          },
          // Jumlah default 1 karena tidak ada di response
          jumlah: 1 ,
          is_valid: px.metadata.code == 200, 
          status_message: px.metadata.message,
          // TAMBAHAN: Cek pesan error dari metadata
          error_message: px.metadata.code !== 200 ? px.metadata.message : null,
        }));
      }
      
      addToaster("Success", "Data coding iDRG berhasil diimpor", "green", "i-tabler-discount-check-filled")

    } else {
        throw new Error(response?.metadata?.message || "Respon impor tidak valid")
    }

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  } finally {
    isImporting.value = false
  }
}

// Letakkan fungsi ini di dalam <script setup>, di dekat fungsi-fungsi lain seperti finalGrouper

const groupingInacbg = async () => {
  isInacbgGrouping.value = true
  try {
   
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien")
    }

    // 1. Siapkan payload diagnosa dan prosedur dari state INACBG
    const diagnosaPayload = diagnosaInacbg.value.length
      ? diagnosaInacbg.value.map((d) => d.kd_penyakit).join("#")
      : "#"

    const prosedurPayload = prosedurInacbg.value.length
      ? prosedurInacbg.value.map((p) => p.kode).join("#")
      : "#"

    // const mainClaimData = prepareKlaimData(state)


    // 2. Kirim request ke backend (endpoint baru untuk INACBG)
    const { data: groupData, error: groupError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/grouping-inacbg`, // Endpoint baru!
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          // ...mainClaimData,
          nomor_sep: sep.no_sep,
          diagnosa: diagnosaPayload,
          procedure: prosedurPayload,
        }),
      }
    )

    if (groupError.value) {
      throw new Error(groupError.value.data?.message || "Gagal melakukan grouping INA-CBG")
    }

    console.log("RESPON GROUPING INACBG >>>", groupData.value)

    // 3. Proses response dan tampilkan hasilnya
    const response = groupData.value
    // === PERBAIKAN DIMULAI DI SINI ===
    if (response?.message?.metadata?.code === 200) { // DIUBAH: Akses ke dalam `message`
       // =======================================================
    // TAMBAHAN BARU: Reset hasil Special CMG sebelumnya
    // =======================================================
    

    inacbgResultData.specialProcedureTariff = 0;
    inacbgResultData.specialProcedureCode = '';
    selectedSpecialProcedure.value = '';

    inacbgResultData.specialProsthesisTariff = 0;
    inacbgResultData.specialProsthesisCode = '';
    selectedSpecialProsthesis.value = '';

    inacbgResultData.specialInvestigationTariff = 0;
    inacbgResultData.specialInvestigationCode = '';
    selectedSpecialInvestigation.value = '';

    inacbgResultData.specialDrugTariff = 0;
    inacbgResultData.specialDrugCode = '';
    selectedSpecialDrug.value = '';
      const cbgResult = response.message.response_inacbg; // DIUBAH: Akses ke `response_inacbg`
      stage1Result.value = response;
      
      showInacbgResult.value = true;
      inacbgResultData.groupTariff = parseInt(cbgResult.base_tariff, 10);
      inacbgResultData.cbg = cbgResult.cbg.code;
      inacbgResultData.cbg_desc = cbgResult.cbg.description;
      inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(cbgResult.base_tariff)}`; // DIUBAH: Menggunakan `tariff`
      inacbgResultData.kelas = cbgResult.kelas; // DIUBAH: Menggunakan `kelas`
      inacbgResultData.versi = cbgResult.inacbg_version; // DIUBAH: Menggunakan `inacbg_version`
      inacbgResultData.cbg = cbgResult.cbg.code;
  
  // =======================================================
  // KONDISI BARU UNTUK CBG CODE YANG MENGANDUNG 'X'
  // =======================================================
    if (cbgResult.cbg.code.includes('X')) {
      showInacbgFinalButton.value = false;
      // Beri notifikasi kenapa grouping gagal
      addToaster("Informasi", "Grouping Gagal: " + cbgResult.cbg.description, "orange", "i-tabler-info-circle-filled");
    } else {
      showInacbgFinalButton.value = true;
      addToaster("Success", "Grouping INA-CBG berhasil", "green", "i-tabler-discount-check-filled");
    }
     // Reset pilihan setiap kali grouping stage 1 dijalankan
specialProcedureOptions.value = [{ code: '', description: 'None' }];
specialProsthesisOptions.value = [{ code: '', description: 'None' }];
specialInvestigationOptions.value = [{ code: '', description: 'None' }];
specialDrugOptions.value = [{ code: '', description: 'None' }];
// selectedSpecialProcedure.value = '';
// selectedSpecialProsthesis.value = '';
// selectedSpecialInvestigation.value = '';
// selectedSpecialDrug.value = '';
hasSpecialProcedureOptions.value = false;
hasSpecialProsthesisOptions.value = false;
hasSpecialInvestigationOptions.value = false;
hasSpecialDrugOptions.value = false;

// Proses dan pilah opsi Special CMG dari response
const specialOptions = response.message.special_cmg_option;
if (specialOptions && Array.isArray(specialOptions)) {
  specialOptions.forEach((opt: any) => {
    switch (opt.type) {
      case 'Special Procedure':
        specialProcedureOptions.value.push({ code: opt.code, description: opt.description });
        hasSpecialProcedureOptions.value = true;
        break;
      case 'Special Prosthesis':
        specialProsthesisOptions.value.push({ code: opt.code, description: opt.description });
        hasSpecialProsthesisOptions.value = true;
        break;
      case 'Special Investigation':
        specialInvestigationOptions.value.push({ code: opt.code, description: opt.description });
        hasSpecialInvestigationOptions.value = true;
        break;
      case 'Special Drug':
        specialDrugOptions.value.push({ code: opt.code, description: opt.description });
        hasSpecialDrugOptions.value = true;
        break;
    }
  });
} 
     
    } else {
      throw new Error(response?.message?.metadata?.message || "Gagal mendapatkan hasil grouping INA-CBG"); // DIUBAH: Pesan error dari API
    }
    
    refreshLatestKlaim()

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  } finally {
    isInacbgGrouping.value = false
  }
}



// Letakkan di dekat fungsi-fungsi lain seperti groupingInacbg
const finalInacbg = async () => {
  isFinalInacbgLoading.value = true;
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien");
    }

    // Asumsi endpoint untuk finalisasi INACBG adalah '/final-inacbg'
    const { data: finalData, error: finalError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/final-inacbg`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          metadata: {
            method: "inacbg_grouper_final",
          },
          data: {
            nomor_sep: sep.no_sep,
          },
        }),
      }
    );

    if (finalError.value) {
      throw new Error(finalError.value.data?.message || "Gagal melakukan finalisasi INA-CBG");
    }

    // Proses jika respons sukses
    if (finalData.value?.metadata?.code === 200) {
      addToaster("Success", "Klaim INA-CBG berhasil difinalisasi", "green", "i-heroicons-check-badge-20-solid");
      // Di sini Anda bisa menambahkan logika lain, misalnya menonaktifkan form INACBG
      // atau menyembunyikan tombol "Final INACBG".
      showInacbgImportGroupingButtons.value = false;
      showInacbgFinalButton.value = false;
      showInacbgReeditButton.value = true;

      // 2. Tampilkan bagian "Status Klaim" di bawah
      isClaimFullyFinal.value = false; 

       // 3. PENTING: Pastikan dialog konfirmasi "Edit Ulang Klaim" tidak muncul
      showReeditConfirmation.value = false;
    } else {
      throw new Error(finalData.value?.metadata?.message || "Respons finalisasi tidak valid");
    }

    // Refresh data klaim terakhir untuk mendapatkan status terbaru
    refreshLatestKlaim();

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled");
  } finally {
    isFinalInacbgLoading.value = false;
  }
};

const reeditInacbg = async () => {
  isReeditInacbgLoading.value = true;
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada");
    }

    // Panggil endpoint baru untuk re-edit INACBG di backend
    const { data, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/reedit-inacbg`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStore?.accessToken}` },
        body: { nomor_sep: sep.no_sep } // Body bisa disesuaikan
      }
    );

    if (error.value) {
      throw new Error(error.value.data?.message || "Gagal edit ulang INA-CBG");
    }
    
    addToaster("Success", "Mode Edit Ulang INA-CBG diaktifkan", "green", "i-heroicons-check-badge-20-solid");

    isClaimFullyFinal.value = false;

    // Kembalikan state tombol ke semula
    showInacbgImportGroupingButtons.value = true;
    showInacbgFinalButton.value = true;
    showInacbgReeditButton.value = false;

    refreshLatestKlaim();

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled");
  } finally {
    isReeditInacbgLoading.value = false;
  }
};

const finalisasiKlaim = async () => {
  isFinalKlaimLoading.value = true;
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada, silahkan cek kembali data pasien");
    }

    // Panggil endpoint baru untuk finalisasi klaim
    const { data, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/final-klaim`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            method: "claim_final",
          },
          data: {
            nomor_sep: sep.no_sep,
            // 'coder_nik' DIHAPUS DARI SINI
          },
        }),
      }
    );

    if (error.value) {
      throw new Error(error.value.data?.message || "Gagal melakukan Finalisasi Klaim");
    }

    if (data.value?.metadata?.code === 200) {
      addToaster("Success", "Klaim berhasil difinalisasi dan dikirim", "green", "i-heroicons-check-circle-20-solid");
      showEditUlangButton.value = false;
      showInacbgReeditButton.value = false;
      isClaimFullyFinal.value = true;
       // =======================================================
      // PENTING: Reset state dialog konfirmasi ke kondisi awal
      // =======================================================
      showReeditConfirmation.value = false;

       // =======================================================
      // TAMBAHAN BARU: Reset status kirim online ke kondisi awal
      // =======================================================
      statusDcKemkes.value = {
        text: 'Klaim belum terkirim ke Pusat Data Kementerian Kesehatan',
        color: 'red',
        icon: 'i-heroicons-information-circle-20-solid',
        iconColor: 'text-blue-500'
      };

    } else {
      throw new Error(data.value?.metadata?.message || "Respons Finalisasi Klaim tidak valid");
    }

    refreshLatestKlaim();

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled");
  } finally {
    isFinalKlaimLoading.value = false;
  }
};

// Buat fungsi baru ini di script setup Anda
const reeditKlaimTotal = async () => {
  isReeditKlaimLoading.value = true;
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada");
    }

    // Panggil endpoint baru untuk re-edit klaim total
    const { data, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/reedit-klaim`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenStore?.accessToken}` },
        body: {
          metadata: { method: "reedit_claim" },
          data: { nomor_sep: sep.no_sep },
        },
      }
    );

    if (error.value) {
      throw new Error(error.value.data?.message || "Gagal melakukan Edit Ulang Klaim");
    }

    if (data.value?.metadata?.code === 200) {
      addToaster("Success", "Klaim telah dibuka kembali untuk diedit.", "green", "i-heroicons-check-circle-20-solid");

     // 1. Sembunyikan status & footer final
      isClaimFullyFinal.value = false;
      
      // 2. Tampilkan KEDUA tombol "Edit Ulang"
      showEditUlangButton.value = true;      // Tampilkan "Edit Ulang IDRG"
      showInacbgReeditButton.value = true;   // Tampilkan "Edit Ulang INACBG"

      // 3. Sembunyikan tombol aksi lainnya (grouping/final)
      showGroupingButton.value = false;
      showFinalButton.value = false;
      showInacbgImportGroupingButtons.value = false;
      showInacbgFinalButton.value = false;
      
      // 4. Pastikan form INACBG terlihat agar tombol "Edit Ulang INACBG" bisa diakses
      showFormInacbg.value = true;

    } else {
        throw new Error(data.value?.metadata?.message || "Gagal membuka klaim untuk diedit ulang.");
    }

    refreshLatestKlaim();

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled");
  } finally {
    isReeditKlaimLoading.value = false;
  }
};

// Buat fungsi baru ini di script setup Anda


const groupingStage2 = async () => {
 // Jangan jalankan jika sudah ada proses yang berjalan
  if (isGroupingStage2.value) return;
   isGroupingStage2.value = true;
  try {
    // Kumpulkan semua kode Special CMG yang dipilih
    const selectedCmg = [
      selectedSpecialProcedure.value,
      selectedSpecialProsthesis.value,
      selectedSpecialInvestigation.value,
      selectedSpecialDrug.value,
    ].filter(Boolean); // Hapus nilai kosong

    // Jika semua pilihan kosong, reset tarif ke kondisi awal dari Stage 1
    if (selectedCmg.length === 0) {
      if (stage1Result.value) {
        const baseCbgResult = (stage1Result.value.message || stage1Result.value).response_inacbg;
        
        inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(baseCbgResult.tariff)}`;
        // Reset semua tarif & kode individual
        inacbgResultData.specialProcedureTariff = 0; inacbgResultData.specialProcedureCode = '';
        inacbgResultData.specialProsthesisTariff = 0; inacbgResultData.specialProsthesisCode = '';
        inacbgResultData.specialInvestigationTariff = 0; inacbgResultData.specialInvestigationCode = '';
        inacbgResultData.specialDrugTariff = 0; inacbgResultData.specialDrugCode = '';
      }
      return; // Hentikan fungsi
    }

    const specialCmgPayload = selectedCmg.join('#');

    const { data: groupData, error: groupError } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/grouping-inacbg-stage2`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenStore?.accessToken}`, "Content-Type": "application/json" },
        body: {
          metadata: { method: "grouper", stage: "2", grouper: "inacbg" },
          data: { nomor_sep: sep.no_sep, special_cmg: specialCmgPayload },
        },
      }
    );

    if (groupError.value) {
      throw new Error(groupError.value.data?.message || "Gagal grouping stage 2");
    }

    // Perbarui tampilan hasil dengan response dari stage 2
    const response = groupData.value;
    // Tangani kemungkinan response dibungkus 'message' atau tidak
    const payload = response.message || response;
    if (payload?.metadata?.code === 200) {
      addToaster("Success", "Tarif Special CMG berhasil diperbarui", "green", "i-heroicons-check-circle-20-solid");
      // Reset state sebelum diisi ulang
      inacbgResultData.specialProcedureTariff = 0; inacbgResultData.specialProcedureCode = '';
      inacbgResultData.specialProsthesisTariff = 0; inacbgResultData.specialProsthesisCode = '';
      inacbgResultData.specialInvestigationTariff = 0; inacbgResultData.specialInvestigationCode = '';
      inacbgResultData.specialDrugTariff = 0; inacbgResultData.specialDrugCode = '';
      const cbgResult = payload.response_inacbg;
      inacbgResultData.cbg = cbgResult.cbg.code;
      inacbgResultData.cbg_desc = cbgResult.cbg.description;
      // 1. Isi tarif 'Group' dengan base_tariff
      inacbgResultData.groupTariff = parseInt(cbgResult.base_tariff, 10);
      // Perbarui Total Klaim
      inacbgResultData.total_tarif = `Rp ${new Intl.NumberFormat('id-ID').format(cbgResult.tariff)}`;
      // Perbarui juga daftar diagnosa/prosedur jika ada di response stage 2
      // Perbarui tarif dan kode individual dari response
      const specialCmgs = cbgResult.special_cmg;
      if (specialCmgs && Array.isArray(specialCmgs)) {
        specialCmgs.forEach((cmg: any) => {
          const tariff = parseInt(cmg.tariff, 10);
          switch (cmg.type) {
            case 'Special Procedure':
              inacbgResultData.specialProcedureTariff = tariff;
              inacbgResultData.specialProcedureCode = cmg.code;
              break;
            case 'Special Prosthesis':
              inacbgResultData.specialProsthesisTariff = tariff;
              inacbgResultData.specialProsthesisCode = cmg.code;
              break;
            case 'Special Investigation':
              inacbgResultData.specialInvestigationTariff = tariff;
              inacbgResultData.specialInvestigationCode = cmg.code;
              break;
            case 'Special Drug':
              inacbgResultData.specialDrugTariff = tariff;
              inacbgResultData.specialDrugCode = cmg.code;
              break;
          }
        });
      }
    }

  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled");
  } finally {
    isGroupingStage2.value = false;
  }
};

const kirimOnline = async () => {
  isSendingClaimOnline.value = true; // dengan state loading baru
  try {
    if (!sep?.no_sep) {
      throw new Error('Nomor SEP tidak ada, silahkan cek kembali data pasien');
    }

    // Panggil endpoint baru untuk mengirim klaim
    const { data, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/send-klaim`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            method: "send_claim_individual"
          },
          data: {
            nomor_sep: sep.no_sep
          }
        })
      }
    );

    if (error.value) {
      throw new Error(error.value.data?.message || 'Gagal mengirim klaim');
    }

    if (data.value?.metadata?.code === 200) {
      addToaster('Success', 'Data klaim berhasil dikirim', 'green', 'i-heroicons-paper-airplane-20-solid');
      // Anda bisa menambahkan logika lain di sini, misal me-refresh data
      // =======================================================
      // UBAH STATUS DC KEMKES MENJADI TERKIRIM
      // =======================================================
      statusDcKemkes.value = {
        text: 'Terkirim',
        color: 'green',
        icon: 'i-heroicons-check-circle-20-solid',
        iconColor: 'text-green-500'
      };
      refreshLatestKlaim();
    } else {
      throw new Error(data.value?.metadata?.message || 'Gagal mengirim klaim');
    }

  } catch (e: any) {
    addToaster('Error', e.message, 'red', 'i-tabler-info-circle-filled');
  } finally {
    isSendingClaimOnline.value = false;
  }
};

// Buat fungsi baru ini di script setup Anda
const cetakKlaim = async () => {
  isPrintingClaim.value = true;
  try {
    if (!sep?.no_sep) {
      throw new Error("Nomor SEP tidak ada");
    }

    // 1. Panggil endpoint baru untuk cetak klaim
    const { data: printData, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/eklaim/${sep.no_sep}/print-klaim`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          metadata: { method: "claim_print" },
          data: { nomor_sep: sep.no_sep },
        },
      }
    );

    if (error.value) {
      throw new Error(error.value.data?.message || "Gagal mendapatkan data cetak klaim");
    }

    if (printData.value?.metadata?.code === 200 && printData.value.data) {
      const base64Pdf = printData.value.data;

      // 2. Decode Base64 menjadi file binary
      const byteCharacters = atob(base64Pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new Blob([byteArray], { type: 'application/pdf' });

      // 3. Buat URL sementara dan buka di tab baru
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL);

      addToaster("Success", "File klaim sedang dibuka...", "green");
    } else {
      throw new Error(printData.value?.metadata?.message || "Gagal memproses data cetak");
    }

  } catch (e: any) {
    addToaster("Error", e.message, "red");
  } finally {
    isPrintingClaim.value = false;
  }
};


function removeDiagnosa(index: number) {
  if (useDiagnosaLocal) {
    diagnosaLocal.value.splice(index, 1)
  } else if (Array.isArray(diagnosa)) {
    diagnosa.splice(index, 1)
  }
}

function getCurrentDiagnosa() {
  if (useDiagnosaLocal && diagnosaLocal.value.length > 0) {
    return diagnosaLocal.value
  }
  return Array.isArray(diagnosa) ? diagnosa : []
}

function removeProsedur(index: number) {
  if (useProcedureLocal) {
    prosedurLocal.value.splice(index, 1)
  } else if (Array.isArray(prosedur)) {
    prosedur.splice(index, 1)
  }
}

// helper: kembalikan array ter-normalisasi [{ kode, jumlah }]
function normalizeProsedurEntries() {
  // ambil current prosedur dari local / prop
  let list = []
  if (useProcedureLocal && Array.isArray(prosedurLocal.value) && prosedurLocal.value.length > 0) {
    list = prosedurLocal.value
  } else if (Array.isArray(prosedur)) {
    list = prosedur
  }

  const normalized = []

  for (const p of list) {
    if (!p) continue

    // kasus: FE bisa menyimpan objek atau string
    // jika objek: coba ambil p.kode dan p.jumlah
    if (typeof p === 'object') {
      // jika kode sudah seperti "90.090+2", parse itu
      const rawKode = p.kode ?? p.kd ?? p.value ?? null
      if (!rawKode) continue

      const m = String(rawKode).split('+')
      const kode = m[0].trim()
      const plusCount = m[1] ? parseInt(m[1], 10) : 0
      const jumlahFromField = Number(p.jumlah) || 0

      // jumlah effective: field jumlah (jika ada) OR parsed +count OR default 1
      const jumlah = jumlahFromField > 0 ? jumlahFromField : (plusCount > 0 ? plusCount : 1)

      if (kode) normalized.push({ kode, jumlah })
    } else if (typeof p === 'string') {
      // kalau string, bisa berupa "90.090+2" atau "90.090"
      const m = p.split('+')
      const kode = m[0].trim()
      const jumlah = m[1] ? parseInt(m[1], 10) : 1
      if (kode) normalized.push({ kode, jumlah })
    }
  }

  return normalized
}

// helper: buat string payload "88.01#90.090+2" (atau "#" jika kosong)
// helper: buat string payload "88.01#90.090+2" (atau "#" jika kosong)
function getProsedurPayload() {
  // normalizeProsedurEntries() sudah benar, kita tetap pakai.
  const normalized = normalizeProsedurEntries();
  if (!normalized.length) return '#';

  // UBAH LOGIKA DI SINI:
  // Tidak ada lagi penggabungan. Langsung proses setiap baris satu per satu.
  const parts = normalized.map(({ kode, jumlah }) => {
    const count = Number(jumlah) || 1;
    // Jika jumlah lebih dari 1, gunakan format "kode+jumlah". Jika tidak, cukup kodenya saja.
    return count > 1 ? `${kode}+${count}` : kode;
  });

  // Gabungkan semua hasil menjadi satu string.
  return parts.join('#');
}




  
  // Handle form submission
  // async function onSubmit(event: FormSubmitEvent<FormData>) {
  //   isLoading.value = true
    
  //   try {
  //     if (sep?.no_sep == '' || sep?.no_sep == undefined) {
  //       throw new Error('Nomor SEP tidak ada, silahkan cek kembali data pasien')
  //     }
      
  //     if (state.upgrade_class_ind) {
  //       if (!state.upgrade_class_class) {
  //         throw new Error('Kelas pelayanan tidak boleh kosong')
  //       } else if (!state.upgrade_class_payor) {
  //         throw new Error('Pembiayaan tidak boleh kosong')
  //       } else if (!state.upgrade_class_los) {
  //         throw new Error('Lama upgrade kelas tidak boleh kosong')
  //       }
  //     }
      
  //     state.birth_weight = isNaN(parseInt(state.birth_weight)) ? 0 : parseInt(state.birth_weight)
      
  //     const mappedData = prepareKlaimData(event.data)
      
  //     mappedData.diagnosa = diagnosa?.length == 0 ? ["#"] : diagnosa?.map(d => d.kd_penyakit)
  //     mappedData.procedure = prosedur?.length == 0 ? ["#"] : prosedur?.map(p => p.kode)
      
  //     const { data, error, refresh, status } = await useFetch(`${runtimeConfig.public.API_V2_URL}/eklaim/${sep?.no_sep}`, {
  //       headers: {
  //         'Authorization': `Bearer ${tokenStore?.accessToken}`,
  //         'Content-Type': 'application/json',
  //         'Accept': 'application/json'
  //       },
  //       method: 'POST',
  //       body: mappedData
  //     })
      
  //     if (error.value) {
  //       throw new Error(error.value.data.message)
  //     }
      
  //     if (status.value == 'success') {
  //       refreshLatestKlaim()
  //       addToaster('Success', 'Data berhasil disimpan & di grouping', 'green', 'i-tabler-discount-check-filled')
  //     }
  //   } catch (error: any) {
  //     addToaster('Error', error.message, 'red', 'i-tabler-info-circle-filled');
  //   } finally {
  //     isLoading.value = false
  //   }
  // }
  
  // const kirimOnline = async () => {
  //   openModalSync.value = true
    
  //   try {
  //     if (!sep?.no_sep) {
  //       throw new Error('Nomor SEP tidak ada, silahkan cek kembali data pasien')
  //     }
      
  //     const { error, status } = await kirimOnlineIndividual(runtimeConfig, tokenStore, sep.no_sep);
      
  //     if (error.value) {
  //       throw new Error(error.value.data.message)
  //     } else if (status.value === 'success') {
  //       addToaster('Success', 'Data berhasil dikirim', 'green', 'i-tabler-discount-check-filled');
  //     }
  //   } catch (e: any) {
  //     addToaster('Error', e.message, 'red', 'i-tabler-info-circle-filled');
  //   } finally {
  //     openModalSync.value = false;
  //   }
  // }

  const addProsedur = (val: any) => {
  // Selalu tambahkan baris prosedur baru tanpa pengecekan.
  prosedurLocal.value.push({
    kode: val.value,
    penyakit: {
      kode: val.value,
      deskripsi_panjang: val.title,
    },
    jumlah: 1, // Setiap baris baru dimulai dengan jumlah 1
  });
};

</script>

<template>
  <div>
    <UForm :schema="FormDataSchema" :state="state" class="flex flex-col gap-6" @submit="onSubmit">

      <fieldset :disabled="isFinalSuccess || isInacbgGrouping" class="contents">
      <div class="flex flex-col lg:flex-row gap-4">
        <UFormGroup label="Jaminan / Cara Bayar" name="payor_label" class="w-full">
          <USelectMenu v-model="state.payor_label" :loading="optionLoading" :options="carabayarOptions"
          placeholder="jaminan / cara bayar" :onChange="onChangePayorCd" searchable />
        </UFormGroup>
        <UFormGroup label="No. Peserta" name="nomor_kartu" class="w-full">
          <UInput placeholder="nomor peserta" v-model="state.nomor_kartu" :readonly="true" />
        </UFormGroup>
        <UFormGroup label="No. SEP" name="nomor_sep" class="w-full">
          <UInput placeholder="nomor sep" v-model="state.nomor_sep" :readonly="true" />
        </UFormGroup>
        <UFormGroup label="COB" name="cob_cd" class="w-full">
          <USelectMenu v-model="state.cob_cd" :loading="optionLoading" value-attribute="value" :options="cobOptions"
          placeholder="cob" searchable />
        </UFormGroup>
      </div>
      
      <UDivider />
      
      <div class="p-6 rounded-xl dark:bg-cool-800/75 bg-cool-100 space-y-8">
        <div class="flex flex-col lg:flex-row gap-4 justify-between">
          <UFormGroup label="Jenis Rawat" name="jenis_rawat">
            <URadioGroup v-model="state.jenis_rawat" :loading="optionLoading" value-attribute="value"
            :options="[{ value: 2, label: 'Rawat Jalan' }, { value: 1, label: 'Rawat Inap' }]"
            :ui="{ fieldset: 'flex flex-row gap-4' }" />
          </UFormGroup>
          
          <div class="flex gap-3">
            <div class="my-2 md:my-0 md:mt-6" v-if="state.jenis_rawat == 1 && state.payor_cd != 'JPS'">
              <UFormGroup name="upgrade_class_ind">
                <UCheckbox v-model="state.upgrade_class_ind" name="upgrade_class_ind" label="Naik / Turun Kelas" />
              </UFormGroup>
            </div>
            <div class="my-2 md:my-0 md:mt-6" v-if="state.jenis_rawat == 1">
              <UFormGroup name="icu_indikator">
                <UCheckbox v-model="state.icu_indikator" name="icu_indikator" label="Ada Rawat Intensif" />
              </UFormGroup>
            </div>
            <div class="my-2 md:my-0 md:mt-6" v-if="state.jenis_rawat == 2 && state.payor_cd != 'JPS'">
              <UFormGroup name="executive_class_ind">
                <UCheckbox v-model="state.executive_class_ind" name="executive_class_ind" label="Kelas Eksekutif" />
              </UFormGroup>
            </div>
          </div>
          
          <div v-if="state.jenis_rawat == 1">
            <UFormGroup label="Kelas Hak" name="kelas_rawat" class="min-w-[250px]">
              <URadioGroup v-model="state.kelas_rawat" :loading="optionLoading" value-attribute="value"
              :options="[{ value: 3, label: 'Kelas 3' }, { value: 2, label: 'Kelas 2' }, { value: 1, label: 'Kelas 1' }]"
              :ui="{ fieldset: 'flex flex-row gap-4' }" disabled />
            </UFormGroup>
          </div>
          <div v-else="">
            <UFormGroup label="Kelas Hak" class="min-w-[250px]">
              -
            </UFormGroup>
          </div>
        </div>
        
        <div class="flex flex-col lg:flex-row gap-4 justify-between">
          <div class="flex flex-col md:flex-row gap-3">
            <UFormGroup label="Tanggal Masuk" name="tgl_masuk" class="w-full md:w-max min-w-[180px]">
              <UPopover :popper="{ placement: 'bottom-start' }" class="mt-1.5">
                <UButton variant="link" color="green" icon="i-tabler-calendar"
                :label="state.tgl_masuk ? new Date(state.tgl_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pilih Tanggal Masuk'" />
                <template #panel="{ close }">
                  <DatePicker is-required @close="close" mode="dateTime" v-model="state.tgl_masuk" />
                </template>
              </UPopover>
            </UFormGroup>
            
            <UFormGroup label="Tanggal Keluar" name="tgl_pulang" class="w-full md:w-max min-w-[180px]">
              <UPopover :popper="{ placement: 'bottom-start' }" class="mt-1.5">
                <UButton variant="link" color="lime" icon="i-tabler-calendar"
                :label="state.tgl_pulang ? new Date(state.tgl_pulang).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pilih Tanggal Keluar'"
                :disabled="state.jenis_rawat == 2" />
                
                <template #panel="{ close }">
                  <DatePicker is-required @close="close" mode="dateTime" v-model="state.tgl_pulang" />
                </template>
              </UPopover>
            </UFormGroup>
          </div>
          
          <UFormGroup label="Umur Pasien" name="age">
            <UInput placeholder="Umur Pasien" v-model="state.age" :readonly="true"
            class="w-full md:w-max min-w-[18.4em]">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ regPeriksa?.sttsumur }}</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
    </div>
    
    <UDivider />
    
    <div class="p-6 rounded-xl dark:bg-cool-800/75 bg-cool-100 space-y-8">
      <div class="flex flex-col lg:flex-row gap-4 justify-between">
        <UFormGroup label="Cara Masuk" name="cara_masuk" class="w-full md:w-min md:min-w-[26.6em]">
          <USelectMenu v-model="state.cara_masuk" :loading="optionLoading" value-attribute="value" :options="caraMasukData" placeholder="cara masuk pasien" searchable />
        </UFormGroup>
      </div>
      
      <div v-if="state.upgrade_class_ind" class="flex flex-col md:flex-row gap-4 justify-between">
        <UFormGroup name="upgrade_class_class">
          <URadioGroup v-model="state.upgrade_class_class" legend="Kelas Pelayanan" :loading="optionLoading"
          value-attribute="value"
          :options="[{ value: 'kelas_3', label: 'Kelas 3', disabled: state.kelas_rawat && state.kelas_rawat <= 3 }, { value: 'kelas_2', label: 'Kelas 2', disabled: state.kelas_rawat && state.kelas_rawat <= 2 }, { value: 'kelas_1', label: 'Kelas 1', disabled: state.kelas_rawat && state.kelas_rawat <= 1 }, { value: 'vip', label: 'Diatas kelas 1' }]"
          :ui="{ fieldset: 'flex flex-row gap-4' }" />
        </UFormGroup>
        
        <UFormGroup label="Pembiayaan" name="upgrade_class_payor">
          <USelectMenu v-model="state.upgrade_class_payor" value-attribute="value"
          :options="[{ value: '1', label: 'Peserta' }, { value: '2', label: 'Pemberi Kerja' }, { value: '3', label: 'Asuransi Tambahan' }]"
          placeholder="Pembiayaan" searchable class="w-[250px]" />
        </UFormGroup>
        
        <UFormGroup label="Lama ( hari )" name="icu_los">
          <UInput placeholder="Lama upgrade kelas" v-model="state.upgrade_class_los">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">Hari</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
      
      <div v-if="state.icu_indikator" class="flex flex-col md:flex-row gap-4 justify-between">
        <div class="flex gap-12">
          <UFormGroup label="Ventilator" name="use_ind">
            <UCheckbox v-model="state.use_ind" name="use_ind" label="Ya" />
          </UFormGroup>
          
          <div class="flex flex-col md:flex-row gap-3" v-if="state.use_ind">
            <UFormGroup label="Intubasi" name="start_dttm" class="w-full md:w-max min-w-[180px]">
              <UPopover :popper="{ placement: 'bottom-start' }" class="mt-1.5">
                <UButton variant="link" color="sky" icon="i-tabler-calendar"
                :label="state.start_dttm ? new Date(state.start_dttm).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pilih Tanggal Intubasi'" />
                
                <template #panel="{ close }">
                  <DatePicker is-required @close="close" mode="dateTime" v-model="state.start_dttm" />
                </template>
              </UPopover>
            </UFormGroup>
            
            <UFormGroup label="Ekstubasi" name="stop_dttm" class="w-full md:w-max min-w-[180px]">
              <UPopover :popper="{ placement: 'bottom-start' }" class="mt-1.5">
                <UButton variant="link" color="blue" icon="i-tabler-calendar"
                :label="state.stop_dttm ? new Date(state.stop_dttm).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pilih Tanggal Ekstubasi'" />
                
                <template #panel="{ close }">
                  <DatePicker is-required @close="close" mode="dateTime" v-model="state.stop_dttm" />
                </template>
              </UPopover>
            </UFormGroup>
          </div>
        </div>
        
        <UFormGroup label="Rawat Intensif" name="icu_los">
          <UInput placeholder="rawat intensif" v-model="state.icu_los" :readonly="true">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">Hari</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
      
      <div class="flex flex-col lg:flex-row gap-4 justify-between">
        <div class="flex gap-4">
          <UFormGroup label="LOS" name="los">
            <UInput placeholder="los in day" v-model="state.los" :readonly="true">
              <template #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs">Hari</span>
              </template>
            </UInput>
          </UFormGroup>
          <UFormGroup name="los_in_hour" class="mt-6">
            <UInput placeholder="los in hour" v-model="state.los_in_hour" :readonly="true">
              <template #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs">Jam</span>
              </template>
            </UInput>
          </UFormGroup>
        </div>
        
        <UFormGroup label="Berat Lahir" name="birth_weight">
          <UInput placeholder="Berat Lahir" v-model="state.birth_weight" class="w-full md:w-max min-w-[18.3em]">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">gram</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
    </div>
    <UDivider label="ADL Score" />
    
    <div class="p-6 rounded-xl dark:bg-cool-800/75 bg-cool-100 space-y-8">
      <div class="flex flex-col lg:flex-row gap-4 justify-between">
        <div class="flex gap-4">
          <UFormGroup label="Sub Acute" name="adl_sub_acute" class="w-full lg:w-min lg:min-w-[18.3em]">
            <UInput placeholder="adl score sub acute" v-model="state.adl_sub_acute" />
          </UFormGroup>
          <UFormGroup label="Chronic" name="adl_chronic" class="w-full lg:w-min lg:min-w-[18.3em]">
            <UInput placeholder="adl score cronic" v-model="state.adl_chronic" />
          </UFormGroup>
        </div>
        
        <UFormGroup label="Cara Pulang" name="discharge_status" class="w-full lg:w-[25%]">
          <USelectMenu v-model="state.discharge_status" value-attribute="value" :options="caraPulangData" placeholder="cara pulang pasien" searchable />
        </UFormGroup>
      </div>
      
      <div class="flex flex-col lg:flex-row gap-4">
        <UFormGroup label="DPJP" name="nama_dokter" class="w-full lg:min-w-[18.3em]">
         <USelectMenu 
  v-model="state.kd_dokter" 
  :options="dpjpOptions" :loading="dpjpStatus == 'pending'" 
  option-attribute="nm_dokter"
  value-attribute="kd_dokter" 
  placeholder="DPJP" 
  searchable 
/>
        </UFormGroup>
        
        <UFormGroup label="Jenis Tarif" name="kode_tarif" class="w-full lg:min-w-[18.3em]">
          <USelectMenu v-model="state.kode_tarif" :loading="optionLoading" value-attribute="value"
          :options="jenisTarifOptions" placeholder="jenis tarif RS" searchable />
        </UFormGroup>
      </div>
    </div>
    
    <UDivider />
    
    <div class="flex flex-col items-center md:flex-row gap-7" v-if="state.payor_cd != 'JPS'">
      <UFormGroup label="Pasien TB" name="jkn_sitb_checked_ind">
        <div class="flex items-center gap-8">
          <UCheckbox v-model="state.jkn_sitb_checked_ind" name="jkn_sitb_checked_ind" label="Ya" />
          
          <div class="flex gap-2" v-if="state.jkn_sitb_checked_ind">
            <UFormGroup name="jkn_sitb_noreg">
              <UInput placeholder="nomor register sitb" v-model="state.jkn_sitb_noreg" :readonly="sitbState.valid" class="w-full lg:w-min lg:min-w-[300px]" />
            </UFormGroup>
            
            <template v-if="sitbState.valid">
              <UButton color="gray" @click="inValidasiSITB(state.nomor_sep)" :loading="sitbState.validasiStatus == 'pending'">
                Ubah
              </UButton>
            </template>
            <template v-else>
              <UButton variant="soft" color="blue" @click="validasiSITB(state)" :loading="sitbState.validasiStatus == 'pending'">
                Validasi
              </UButton>
            </template>
          </div>
          
          <template v-if="sitbState.valid">
            <div>Nomor register SITB valid</div>
          </template>
        </div>
      </UFormGroup>
      
      
    </div>
    
    <div class="flex flex-col md:flex-row gap-7" v-if="state.executive_class_ind">
      <UFormGroup label="Tarif Poli Eks.">
        <UInput v-model="state.tarif_poli_eks" icon="i-tabler-cash-banknote"
        class="w-full lg:w-min lg:min-w-[300px]" />
      </UFormGroup>
    </div>
    
    <div class="flex flex-col md:flex-row gap-7"
    v-if="state.payor_cd != 'JPS' && state.jenis_rawat == 1 || state.payor_cd == 'JPS' && state.jenis_rawat == 2 || state.payor_cd == 'JKN' && state.jenis_rawat != 2 || state.payor_cd == 'JKN' && state.jenis_rawat == 1">
    <UFormGroup label="Co-Insidense COVID-19" name="co_insidence_ind_jkn">
      <UCheckbox v-model="state.co_insidence_ind_jkn" name="co_insidence_ind_jkn" label="Ya" />
    </UFormGroup>
    
    <div class="flex gap-2 mt-3" v-if="state.co_insidence_ind_jkn">
      <UFormGroup name="co_insidence_ind_jkn">
        <UInput placeholder="nomor klaim COVID-19" class="w-full lg:w-min lg:min-w-[300px]" />
      </UFormGroup>
      <UButton variant="soft" color="blue">Validasi</UButton>
    </div>
  </div>
  
  <UDivider label="Tarif Rumah Sakit" />
  
  <ClientOnly fallback="Loading Tarif RS ...">
    <div class="p-4 rounded-xl text-center bg-indigo-100 text-indigo-600 dark:bg-indigo-800/50 dark:text-indigo-300">
      <p class="font-semibold">Total Tarif RS</p>
      <p class="text-xl font-semibold font-mono">
        Rp {{ getTotalTarifRS(state).toLocaleString('id-ID') }}
      </p>
    </div>
  </ClientOnly>
  
  <div class="p-3 lg:p-6 rounded dark:bg-cool-800/75 bg-cool-100 shadow-inner">
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
      <UFormGroup v-for="(field, index) in tarifFields" :key="index" :label="field.label" :name="field.name">
        <UInput v-model="state.tarif_rs[field.name]" :placeholder="field.name" type="text" v-maska="moneyMask"
        inputmode="numeric">
        <template #leading>
          <span class="text-gray-500 dark:text-gray-400 text-xs">Rp</span>
        </template>
      </UInput>
    </UFormGroup>
  </div>
</div>
</fieldset>
<!-- Tombol Set Klaim -->
<!-- <div class="flex justify-end pt-4">
<UButton :disabled="loadingSetKlaim" @click="setKlaim">
  <span v-if="!loadingSetKlaim">Set Klaim</span>
  <span v-else>Loading...</span>
</UButton>
</div> -->

<UDivider label="Data Klinis" />
<fieldset :disabled="isFinalSuccess" class="contents">

<div class="flex flex-col items-center justify-center gap-2">
  <p class="text-center font-semibold text-sm">Tekanan Darah (mmHg)</p>
  <div class="flex items-center justify-center gap-3">
    <UFormGroup name="sistole">
      <UInput placeholder="sistole" readonly v-model="state.sistole" type="text" inputmode="number" />
    </UFormGroup>
    
    <UFormGroup name="diastole">
      <UInput placeholder="diastole" readonly v-model="state.diastole" type="text" inputmode="number" />
    </UFormGroup>
  </div>
</div>

<div v-if="state.jenis_rawat == 1">
  <UDivider class="mb-7" />
  
  <div class="flex flex-col xl:flex-row gap-5 xl:gap-0 items-start justify-between">
    <div class="flex flex-col gap-2 w-full lg:w-[58%] lg:mx-auto xl:mx-0 xl:max-w-max">
      <p class="text-center font-semibold text-sm">Usia Kehamilan (minggu)</p>
      <UFormGroup name="usia_kehamilan">
        <UInput placeholder="usia kehamilan" type="number" inputmode="number" v-model="state.usia_kehamilan" />
      </UFormGroup>
    </div>
    
    <div class="flex flex-col gap-2 w-full xl:max-w-max">
      <p class="text-center font-semibold text-sm">Riwayat Kehamilan Sebelumnya</p>
      <div class="flex gap-3 items-center justify-center w-full xl:max-w-max">
        <UFormGroup name="gravida">
          <UInput placeholder="gravida" v-model="state.gravida" />
        </UFormGroup>
        
        <UFormGroup name="partus">
          <UInput placeholder="partus" v-model="state.partus" />
        </UFormGroup>
        
        <UFormGroup name="abortus">
          <UInput placeholder="abortus" v-model="state.abortus" />
        </UFormGroup>
      </div>
    </div>
    
    <div class="flex flex-col gap-3 items-center justify-center w-full xl:max-w-max">
      <p class="text-center font-semibold text-sm">Onset Kontraksi</p>
      
      <UFormGroup name="onset_kontraksi">
        <URadioGroup :loading="optionLoading" value-attribute="value"
        :options="[{ value: 'spontan', label: 'Timbul Spontan' }, { value: 'induksi', label: 'Dengan Induksi' }, { value: 'non_spontan_non_induksi', label: 'SC Tanpa Kontraksi/Induksi' }]"
        v-model="state.onset_kontraksi" />
      </UFormGroup>
    </div>
  </div>
</div>
</fieldset>
<!-- TODO : Lanjutkan Pembuatan Forms JAMPERSAL -->

<UDivider />

<div v-if="showForm">
  <!-- <UDivider label="Diagnosa dan Prosedur iDRG" /> -->

<UTabs :items="[{ key: 'coding_idrg', label: 'Coding iDRG' }]" class="w-full">
  <template #default="{ item, index, selected }">
    <span class="truncate" :class="[selected && 'text-indigo-500 dark:text-indigo']">{{ item.label }}</span>
  </template>
  
  <template #item="{ item }">
    <div class="px-4 py-5 sm:p-6 bg-cool-100 dark:bg-cool-800/75 shadow-inner rounded-lg">
      <div v-if="item.key === 'coding_idrg'" class="space-y-3">

        <fieldset :disabled="isFinalSuccess || isInacbgGrouping" class="contents">
        
        <UDivider label="Diagnosa"
        :ui="{ border: { base: 'flex border-cool-200 dark:border-cool-700' }, label: 'text-sm font-semibold text-indigo' }" />
        
        <div class="flex flex-col lg:flex-row items-center justify-between">
          <h3 class="text-base font-semibold mb-2">Diagnosa (<code>ICD-10</code>):</h3>
          <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px] !whitespace-normal !text-wrap" :searchable="fetchDiagnosaIdrg" :loading="loadingStates.idrgDiagnosa.value"  :onChange="(val: any) => {
            if (val.disabled) {
              addToaster(
                'Error',
                `This diagnosa ${val.value} not valid for grouping`,
                'red',
                'i-tabler-info-circle-filled'
              )
              return
            }
            if (val.accpdx === 'N' && diagnosaLocal?.length === 0) {
              addToaster('Error', 'Diagnosis '+val.value+' - '+val.title+', with ACCPDX = N cannot be the primary diagnosis', 'red', 'i-tabler-info-circle-filled');
            } else {
              diagnosaLocal?.push({
                kd_penyakit: val.value,
                penyakit: {
                  kd_penyakit: val.value,
                  nm_penyakit: val.title
                }
              })
              // diagnosaKey++ 
            }
          }" searchable-placeholder="cari diagnosa ..." placeholder="cari diagnosa idrg ..." />
          
        </div>
        
     <Sortable
  :list="diagnosaLocal ?? []"
  item-key="id"
  tag="div"
  @end="(event) => moveItemInArray(diagnosaLocal ?? [], event.oldIndex, event.newIndex)"
>
  <template #item="{ element, index }: { element: Diagnosa; index: number }">
    <div
      :key="element.kd_penyakit"
      class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl dark:border-cool-700 border-cool-300"
    >
      <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
        <UBadge color="indigo" variant="soft">{{ element.kd_penyakit }}</UBadge>
        <span class="truncate text-ellipsis">{{ element.penyakit.nm_penyakit }}</span>
      </div>
      <!-- button close -->
      <UButton
        variant="soft"
        color="red"
        @click="removeDiagnosa(index)"
        icon="i-tabler-x"
      />
    </div>
  </template>
</Sortable>

    
    <UDivider label="Prosedur"
    :ui="{ border: { base: 'flex border-cool-200 dark:border-cool-700' }, label: 'text-sm font-semibold text-indigo' }" />
    
    <div class="flex flex-col lg:flex-row items-center justify-between">
      <h3 class="text-base font-semibold mb-2">Prosedur (<code>ICD-9-CM</code>):</h3>
      <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px]" :searchable="fetchProsedurIdrg" :loading="loadingStates.idrgProsedur.value"  :onChange="(val: any) => addProsedur(val)" searchable-placeholder="cari diagnosa ..." placeholder="cari prosedur idrg ..." />
    </div>
    
    <Sortable :list="prosedurLocal ?? []" item-key="id" tag="div"
    @end="(event) => moveItemInArray(prosedurLocal ?? [], event.oldIndex, event.newIndex)">
    <template #item="{ element, index }">
      <div
      class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl border-cool-300 dark:border-cool-700"
      :key="element.kode">
      <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
        <UBadge color="amber" variant="soft">{{ element.kode }}</UBadge>
        <span class="truncate text-ellipsis">{{ element.penyakit.deskripsi_panjang }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2">
          <p class="text-xs text-gray-500 dark:text-gray-400">Jumlah:</p>
          <UInput
          v-model.number="element.jumlah" 
          type="number"
          min="1"
          class="w-16"
          />
        </div>
        
        <UButton variant="soft" color="red" @click="removeProsedur(index)"
        icon="i-tabler-x" />
      </div>
    </div>
  </template>
</Sortable>

</fieldset>


<div class="flex justify-end pt-4">
  <UButton
  v-if="showGroupingButton"
  color="blue"
  icon="i-tabler-hierarchy-2"
  :loading="isLoading"
  @click="saveAndGroupingKlaim"
>
  Grouping
</UButton>

</div>
<div v-if="showGroupingResult" class="mt-8 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead class="bg-gray-100 dark:bg-gray-800">
              <tr>
                  <th colspan="2" class="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Hasil Grouping iDRG
                  </th>
              </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
  
              <tr>
                  <td class="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 font-medium w-1/4">Jenis Rawat</td>
                  <td class="px-6 py-2 text-sm text-gray-900 dark:text-gray-200">
                      {{ groupingData.jenisRawat }}
                  </td>
              </tr>
              <tr>
                  <td class="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 font-medium">MDC</td>
                  <td class="px-6 py-2 text-sm text-gray-900 dark:text-gray-200">
                      {{ groupingData.mdc }} <span class="float-right font-mono">{{ groupingData.mdcCode }}</span>
                  </td>
              </tr>
              <tr>
                  <td class="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 font-medium">DRG</td>
                  <td class="px-6 py-2 text-sm text-gray-900 dark:text-gray-200">
                      {{ groupingData.drg }} <span class="float-right font-mono">{{ groupingData.drgCode }}</span>
                  </td>
              </tr>
              <tr>
                  <td class="px-6 py-2 text-sm text-gray-500 dark:text-gray-400 font-medium">Status</td>
                  <td class="px-6 py-2 text-sm text-gray-900 dark:text-gray-200">
                      {{ groupingData.status }}
                  </td>
              </tr>
          </tbody>
      </table>
  </div>
  <div class="flex justify-end gap-3 pt-5">
  

  <!-- <template> -->
  <UButton
  v-if="showFinalButton"
    color="green"
    icon="i-tabler-check"
    :loading="isFinalLoading"
    @click="finalGrouper"
  >
    Final IDRG
  </UButton>

   <!-- Edit Ulang IDRG -->
  <UButton
  v-if="showEditUlangButton"
    color="orange"
    icon="i-tabler-edit"
    :loading="isReeditLoading"
    @click="editUlangIdrg"
  >
    Edit Ulang IDRG
  </UButton>
<!-- </template> -->
</div>
</div>
</div>
</template>
</UTabs>
</div>
<!-- <UDivider label="Diagnosa dan Prosedur INACBG" /> -->
<div v-if="showFormInacbg">

<UTabs :items="[{ key: 'coding_unu', label: 'Coding INACBG' }]" class="w-full">
  <template #default="{ item, index, selected }">
    <span class="truncate" :class="[selected && 'text-indigo-500 dark:text-indigo']">{{ item.label }}</span>
  </template>
  
  <template #item="{ item }">
    <div class="px-4 py-5 sm:p-6 bg-cool-100 dark:bg-cool-800/75 shadow-inner rounded-lg">
      <div v-if="item.key === 'coding_unu'" class="space-y-3">
        <fieldset :disabled="showInacbgReeditButton || isClaimFullyFinal" class="contents">
        
        <UDivider label="Diagnosa"
        :ui="{ border: { base: 'flex border-cool-200 dark:border-cool-700' }, label: 'text-sm font-semibold text-indigo' }" />
        
        <div class="flex flex-col lg:flex-row items-center justify-between">
          <h3 class="text-base font-semibold mb-2">Diagnosa (<code>ICD-10</code>):</h3>
          <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px]" :searchable="fetchDiagnosaInacbg" :loading="loadingStates.inacbgDiagnosa.value" :onChange="(val: any) => {
            diagnosaInacbg?.push({
              id: `dx-${val.value}-${Date.now()}`,
              kd_penyakit: val.value,
              penyakit: {
                kd_penyakit: val.value,
                nm_penyakit: val.title
              },
              // TAMBAHAN: Beri nilai default saat tambah manual
            is_primary: diagnosaInacbg.length === 0, // Jadi primary jika item pertama
            is_valid: true,
            status_message: null
            })
            // diagnosaKey++ 
          }" searchable-placeholder="cari diagnosa ..." placeholder="cari diagnosa inacbg ..." />
        </div>
        
        <Sortable :list="diagnosaInacbg" item-key="id" tag="div"
        @end="(event) => moveItemInArray(diagnosaInacbg, event.oldIndex, event.newIndex)">
        <template #item="{ element, index }">
          <div :key="element.id"
          class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl dark:border-cool-700 border-cool-300">
          <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
            <UBadge color="indigo" variant="soft">{{ element.kd_penyakit }}</UBadge>
            <span class="truncate text-ellipsis">{{ element.penyakit.nm_penyakit }}</span>
            <span v-if="!element.is_valid" class="text-red-500 font-semibold">
              ({{ element.status_message }})
            </span>
          </div>
         
          <!-- button close -->
          <UButton variant="soft" color="red" @click="diagnosaInacbg?.splice(index, 1)"
          icon="i-tabler-x" />
        </div>
      </template>
    </Sortable>
    
    <UDivider label="Prosedur"
    :ui="{ border: { base: 'flex border-cool-200 dark:border-cool-700' }, label: 'text-sm font-semibold text-indigo' }" />
    
    <div class="flex flex-col lg:flex-row items-center justify-between">
      <h3 class="text-base font-semibold mb-2">Prosedur (<code>ICD-9-CM</code>):</h3>
      <USelectMenu class="w-full lg:w-[300px]" :searchable="fetchProsedurInacbg" :loading="loadingStates.inacbgProsedur.value" :onChange="(val: any) => {
        prosedurInacbg?.push({
          id: `px-${val.value}-${Date.now()}`,
          kode: val.value,
          penyakit: {
            kode: val.value,
            deskripsi_panjang: val.title
          },
           // TAMBAHAN: Beri nilai default saat tambah manual
            is_primary: prosedurInacbg.length === 0,
            is_valid: true,
            status_message: null
        })
        // diagnosaKey++ 
      }" searchable-placeholder="cari diagnosa ..." placeholder="cari prosedur inacbg ..." />
    </div>
    
    <Sortable :list="prosedurInacbg ?? []" item-key="id" tag="div"
    @end="(event) => moveItemInArray(prosedurInacbg ?? [], event.oldIndex, event.newIndex)">
    <template #item="{ element, index }">
      <div
      class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl border-cool-300 dark:border-cool-700"
      :key="element.id">
      <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
        <UBadge color="amber" variant="soft">{{ element.kode }}</UBadge>
        <span class="truncate text-ellipsis">{{ element.penyakit.deskripsi_panjang }}</span>
        <span v-if="!element.is_valid" class="text-red-500 font-semibold text-sm flex-shrink-0">
              ({{ element.status_message }})
            </span>
            
      </div>
      <!-- button close -->
      <UButton variant="soft" color="red" @click="prosedurInacbg?.splice(index, 1)"
      icon="i-tabler-x" />
    </div>
  </template>
</Sortable>
</fieldset>
<div class="flex justify-end gap-3 pt-4">
  <template v-if="showInacbgImportGroupingButtons">
    <UButton
      color="gray"
      variant="outline"
      icon="i-tabler-database-import"
      @click="importIdrgToInacbg"
      :loading="isImporting"
      >
      Import Coding
    </UButton>
     <UButton
      color="blue"
      icon="i-tabler-hierarchy-2"
      @click="groupingInacbg" 
      :loading="isInacbgGrouping"
      >
      Grouping
    </UButton>
    </template>
  </div>


</div>
</div>
</template>
</UTabs>

<div v-if="showInacbgResult" class="mt-8">

  <div class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">

    <div class="bg-white dark:bg-white-900/50 px-6 py-4 rounded-lg border-b border-gray-200 dark:border-gray-700">
    <div class="text-center mb-4">
      <h3 class="text-base font-semibold text-gray-800 dark:text-gray-200">
        Hasil Grouping INACBG
      </h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Info: •• {{ regPeriksa?.pasien?.nm_pasien }}, {{ regPeriksa?.dokter?.nm_dokter }} @ 23 Sep 2025, 10.52 •• 
        Kelas {{ state.kelas_rawat }} •• 
        Tarif: TARIF RS KELAS C PEMERINTAH
      </p>
    </div>
    </div>

<div class="pt-5 space-y-4">
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg text-sm divide-y divide-gray-200 dark:divide-gray-700">
    
    <div class="px-4 py-3 flex items-center">
      <span class="w-48 text-gray-500 dark:text-gray-400">Jenis Rawat</span>
      <span class="font-medium text-gray-800 dark:text-gray-100">Rawat Inap Kelas {{ state.kelas_rawat }} ({{ state.los }} Hari)</span>
    </div>

    <div class="px-4 py-3 flex items-center">
      <span class="w-48 text-gray-500 dark:text-gray-400">Group</span>
      <div class="flex-1 flex justify-between items-center">
        <span class="font-medium text-gray-800 dark:text-gray-100">{{ inacbgResultData.cbg_desc }}</span>
        <div class="flex items-center gap-4 text-right">
          <span class="font-mono text-gray-500">{{ inacbgResultData.cbg }}</span>
          <span class="w-32 font-medium text-gray-800 dark:text-gray-100">Rp {{ inacbgResultData.groupTariff.toLocaleString('id-ID') }}</span>
        </div>
      </div>
    </div>

    <div class="px-4 py-3 flex items-center">
      <span class="w-48 text-gray-500 dark:text-gray-400">Sub Acute</span>
      <div class="flex-1 flex justify-between items-center">
        <span class="text-gray-500">-</span>
        <span class="w-32 font-medium text-gray-800 dark:text-gray-100 text-right">Rp 0</span>
      </div>
    </div>
    
    <div class="px-4 py-3 flex items-center">
      <span class="w-48 text-gray-500 dark:text-gray-400">Chronic</span>
      <div class="flex-1 flex justify-between items-center">
        <span class="text-gray-500">-</span>
        <span class="w-32 font-medium text-gray-800 dark:text-gray-100 text-right">Rp 0</span>
      </div>
    </div>

   <div class="px-4 py-3 flex items-center">
          <span class="w-48 text-gray-500 dark:text-gray-400">Special Procedure</span>
          <div class="flex-1 flex justify-between items-center">
            <USelectMenu v-model="selectedSpecialProcedure" :options="specialProcedureOptions" option-attribute="description" value-attribute="code" class="w-48"  :disabled="!hasSpecialProcedureOptions || showInacbgReeditButton || isClaimFullyFinal" />
            <div class="flex items-center gap-4 text-right">
              <span class="font-mono text-gray-500 w-20">{{ inacbgResultData.specialProcedureCode }}</span>
              <span class="w-32 font-medium text-gray-800 dark:text-gray-100">Rp {{ inacbgResultData.specialProcedureTariff.toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 flex items-center">
          <span class="w-48 text-gray-500 dark:text-gray-400">Special Prosthesis</span>
          <div class="flex-1 flex justify-between items-center">
            <USelectMenu v-model="selectedSpecialProsthesis" :options="specialProsthesisOptions" option-attribute="description" value-attribute="code" class="w-48"  :disabled="!hasSpecialProsthesisOptions || showInacbgReeditButton || isClaimFullyFinal" />
            <div class="flex items-center gap-4 text-right">
              <span class="font-mono text-gray-500 w-20">{{ inacbgResultData.specialProsthesisCode }}</span>
              <span class="w-32 font-medium text-gray-800 dark:text-gray-100">Rp {{ inacbgResultData.specialProsthesisTariff.toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 flex items-center">
          <span class="w-48 text-gray-500 dark:text-gray-400">Special Investigation</span>
          <div class="flex-1 flex justify-between items-center">
            <USelectMenu v-model="selectedSpecialInvestigation" :options="specialInvestigationOptions" option-attribute="description" value-attribute="code" class="w-48"  :disabled="!hasSpecialInvestigationOptions || showInacbgReeditButton || isClaimFullyFinal" />
            <div class="flex items-center gap-4 text-right">
              <span class="font-mono text-gray-500 w-20">{{ inacbgResultData.specialInvestigationCode }}</span>
              <span class="w-32 font-medium text-gray-800 dark:text-gray-100">Rp {{ inacbgResultData.specialInvestigationTariff.toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 flex items-center">
          <span class="w-48 text-gray-500 dark:text-gray-400">Special Drug</span>
          <div class="flex-1 flex justify-between items-center">
            <USelectMenu v-model="selectedSpecialDrug" :options="specialDrugOptions || isClaimFullyFinal" option-attribute="description" value-attribute="code" class="w-48"  :disabled="!hasSpecialDrugOptions || showInacbgReeditButton" />
            <div class="flex items-center gap-4 text-right">
              <span class="font-mono text-gray-500 w-20">{{ inacbgResultData.specialDrugCode }}</span>
              <span class="w-32 font-medium text-gray-800 dark:text-gray-100">Rp {{ inacbgResultData.specialDrugTariff.toLocaleString('id-ID') }}</span>
            </div>
          </div>
        </div>

    <div class="px-4 py-3 flex items-center">
      <span class="w-48 font-semibold text-gray-800 dark:text-gray-100">Total Klaim</span>
      <div class="flex-1 flex justify-end items-center">
        <span class="w-32 font-semibold text-gray-800 dark:text-gray-100 text-right">{{ inacbgResultData.total_tarif }}</span>
      </div>
    </div>

    <div class="px-4 py-3 flex items-center">
      <span class="w-48 text-gray-500 dark:text-gray-400">Status</span>
      <span class="font-medium text-gray-800 dark:text-gray-100">normal</span>
    </div>

  </div>
  </div>


 <div class="flex justify-between items-center mt-6">
  <span class="text-xs text-gray-400">[ debug ]</span>
  
  <UButton 
  v-if="showInacbgFinalButton"
  color="green" 
  variant="solid" 
  size="lg" 
  icon="i-heroicons-check-badge-20-solid"
  @click="finalInacbg"
  :loading="isFinalInacbgLoading"
>
  Final INACBG
</UButton>

<UButton 
    v-if="showInacbgReeditButton"
    color="orange" 
    variant="solid" 
    size="sm" 
    icon="i-heroicons-pencil-square-20-solid"
    @click="reeditInacbg"
    :loading="isReeditInacbgLoading"
  >
    Edit Ulang INACBG
  </UButton>

</div>
    
  </div>
</div>
</div>



<!-- <div class="flex justify-end gap-3 pt-5">
  <template v-if="sudahDiGrouping">
    <UButton color="lime" type="button" icon="i-tabler-discount-check-filled" @click="kirimOnline">
      Kirim Online
    </UButton>
  </template>
  
  <UButton color="indigo" type="submit" :loading="isLoading" icon="i-tabler-send">Submit</UButton>
</div> -->



</UForm>

<div 
  v-if="showInacbgReeditButton" 
  class="mt-4 bg-gray-100 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end"
>
  <UButton 
    size="lg" 
    color="primary" 
    icon="i-heroicons-paper-airplane-20-solid"
    @click="finalisasiKlaim"
    :loading="isFinalKlaimLoading"
  >
    Final Klaim
  </UButton>
</div>

</div>

<div v-if="isClaimFullyFinal" class="mt-8 space-y-4">
  
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
    <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
      <h3 class="text-sm text-center font-semibold text-gray-700 dark:text-gray-200">
        Status Klaim
      </h3>
    </div>
    <div class="p-4 space-y-3 text-sm">
      <div class="flex items-center">
        <span class="w-48 text-gray-500 dark:text-gray-400">Status Klaim</span>
        <span class="font-semibold text-gray-800 dark:text-gray-100">Final</span>
      </div>
      <div class="flex items-center">
        <span class="w-48 text-gray-500 dark:text-gray-400">Status DC Kemkes</span>
        <div class="flex items-center gap-2">
          <UIcon :name="statusDcKemkes.icon" :class="statusDcKemkes.iconColor" />
          <span 
            :class="statusDcKemkes.color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-500'" 
            class="font-medium"
          >
            {{ statusDcKemkes.text }}
          </span>
        </div>
      </div>
    </div>
  </div>

<div class="mt-4 bg-gray-100 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">

  <div v-if="showReeditConfirmation" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md text-center transition-all duration-300">
    <p class="text-sm text-gray-800 dark:text-gray-200 mb-4">
      Anda akan membatalkan status final dan melakukan edit ulang klaim?
    </p>
    <div class="flex justify-center gap-3">
      <UButton 
        color="gray" 
        variant="solid" 
        @click="reeditKlaimTotal" 
        :loading="isReeditKlaimLoading"
      >
        Ya, (edit Ulang)
      </UButton>
      <UButton 
        color="gray" 
        variant="outline" 
        @click="showReeditConfirmation = false"
      >
        Tidak, (batal edit)
      </UButton>
    </div>
  </div>

  <div v-else class="flex justify-between items-center">
    <div class="flex gap-2">
      <UButton 
    variant="outline" 
    color="gray" 
    icon="i-heroicons-printer-20-solid"
    @click="cetakKlaim"
    :loading="isPrintingClaim"
  >
    Cetak Klaim
  </UButton>
       <UButton 
    variant="outline" 
    color="gray" 
    icon="i-heroicons-arrow-up-tray-20-solid"
    @click="kirimOnline"
    :loading="isSendingClaimOnline"
  >
    Kirim Klaim Online
  </UButton>
    </div>
    <div>
      <UButton 
        color="gray" 
        icon="i-heroicons-pencil-square-20-solid"
        @click="showReeditConfirmation = true"
      >
        Edit Ulang Klaim
      </UButton>
    </div>
  </div>
  
</div>

</div>

<!-- Modal Loading -->
<ModalLoading v-model:isOpen="openModalSync" />
</template>
