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
    fetchDiagnosaUnu, 
    fetchProsedurUnu,
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


  const useDiagnosaLocal = ref(false) // flag

  const activeDiagnosa = computed(() => {
    return useDiagnosaLocal.value ? diagnosaLocal.value : (diagnosa ?? [])
  })

  const showForm = ref(false)   // default: semua form/komponen hidden
  const loadingSetKlaim = ref(false)
  
  
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
  
  const { data: dpjp, status: dpjpStatus } = await fetchDpjp(runtimeConfig, tokenStore);
  
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
  
  watch(() => [state.kd_dokter, state.nama_dokter], ([kd_dokter, nama_dokter]) => {
    if (kd_dokter && (dpjp?.value as any)?.data) {
      const dokter = (dpjp?.value as any)?.data.find((d: any) => d.kd_dokter === kd_dokter)
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
  
  // Fetch the COB data on component mount
  onMounted(async () => {
    optionLoading.value = true
    
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
    const { data, error } = await useFetch(
      `${runtimeConfig.public.API_V2_URL}/idrg/${sep?.no_sep}`,
      {
        headers: {
          Authorization: `Bearer ${tokenStore?.accessToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (error.value) {
      console.error("Gagal ambil klaim:", error.value)
    } else if (data.value) {
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
          }
      }

     // --- NEW: parsing idrg_diagnosa_res ---
let diagnosaRes = null
try {
  diagnosaRes = JSON.parse(data.value.idrg_diagnosa_res)
} catch (e) {
  console.warn("Format JSON idrg_diagnosa_res tidak valid:", e)
}

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

    if (status.value === "success") {
      addToaster(
        "Success",
        "Grouping diagnosa & prosedur berhasil",
        "green",
        "i-tabler-discount-check-filled"
      )
      refreshLatestKlaim()
    }
  } catch (e: any) {
    addToaster("Error", e.message, "red", "i-tabler-info-circle-filled")
  }
}

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
  
  const kirimOnline = async () => {
    openModalSync.value = true
    
    try {
      if (!sep?.no_sep) {
        throw new Error('Nomor SEP tidak ada, silahkan cek kembali data pasien')
      }
      
      const { error, status } = await kirimOnlineIndividual(runtimeConfig, tokenStore, sep.no_sep);
      
      if (error.value) {
        throw new Error(error.value.data.message)
      } else if (status.value === 'success') {
        addToaster('Success', 'Data berhasil dikirim', 'green', 'i-tabler-discount-check-filled');
      }
    } catch (e: any) {
      addToaster('Error', e.message, 'red', 'i-tabler-info-circle-filled');
    } finally {
      openModalSync.value = false;
    }
  }
</script>

<template>
  <div>
    <UForm :schema="FormDataSchema" :state="state" class="flex flex-col gap-6" @submit="onSubmit">
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
          <USelectMenu v-model="state.kd_dokter" :loading="dpjpStatus == 'pending'" option-attribute="nm_dokter"
          value-attribute="kd_dokter" :options="(dpjp as any)?.data" placeholder="DPJP" searchable />
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

<div class="flex justify-end pt-4">
 <!-- Tombol Set Klaim -->
<UButton :disabled="loadingSetKlaim" @click="setKlaim">
  <span v-if="!loadingSetKlaim">Set Klaim</span>
  <span v-else>Loading...</span>
</UButton>
</div>

<div v-if="showForm">
  <!-- <UDivider label="Diagnosa dan Prosedur iDRG" /> -->

<UTabs :items="[{ key: 'coding_idrg', label: 'Coding iDRG' }]" class="w-full">
  <template #default="{ item, index, selected }">
    <span class="truncate" :class="[selected && 'text-indigo-500 dark:text-indigo']">{{ item.label }}</span>
  </template>
  
  <template #item="{ item }">
    <div class="px-4 py-5 sm:p-6 bg-cool-100 dark:bg-cool-800/75 shadow-inner rounded-lg">
      <div v-if="item.key === 'coding_idrg'" class="space-y-3">
        
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
            if (val.accpdx === 'N' && diagnosa?.length === 0) {
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
      <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px]" :searchable="fetchProsedurIdrg" :loading="loadingStates.idrgProsedur.value" :onChange="(val: any) => {
        prosedur?.push({
          kode: val.value,
          penyakit: {
            kode: val.value,
            deskripsi_panjang: val.title
          },
          jumlah: 1 // Add this line to initialize quantity
        })
        // diagnosaKey++ 
      }" searchable-placeholder="cari diagnosa ..." placeholder="cari prosedur idrg ..." />
    </div>
    
    <Sortable :list="prosedur ?? []" item-key="id" tag="div"
    @end="(event) => moveItemInArray(prosedur ?? [], event.oldIndex, event.newIndex)">
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
        
        <UButton variant="soft" color="red" @click="prosedur?.splice(index, 1)"
        icon="i-tabler-x" />
      </div>
    </div>
  </template>
</Sortable>
<div class="flex justify-end pt-4">
  <UButton
  color="blue"
  icon="i-tabler-hierarchy-2"
  :loading="isLoading"
  @click="groupingDiagnosaSet"
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
  

  <UButton color="lime" type="button" icon="i-tabler-checkbox" @click="finalKlaim">
    Final
  </UButton>
</div>
</div>
</div>
</template>
</UTabs>
</div>
<!-- <UDivider label="Diagnosa dan Prosedur INACBG" /> -->

<UTabs :items="[{ key: 'coding_unu', label: 'Coding INACBG' }]" class="w-full">
  <template #default="{ item, index, selected }">
    <span class="truncate" :class="[selected && 'text-indigo-500 dark:text-indigo']">{{ item.label }}</span>
  </template>
  
  <template #item="{ item }">
    <div class="px-4 py-5 sm:p-6 bg-cool-100 dark:bg-cool-800/75 shadow-inner rounded-lg">
      <div v-if="item.key === 'coding_unu'" class="space-y-3">
        
        <UDivider label="Diagnosa"
        :ui="{ border: { base: 'flex border-cool-200 dark:border-cool-700' }, label: 'text-sm font-semibold text-indigo' }" />
        
        <div class="flex flex-col lg:flex-row items-center justify-between">
          <h3 class="text-base font-semibold mb-2">Diagnosa UNU Grouper (<code>ICD-10</code>):</h3>
          <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px]" :searchable="fetchDiagnosaInacbg" :loading="loadingStates.inacbgDiagnosa.value" :onChange="(val: any) => {
            diagnosaInacbg?.push({
              kd_penyakit: val.value,
              penyakit: {
                kd_penyakit: val.value,
                nm_penyakit: val.title
              }
            })
            diagnosaKey++ 
          }" searchable-placeholder="cari diagnosa ..." placeholder="cari diagnosa inacbg ..." />
        </div>
        
        <Sortable :list="diagnosaInacbg ?? []" item-key="id" tag="div"
        @end="(event) => moveItemInArray(diagnosaInacbg ?? [], event.oldIndex, event.newIndex)">
        <template #item="{ element, index }">
          <div :key="element.kd_penyakit"
          class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl dark:border-cool-700 border-cool-300">
          <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
            <UBadge color="indigo" variant="soft">{{ element.kd_penyakit }}</UBadge>
            <span class="truncate text-ellipsis">{{ element.penyakit.nm_penyakit }}</span>
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
      <h3 class="text-base font-semibold mb-2">Prosedur UNU Grouper (<code>ICD-9-CM</code>):</h3>
      <USelectMenu :key="diagnosaKey" class="w-full lg:w-[300px]" :searchable="fetchProsedurInacbg" :loading="loadingStates.inacbgProsedur.value" :onChange="(val: any) => {
        prosedurInacbg?.push({
          kode: val.value,
          penyakit: {
            kode: val.value,
            deskripsi_panjang: val.title
          }
        })
        diagnosaKey++ 
      }" searchable-placeholder="cari diagnosa ..." placeholder="cari prosedur inacbg ..." />
    </div>
    
    <Sortable :list="prosedurInacbg ?? []" item-key="id" tag="div"
    @end="(event) => moveItemInArray(prosedurInacbg ?? [], event.oldIndex, event.newIndex)">
    <template #item="{ element, index }">
      <div
      class="draggable mb-2 flex items-center justify-between gap-3 p-2 border rounded-xl border-cool-300 dark:border-cool-700"
      :key="element.kode">
      <div class="flex gap-3 truncate text-ellipsis overflow-hidden">
        <UBadge color="amber" variant="soft">{{ element.kode }}</UBadge>
        <span class="truncate text-ellipsis">{{ element.penyakit.deskripsi_panjang }}</span>
      </div>
      <!-- button close -->
      <UButton variant="soft" color="red" @click="prosedurInacbg?.splice(index, 1)"
      icon="i-tabler-x" />
    </div>
  </template>
</Sortable>

</div>
</div>
</template>
</UTabs>

<UDivider label="Data Klinis" />

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

<!-- TODO : Lanjutkan Pembuatan Forms JAMPERSAL -->

<UDivider />

<div class="flex justify-end gap-3 pt-5">
  <template v-if="sudahDiGrouping">
    <UButton color="lime" type="button" icon="i-tabler-discount-check-filled" @click="kirimOnline">
      Kirim Online
    </UButton>
  </template>
  
  <UButton color="indigo" type="submit" :loading="isLoading" icon="i-tabler-send">Submit</UButton>
</div>



</UForm>
</div>

<!-- Modal Loading -->
<ModalLoading v-model:isOpen="openModalSync" />
</template>
