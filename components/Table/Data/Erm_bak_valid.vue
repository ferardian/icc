<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-start gap-4">
          <UButton icon="i-tabler-moneybag" variant="soft" color="sky" square />
          <div>
            <h3 class="text-lg text-sky-500 font-semibold">ERM BPJS</h3>
            <p class="text-sm text-cool-500">Data riwayat klaim pasien</p>
          </div>
        </div>
      </div>
    </template>

    <!-- TAB: Riwayat Pemeriksaan & Coding -->
    <div class="space-y-4">
      <!-- Patient Info Header -->
      <div v-if="data?.data && data.data.length > 0" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <div class="flex items-center gap-3">
          <UIcon name="i-tabler-user" class="w-8 h-8 text-blue-500" />
          <div>
            <h3 class="font-semibold text-lg">{{ data?.data[0]?.nama_pasien }}</h3>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <span>No. RM: {{ data?.data[0]?.nomr }}</span>
              <span class="mx-2">|</span>
              <span>No. Kartu: {{ data?.data[0]?.no_kartu }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold">Riwayat Pemeriksaan & Coding SNOMED</h3>
        <div class="flex gap-2">
          <USelectMenu
            v-model="viewFilter"
            :options="viewFilterOptions"
            placeholder="Filter Tampilan"
          />
          <USelectMenu
            v-if="viewFilter === 'coding'"
            v-model="codingStatusFilter"
            :options="codingStatusOptions"
            placeholder="Filter Status Coding"
            @update:model-value="fetchCodingQueue"
          />
        </div>
      </div>
      <!-- Error State -->
      <div v-if="status === 'error'" class="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div class="flex items-center gap-4">
          <UIcon name="i-tabler-alert-circle" class="w-8 h-8 text-red-500" />
          <div>
            <h3 class="font-semibold text-red-800 dark:text-red-200">Terjadi Kesalahan</h3>
            <p class="text-red-600 dark:text-red-300 text-sm">Gagal memuat data. Backend error: Call to undefined method App\Models\BridgingSep::regPeriksa()</p>
            <p class="text-red-500 dark:text-red-400 text-xs mt-1">Silakan hubungi administrator untuk memperbaiki masalah ini.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="pending" class="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-center gap-4">
          <UProgress animation="carousel" />
          <span class="text-gray-600 dark:text-gray-300">Memuat data...</span>
        </div>
      </div>

      <!-- Data Not Available -->
      <div v-else-if="!hasAnyData" class="p-6 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div class="flex items-center gap-4">
          <UIcon name="i-tabler-info-circle" class="w-8 h-8 text-yellow-500" />
          <div>
            <h3 class="font-semibold text-yellow-800 dark:text-yellow-200">Data Tidak Tersedia</h3>
            <p class="text-yellow-600 dark:text-yellow-300 text-sm">Tidak ada data riwayat pemeriksaan yang ditemukan untuk pasien ini.</p>
          </div>
        </div>
      </div>

      <!-- Unified Table -->
      <div v-else>
        <!-- Riwayat Klaim Table -->
        <div v-if="viewFilter === 'riwayat'">
          <UTable
            :rows="data?.data || []"
            :columns="riwayatColumns"
            :loading="pending"
            :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'Belum ada riwayat klaim.' }"
            @select="handleRowClick"
          >
            <template #status_klaim-data="{ row }">
              <UBadge :label="row.status_klaim" :color="row.status_klaim === 'Belum' ? 'yellow' : row.status_klaim === 'Sudah' ? 'green' : row.status_klaim === 'Pending' ? 'orange' : 'rose'" variant="soft" />
            </template>
            <template #no_sep-data="{ row }">
              <div class="flex items-center gap-1">
                <span class="font-mono text-sm">{{ row.no_sep }}</span>
                <UButton @click="copyToClipboard(row.no_sep)" variant="link" color="sky" size="xs" icon="i-tabler-copy" />
              </div>
            </template>
            <template #jnspelayanan-data="{ row }">
              <span>{{ row.jnspelayanan == 1 ? "Rawat Inap" : "Rawat Jalan" }}</span>
            </template>
            <template #tgl_masuk-data="{ row }">
              <div>
                {{ new Date(row.reg_periksa?.tgl_registrasi).toLocaleDateString('id-ID', {
                  weekday: 'short', year: 'numeric',
                  month: 'short', day: 'numeric'
                }) }}
                <div class="text-xs text-gray-500">
                  {{ row.reg_periksa?.jam_reg }} WIB
                </div>
              </div>
            </template>
            <template #tgl_keluar-data="{ row }">
              <div v-if="row?.tanggal_pulang && (row?.tanggal_pulang?.tgl_keluar != '0000-00-00' || row?.tanggal_pulang?.jam_keluar != '00:00:00')">
                {{ new Date(row?.tanggal_pulang?.tgl_keluar).toLocaleDateString('id-ID', {
                  weekday: 'short', year: 'numeric',
                  month: 'short', day: 'numeric'
                }) }}
                <div class="text-xs text-gray-500">
                  {{ row?.tanggal_pulang?.jam_keluar }} WIB
                </div>
              </div>
              <div v-else>-</div>
            </template>
            <template #cbg-data="{ row }">
              <UBadge variant="soft" size="sm" class="w-min" :color="row.group_stage?.code_cbg?.startsWith('X-') ? 'rose' : 'fuchsia'">
                {{ row.group_stage?.code_cbg }}
              </UBadge>
            </template>
            <template #tarif-data="{ row }">
              <template v-if="row.group_stage">
                <span class="text-violet-400 font-semibold">
                  {{ new Intl.NumberFormat('id-ID', {
                    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
                  }).format(row.group_stage?.tarif) }}
                </span>
              </template>
              <template v-else>-</template>
            </template>
            <template #status_klaim_kemkes-data="{ row }">
              <template v-if="row.rsia_klaim_idrg && row.rsia_klaim_idrg.send_klaim_res">
                <template v-if="getKemkesStatus(row.rsia_klaim_idrg.send_klaim_res)">
                  <UBadge
                    variant="soft"
                    size="sm"
                    class="w-min"
                    :color="getKemkesStatus(row.rsia_klaim_idrg.send_klaim_res) === 'sent' ? 'green' : (getKemkesStatus(row.rsia_klaim_idrg.send_klaim_res) === 'unsent' ? 'yellow' : 'gray')"
                  >
                    {{ getKemkesStatus(row.rsia_klaim_idrg.send_klaim_res) }}
                  </UBadge>
                </template>
                <template v-else>-</template>
              </template>
              <template v-else>-</template>
            </template>
            <template #actions-data="{ row }">
              <div class="flex gap-2">
                <UButton icon="i-tabler-file-download" label="PDF" color="emerald" @click="$emit('download-pdf', row.no_rawat)" size="xs" />
                <UButton icon="i-tabler-refresh" label="Sync" color="sky" @click="$emit('open-modal-sync', row)" size="xs"/>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Coding Table -->
        <div v-else-if="viewFilter === 'coding'">
          <UTable
            :rows="codingQueue"
            :columns="codingColumns"
            :loading="loadingCodingQueue"
            :empty-state="{
              icon: 'i-heroicons-queue-list',
              label: 'Tidak ada kunjungan yang perlu di-coding'
            }"
            @select="handleCodingRowClick"
          >
            <template #no_sep-data="{ row }">
              <span class="font-mono text-sm">{{ row.no_sep }}</span>
            </template>

            <template #no_rawat-data="{ row }">
              <span class="font-mono text-xs">{{ row.no_rawat }}</span>
            </template>

            <template #tgl_kunjungan-data="{ row }">
              {{ new Date(row.tglsep).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) }}
            </template>

            <template #jenis_data="{ row }">
              <span>{{ row.jnspelayanan == 1 ? "Rawat Inap" : "Rawat Jalan" }}</span>
            </template>

            <template #poliklinik-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.poliklinik?.nm_poli || '-' }}</span>
            </template>

            <template #dokter-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.dokter?.nm_dokter || '-' }}</span>
            </template>

            <template #coding_status-data="{ row }">
              <UBadge
                :label="getCodingStatusLabel(row)"
                :color="getCodingStatusColor(row)"
                variant="soft"
              />
            </template>

            <template #actions-data="{ row }">
              <UButton
                icon="i-tabler-code"
                label="Coding"
                color="blue"
                size="xs"
                @click="handleCodingRowClick(row)"
              />
            </template>
          </UTable>
        </div>

        <!-- Combined View -->
        <div v-else-if="viewFilter === 'combined'">
          <UTable
            :rows="combinedTableData"
            :columns="combinedColumns"
            :loading="pending || loadingCodingQueue"
            :empty-state="{
              icon: 'i-heroicons-circle-stack-20-solid',
              label: 'Belum ada data riwayat pemeriksaan'
            }"
            @select="handleCombinedRowClick"
          >
            <template #no_sep-data="{ row }">
              <div class="flex items-center gap-1">
                <span class="font-mono text-sm">{{ row.no_sep }}</span>
                <UButton @click="copyToClipboard(row.no_sep)" variant="link" color="sky" size="xs" icon="i-tabler-copy" />
              </div>
            </template>

            <template #no_rawat-data="{ row }">
              <span class="font-mono text-xs">{{ row.no_rawat }}</span>
            </template>

            <template #jenis_data="{ row }">
              <span>{{ row.jnspelayanan == 1 ? "Rawat Inap" : "Rawat Jalan" }}</span>
            </template>

            <template #poliklinik-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.poliklinik?.nm_poli || row.poliklinik || '-' }}</span>
            </template>

            <template #dokter-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.dokter?.nm_dokter || row.dokter || '-' }}</span>
            </template>

            <template #status_klaim-data="{ row }">
                  <ClientOnly>
                    <UBadge
                      variant="soft"
                      size="sm"
                      class="w-min"
                      :label="getKlaimStatus(row)"
                      :class="{
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': getKlaimStatus(row).toLowerCase() === 'sent',
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': getKlaimStatus(row).toLowerCase() !== 'sent'
                      }"
                    />
                  </ClientOnly>
            </template>

            <template #coding_status-data="{ row }">
              <UBadge
                :label="getCodingStatusLabel(row)"
                :color="getCodingStatusColor(row)"
                variant="soft"
              />
            </template>

            <template #actions-data="{ row }">
              <div class="flex gap-2">
             
                <UButton
                  v-if="row.hasClaim"
                  icon="i-tabler-file-text"
                  label="Detail"
                  color="emerald"
                  size="xs"
                  @click="handleRowClick(row)"
                />
                
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </div>

  
    <!-- Empty State for Detail -->
    <div v-if="!selectedVisitData" class="mt-6 text-center text-gray-500 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <UIcon name="i-tabler-file-text" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p>Klik salah satu baris riwayat di atas untuk melihat detail pemeriksaan.</p>
    </div>

    <!-- ========================================= -->
    <!-- DETAIL PEMERIKSAAN SECTION (NO MODAL)   -->
    <!-- ========================================= -->
    <div v-if="selectedVisitData" class="mt-8 space-y-6">
      <!-- Header Detail -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-xl font-bold mb-3">Detail Pemeriksaan & Coding SNOMED</h3>

            <!-- Status Klaim Section -->
            <div class="mb-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-medium">Status Klaim Kemenkes:</span>
                <UBadge
                  :label="getKlaimStatusBadge(selectedVisitData)"
                  :color="getKlaimStatusColor(selectedVisitData) as any"
                  variant="soft"
                  size="sm"
                />
              </div>
              <div v-if="getKlaimStatus(selectedVisitData) === 'sent'" class="text-xs text-blue-100">
                ✓ Detail ERM tersedia untuk ditinjau dan coding
              </div>
              <div v-else class="text-xs text-yellow-100">
                ⚠ Detail ERM hanya tersedia jika status klaim sudah "sent"
              </div>
            </div>

            <!-- Visit Info -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span class="opacity-75">No. Rawat:</span>
                <span class="ml-2 font-semibold">{{ selectedVisitData.no_rawat }}</span>
              </div>
              <div>
                <span class="opacity-75">No. SEP:</span>
                <span class="ml-2 font-semibold">{{ selectedVisitData.no_sep }}</span>
              </div>
              <div>
                <span class="opacity-75">Tgl Kunjungan:</span>
                <span class="ml-2 font-semibold">{{ new Date(selectedVisitData.tglsep).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) }}</span>
              </div>
              <div>
                <span class="opacity-75">Jenis:</span>
                <span class="ml-2 font-semibold">{{ selectedVisitData.jnspelayanan == 1 ? "Rawat Inap" : "Rawat Jalan" }}</span>
              </div>
            </div>
          </div>

          </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingVisitDetails" class="flex justify-center items-center py-12">
        <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl mr-3 text-blue-500" />
        <span class="text-gray-600">Memuat detail pemeriksaan...</span>
      </div>

      <!-- Detail Content -->
      <div v-else-if="visitDetails" class="space-y-6">

        <!-- DIAGNOSA ICD-10 -->
        <div v-if="visitDetails.diagnosa && visitDetails.diagnosa.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-red-50 dark:bg-red-900/20 px-6 py-4 rounded-t-xl border-b border-red-200 dark:border-red-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-stethoscope" class="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 class="font-semibold text-red-800 dark:text-red-200">Diagnosa ICD-10</h4>
            </div>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="(diag, index) in visitDetails.diagnosa" :key="`diag-${index}`" class="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <UBadge :label="diag.status === 'Utama' ? 'Utama' : 'Tambahan'" :color="diag.status === 'Utama' ? 'red' : 'orange'" variant="soft" />
                <div class="flex-1">
                  <p class="font-semibold text-red-800 dark:text-red-200">[{{ diag.kode }}]</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ diag.deskripsi }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PROSEDUR ICD-9 -->
        <div v-if="visitDetails.prosedur && visitDetails.prosedur.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-green-50 dark:bg-green-900/20 px-6 py-4 rounded-t-xl border-b border-green-200 dark:border-green-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-activity-heartbeat" class="w-5 h-5 text-green-600 dark:text-green-400" />
              <h4 class="font-semibold text-green-800 dark:text-green-200">Prosedur ICD-9</h4>
            </div>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="(proc, index) in visitDetails.prosedur" :key="`proc-${index}`" class="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <p class="font-semibold text-green-800 dark:text-green-200">[{{ proc.kode }}]</p>
                <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ proc.deskripsi }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- PEMERIKSAAN RAWAT JALAN (SOAP) DENGAN SNOMED CODING -->
        <div v-if="visitDetails.cppt_pemeriksaan_ralan && visitDetails.cppt_pemeriksaan_ralan.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 rounded-t-xl border-b border-blue-200 dark:border-blue-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-notes" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 class="font-semibold text-blue-800 dark:text-blue-200">Pemeriksaan Rawat Jalan (SOAP)</h4>
              </div>
              <UButton
                icon="i-tabler-search"
                label="Cari SNOMED"
                color="blue"
                size="sm"
                @click="toggleSNOMEDSearch"
              />
            </div>
          </div>

          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div v-for="(soap, index) in visitDetails.cppt_pemeriksaan_ralan" :key="`soap-${index}`" class="p-6 space-y-4">

              <!-- Header SOAP -->
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ new Date(`${soap.tgl_perawatan} ${soap.jam_rawat}`).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
                  </p>
                  <p class="text-sm text-gray-500">Oleh: {{ soap.nip }}</p>
                  <p class="text-xs text-gray-400">No. Rawat: {{ soap.no_rawat }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="getMappedCountForSOAP(soap) > 0 ? `${getMappedCountForSOAP(soap)} mapped` : 'No mapping'"
                    :color="getMappedCountForSOAP(soap) > 0 ? 'green' : 'gray'"
                    variant="soft"
                    size="xs"
                  />
                  <!-- Debug info (hanya muncul di development) -->
                  <UBadge
                    v-if="soapMappings.length > 0"
                    :label="`${soapMappings.length} total`"
                    color="blue"
                    variant="outline"
                    size="xs"
                  />
                </div>
              </div>

              <!-- S (Subjektif) -->
              <div v-if="soap.keluhan" class="space-y-2">
                <div class="flex items-center gap-2">
                  <UBadge label="S" color="orange" variant="soft" size="xs" />
                  <span class="font-semibold text-sm">Keluhan (Subjektif)</span>
                  <UButton
                    icon="i-tabler-plus"
                    size="2xs"
                    color="blue"
                    variant="soft"
                    @click="openAddMappingForSOAP(soap, 'keluhan')"
                  />
                </div>
                <div class="ml-6 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p class="text-sm">{{ soap.keluhan }}</p>
                  <div v-if="getSOAPMappings(soap, 'keluhan').length > 0" class="mt-3 space-y-2">
                    <div v-for="(mapping, mIdx) in getSOAPMappings(soap, 'keluhan')" :key="`keluhan-${mIdx}`" class="flex items-start gap-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs">
                      <UIcon name="i-tabler-arrow-right" class="mt-1 text-orange-500" />
                      <div class="flex-1">
                        <p class="font-medium">"{{ mapping.source_text }}" → {{ mapping.snomed_term }}</p>
                        <p class="text-xs text-gray-500">SNOMED: {{ mapping.snomed_concept_id }} | Type: {{ mapping.concept_type }}</p>
                      </div>
                      <UButton
                        icon="i-tabler-trash"
                        size="2xs"
                        color="red"
                        variant="ghost"
                        @click="removeMappingFromList(mapping, mIdx)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- O (Objektif) -->
              <div v-if="soap.pemeriksaan" class="space-y-2">
                <div class="flex items-center gap-2">
                  <UBadge label="O" color="green" variant="soft" size="xs" />
                  <span class="font-semibold text-sm">Pemeriksaan (Objektif)</span>
                  <UButton
                    icon="i-tabler-plus"
                    size="2xs"
                    color="blue"
                    variant="soft"
                    @click="openAddMappingForSOAP(soap, 'pemeriksaan')"
                  />
                </div>
                <div class="ml-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p class="text-sm">{{ soap.pemeriksaan }}</p>
                  <div v-if="getSOAPMappings(soap, 'pemeriksaan').length > 0" class="mt-3 space-y-2">
                    <div v-for="(mapping, mIdx) in getSOAPMappings(soap, 'pemeriksaan')" :key="`pemeriksaan-${mIdx}`" class="flex items-start gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                      <UIcon name="i-tabler-arrow-right" class="mt-1 text-green-500" />
                      <div class="flex-1">
                        <p class="font-medium">"{{ mapping.source_text }}" → {{ mapping.snomed_term }}</p>
                        <p class="text-xs text-gray-500">SNOMED: {{ mapping.snomed_concept_id }} | Type: {{ mapping.concept_type }}</p>
                      </div>
                      <UButton
                        icon="i-tabler-trash"
                        size="2xs"
                        color="red"
                        variant="ghost"
                        @click="removeMappingFromList(mapping, mIdx)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- A (Assessment) -->
              <div v-if="soap.penilaian" class="space-y-2">
                <div class="flex items-center gap-2">
                  <UBadge label="A" color="purple" variant="soft" size="xs" />
                  <span class="font-semibold text-sm">Penilaian (Assessment)</span>
                  <UButton
                    icon="i-tabler-plus"
                    size="2xs"
                    color="blue"
                    variant="soft"
                    @click="openAddMappingForSOAP(soap, 'penilaian')"
                  />
                </div>
                <div class="ml-6 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p class="text-sm">{{ soap.penilaian }}</p>
                  <div v-if="getSOAPMappings(soap, 'penilaian').length > 0" class="mt-3 space-y-2">
                    <div v-for="(mapping, mIdx) in getSOAPMappings(soap, 'penilaian')" :key="`penilaian-${mIdx}`" class="flex items-start gap-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-xs">
                      <UIcon name="i-tabler-arrow-right" class="mt-1 text-purple-500" />
                      <div class="flex-1">
                        <p class="font-medium">"{{ mapping.source_text }}" → {{ mapping.snomed_term }}</p>
                        <p class="text-xs text-gray-500">SNOMED: {{ mapping.snomed_concept_id }} | Type: {{ mapping.concept_type }}</p>
                      </div>
                      <UButton
                        icon="i-tabler-trash"
                        size="2xs"
                        color="red"
                        variant="ghost"
                        @click="removeMappingFromList(mapping, mIdx)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- P (Plan) -->
              <div v-if="soap.rtl" class="space-y-2">
                <div class="flex items-center gap-2">
                  <UBadge label="P" color="cyan" variant="soft" size="xs" />
                  <span class="font-semibold text-sm">Plan (RTL)</span>
                  <UButton
                    icon="i-tabler-plus"
                    size="2xs"
                    color="blue"
                    variant="soft"
                    @click="openAddMappingForSOAP(soap, 'rtl')"
                  />
                </div>
                <div class="ml-6 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <p class="text-sm">{{ soap.rtl }}</p>
                  <div v-if="getSOAPMappings(soap, 'rtl').length > 0" class="mt-3 space-y-2">
                    <div v-for="(mapping, mIdx) in getSOAPMappings(soap, 'rtl')" :key="`rtl-${mIdx}`" class="flex items-start gap-2 p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded text-xs">
                      <UIcon name="i-tabler-arrow-right" class="mt-1 text-cyan-500" />
                      <div class="flex-1">
                        <p class="font-medium">"{{ mapping.source_text }}" → {{ mapping.snomed_term }}</p>
                        <p class="text-xs text-gray-500">SNOMED: {{ mapping.snomed_concept_id }} | Type: {{ mapping.concept_type }}</p>
                      </div>
                      <UButton
                        icon="i-tabler-trash"
                        size="2xs"
                        color="red"
                        variant="ghost"
                        @click="removeMappingFromList(mapping, mIdx)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Debug Info Section (Development Only) -->
              <div v-if="soapMappings.length > 0" class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-tabler-bug" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span class="font-semibold text-gray-700 dark:text-gray-300">Debug Info</span>
                  <UBadge label="Check Console" color="orange" variant="soft" size="2xs" />
                </div>
                <div class="space-y-1 text-gray-600 dark:text-gray-400">
                  <p>Total SOAP mappings loaded: {{ soapMappings.length }}</p>
                  <p>Current SOAP: {{ soap.no_rawat }} | {{ soap.tgl_perawatan }} {{ soap.jam_rawat }}</p>
                  <div v-for="(field, fieldName) in { keluhan: soap.keluhan, pemeriksaan: soap.pemeriksaan, penilaian: soap.penilaian, rtl: soap.rtl }" :key="fieldName">
                    <p v-if="field" class="flex items-center gap-2">
                      <span>{{ fieldName }}:</span>
                      <UBadge
                        :label="`${getSOAPMappings(soap, fieldName).length} mappings`"
                        :color="getSOAPMappings(soap, fieldName).length > 0 ? 'green' : 'red'"
                        variant="soft"
                        size="2xs"
                      />
                    </p>
                  </div>
                  <div class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <p class="text-blue-600 dark:text-blue-400 font-medium">💡 Open browser console for detailed matching info</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- HASIL LABORATORIUM -->
        <div v-if="visitDetails.lab && visitDetails.lab.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 rounded-t-xl border-b border-yellow-200 dark:border-yellow-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-flask" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 class="font-semibold text-yellow-800 dark:text-yellow-200">Hasil Laboratorium</h4>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div v-for="(labItem, index) in visitDetails.lab" :key="`lab-${index}`" class="border-b dark:border-gray-700 pb-4 last:border-b-0">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h5 class="font-semibold text-gray-900 dark:text-white">
                    {{ labItem.jenis_perawatan?.nm_perawatan ?? 'Nama Pemeriksaan Tidak Diketahui' }}
                  </h5>
                  <!-- SNOMED Mapping untuk jenis pemeriksaan (hanya satu) -->
                  <div v-if="getLabMapping(labItem)" class="mt-2">
                    <div class="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                      <UIcon name="i-tabler-check" class="text-green-600" />
                      <div class="flex-1">
                        <!-- Display for rsia_mapping_lab data -->
                        <template v-if="getLabMapping(labItem).code && getLabMapping(labItem).system === 'snomed'">
                          <p class="font-medium">{{ labItem.jenis_perawatan?.nm_perawatan }} → {{ getLabMapping(labItem).display }}</p>
                          <p class="text-xs text-gray-500">SNOMED: {{ getLabMapping(labItem).code }}</p>
                        </template>
                        <!-- Display for soap mappings data -->
                        <template v-else>
                          <p class="font-medium">"{{ getLabMapping(labItem).source_text }}" → {{ getLabMapping(labItem).snomed_term }}</p>
                          <p class="text-xs text-gray-500">SNOMED: {{ getLabMapping(labItem).snomed_concept_id }} | Type: {{ getLabMapping(labItem).concept_type }}</p>
                        </template>
                      </div>
                      <UButton
                        icon="i-tabler-trash"
                        size="2xs"
                        color="red"
                        variant="ghost"
                        @click="removeLabMapping(getLabMapping(labItem), 0)"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">
                    {{ new Date(`${labItem.tgl_periksa} ${labItem.jam}`).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}
                  </span>
                  <UButton
                    v-if="!labItem.jenis_perawatan?.rsia_mapping_lab && !getLabMapping(labItem)"
                    icon="i-tabler-plus"
                    label="Mapping"
                    color="yellow"
                    size="xs"
                    variant="soft"
                    @click="openAddLabMapping(labItem)"
                  />
                  <UButton
                    v-else
                    icon="i-tabler-edit"
                    label="Edit"
                    color="green"
                    size="xs"
                    variant="soft"
                    @click="openAddLabMapping(labItem)"
                  />
                </div>
              </div>
              <UTable
                v-if="labItem.detail_periksa_lab && labItem.detail_periksa_lab.length > 0"
                :rows="labItem.detail_periksa_lab"
                :columns="labDetailColumns"
                :ui="{ td: { padding: 'py-2 px-3 text-sm' }, th: { padding: 'py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700' } }"
                class="rounded-lg overflow-hidden"
              >
                <template #template.Pemeriksaan-data="{ row }">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <span>{{ row.template?.Pemeriksaan }}</span>
                      <!-- Show mapping info if exists -->
                      <div v-if="row.template?.satu_sehat_mapping_lab" class="mt-1">
                        <UBadge
                          :label="`${row.template.satu_sehat_mapping_lab.code} - ${row.template.satu_sehat_mapping_lab.display}`"
                          color="blue"
                          variant="soft"
                          size="2xs"
                        />
                      </div>
                    </div>
                    <!-- Tombol mapping untuk pemeriksaan spesifik -->
                    <div class="flex items-center gap-1">
                      <UButton
                        v-if="row.template && !row.template?.satu_sehat_mapping_lab"
                        icon="i-tabler-plus"
                        size="2xs"
                        color="yellow"
                        variant="ghost"
                        @click="openAddLabMappingDetail(labItem, row.template)"
                      />
                      <UButton
                        v-else-if="row.template?.satu_sehat_mapping_lab"
                        icon="i-tabler-edit"
                        size="2xs"
                        color="green"
                        variant="ghost"
                        @click="openAddLabMappingDetail(labItem, row.template)"
                      />
                    </div>
                  </div>
                </template>
                <template #nilai-data="{ row }">
                  <span :class="{ 'font-bold text-red-500': isNilaiAbnormal(row.nilai, row.nilai_rujukan) }">
                    {{ row.nilai }}
                  </span>
                </template>
              </UTable>
              <p v-else class="text-sm text-gray-500 italic">Tidak ada detail hasil.</p>
            </div>
          </div>
        </div>

        <!-- RESEP OBAT -->
        <!-- Resep Obat section now working - debug info removed -->

        <div v-if="resepObat && resepObat.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-green-50 dark:bg-green-900/20 px-6 py-4 rounded-t-xl border-b border-green-200 dark:border-green-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-pills" class="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 class="font-semibold text-green-800 dark:text-green-200">Resep Obat</h4>
                <div class="flex items-center gap-2 ml-4">
                  <UBadge
                    :label="`${resepSummary.totalResep} Resep`"
                    color="green"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    :label="`${resepSummary.totalObat} Obat`"
                    color="blue"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    :label="`Rp ${formatCurrency(resepSummary.totalBiaya)}`"
                    color="purple"
                    variant="soft"
                    size="xs"
                  />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">
                  Total biaya obat
                </span>
              </div>
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div v-for="(resep, index) in resepObat" :key="`resep-${index}`" class="border-b dark:border-gray-700 pb-4 last:border-b-0">
              <!-- Header Resep -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h5 class="font-semibold text-gray-900 dark:text-white">No. Resep: {{ resep.no_resep }}</h5>
                    <UBadge
                      :label="resep.status || 'Belum Diberikan'"
                      :color="resep.status === 'Selesai' ? 'green' : resep.status === 'Diproses' ? 'yellow' : 'gray'"
                      variant="soft"
                      size="xs"
                    />
                  </div>
                  <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span class="font-medium">Dokter:</span> {{ resep.dokter?.nama || '-' }}
                    </div>
                    <div>
                      <span class="font-medium">Tanggal Peresepan:</span>
                      {{ resep.tgl_peresepan ? new Date(resep.tgl_peresepan).toLocaleDateString('id-ID') : new Date(resep.tgl_perawatan).toLocaleDateString('id-ID') }}
                      {{ resep.jam_peresepan || '' }}
                    </div>
                    <div>
                      <span class="font-medium">Tanggal Penyerahan:</span>
                      {{ new Date(`${resep.tgl_penyerahan} ${resep.jam_penyerahan}`).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Detail Obat -->
              <div v-if="resep.detail && resep.detail.length > 0" class="space-y-2">
                <h6 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Detail Obat:</h6>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Obat</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jumlah</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Satuan</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aturan Pakai</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      <tr v-for="(obat, obatIndex) in resep.detail" :key="`obat-${obatIndex}`" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-3 py-3">
                          <div>
                            <div class="font-medium text-gray-900 dark:text-white">{{ obat.obat?.nama_brng || 'Nama obat tidak diketahui' }}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">{{ obat.kode_brng }}</div>
                            <div v-if="obat.obat?.kode_sat" class="text-xs text-gray-400">Satuan: {{ obat.obat.kode_sat }}</div>
                            <div v-if="obat.no_batch" class="text-xs text-gray-400">Batch: {{ obat.no_batch }}</div>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="font-medium">{{ obat.jml }}</span>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="text-xs">{{ obat.obat?.kode_sat || '-' }}</span>
                        </td>
                        <td class="px-3 py-3">
                          <div v-if="obat.aturanPakai">
                            <div class="text-xs">{{ obat.aturanPakai.aturan_pakai || '-' }}</div>
                            <div v-if="obat.aturanPakai.aturan_pakai_desc" class="text-xs text-gray-500 dark:text-gray-400">{{ obat.aturanPakai.aturan_pakai_desc }}</div>
                          </div>
                          <span v-else class="text-xs text-gray-400">-</span>
                        </td>
                        <td class="px-3 py-3 text-right">
                          <div class="font-medium text-gray-900 dark:text-white">
                            Rp {{ formatCurrency(obat.total) }}
                          </div>
                          <div v-if="obat.biaya_obat && obat.embalase" class="text-xs text-gray-500">
                            (Obat: Rp {{ formatCurrency(obat.biaya_obat) }} + Embalase: Rp {{ formatCurrency(obat.embalase) }})
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <td colspan="4" class="px-3 py-3 text-right font-medium">
                          Total Resep:
                        </td>
                        <td class="px-3 py-3 text-right font-bold text-green-600 dark:text-green-400">
                          Rp {{ formatCurrency(resep.detail.reduce((sum, obat) => sum + (obat.total || 0), 0)) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TARIF & TINDAKAN -->
        <div v-if="procedureBilling && procedureBilling.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 rounded-t-xl border-b border-purple-200 dark:border-purple-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-coin" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 class="font-semibold text-purple-800 dark:text-purple-200">Tarif & Tindakan</h4>
              </div>
              <UButton
                icon="i-tabler-refresh"
                label="Refresh"
                color="purple"
                size="sm"
                variant="soft"
                @click="loadProcedureBilling"
                :loading="loadingBilling"
              />
            </div>
          </div>
          <div class="p-6">
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                    <UIcon name="i-tabler-file-description" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Total Tindakan</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ billingSummary.total_procedures || 0 }}</p>
                  </div>
                </div>
              </div>

              <div class="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                    <UIcon name="i-tabler-currency-dollar" class="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Total Biaya</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(billingSummary.total_biaya) }}</p>
                  </div>
                </div>
              </div>

              <div class="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <UIcon name="i-tabler-users" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Petugas Terlibat</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ billingSummary.by_jenis_petugas?.length || 0 }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Procedures Table -->
            <UTable
              :rows="procedureBilling"
              :columns="billingColumns"
              :ui="{ td: { padding: 'py-3 px-4 text-sm' }, th: { padding: 'py-3 px-4 text-sm bg-gray-50 dark:bg-gray-700 font-semibold' } }"
              class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
            >
              <template #nm_perawatan-data="{ row }">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ row.nm_perawatan }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <UBadge
                      :label="row.status_rawat"
                      :color="row.status_rawat === 'Ralan' ? 'blue' : 'green'"
                      size="2xs"
                      variant="soft"
                    />
                    <UBadge
                      :label="row.jenis_petugas"
                      color="gray"
                      size="2xs"
                      variant="soft"
                    />
                  </div>
                  <!-- SNOMED Mapping Display -->
                  <div v-if="row.snomed_mapping && row.snomed_mapping.has_mapping" class="mt-2">
                    <div class="bg-purple-50 dark:bg-purple-900/20 rounded p-2 border border-purple-200 dark:border-purple-800">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-tabler-code" class="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span class="text-xs text-purple-700 dark:text-purple-300 font-mono">
                            {{ row.snomed_mapping.snomed.code }}
                          </span>
                          <span class="text-xs text-purple-600 dark:text-purple-400">
                            {{ row.snomed_mapping.snomed.display }}
                          </span>
                        </div>
                        <UButton
                          :label="'Edit'"
                          size="2xs"
                          color="purple"
                          variant="soft"
                          @click="openProcedureMappingModal(row, row.snomed_mapping)"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- Mapping Status (No Mapping) -->
                  <div v-else-if="row.kd_jenis_prw && !row.snomed_mapping?.has_mapping" class="mt-2">
                    <div class="bg-amber-50 dark:bg-amber-900/20 rounded p-2 border border-amber-200 dark:border-amber-800">
                      <div class="flex items-center gap-2">
                        <UIcon name="i-tabler-alert-triangle" class="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span class="text-xs text-amber-700 dark:text-amber-300">
                          Belum ada SNOMED mapping
                        </span>
                        <UButton
                          :label="'Mapping'"
                          size="2xs"
                          color="amber"
                          variant="soft"
                          @click="openProcedureMappingModal(row)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template #biaya_rawat-data="{ row }">
                <div class="text-right">
                  <p class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(row.biaya?.biaya_rawat || row.biaya_rawat) }}</p>
                </div>
              </template>

              <template #waktu-data="{ row }">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <p>{{ formatDate(row.tgl_perawatan) }}</p>
                  <p class="text-xs">{{ row.jam_rawat }}</p>
                </div>
              </template>

              <template #stts_bayar-data="{ row }">
                <UBadge
                  :label="row.stts_bayar || 'Belum'"
                  :color="row.stts_bayar === 'Sudah' ? 'green' : 'yellow'"
                  size="2xs"
                  variant="soft"
                />
              </template>
            </UTable>

            <!-- Top Procedures -->
            <div v-if="topProcedures && topProcedures.length > 0" class="mt-6">
              <h5 class="font-semibold text-gray-900 dark:text-white mb-3">Tindakan Teratas (berdasarkan biaya)</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="(proc, index) in topProcedures"
                  :key="`top-proc-${index}`"
                  class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <p class="font-medium text-sm text-gray-900 dark:text-white">{{ proc.nm_perawatan }}</p>
                      <p class="text-xs text-gray-500 mt-1">{{ proc.frequency }}x</p>
                    </div>
                    <p class="font-semibold text-sm text-purple-600 dark:text-purple-400">{{ formatCurrency(proc.total_biaya || 0) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RADIOLOGI -->
        <div v-if="visitDetails.radiologi" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 rounded-t-xl border-b border-indigo-200 dark:border-indigo-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-radioactive" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-200">Hasil Radiologi</h4>
            </div>
          </div>
          <div class="p-6">
            <pre class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">{{ visitDetails.radiologi }}</pre>
          </div>
        </div>

        <!-- CATATAN TAMBAHAN -->
        <div v-if="visitDetails.cppt_catatan && visitDetails.cppt_catatan.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-gray-50 dark:bg-gray-900/20 px-6 py-4 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-note" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h4 class="font-semibold text-gray-800 dark:text-gray-200">Catatan Tambahan</h4>
            </div>
          </div>
          <div class="p-6 space-y-3">
            <div v-for="(catatan, index) in visitDetails.cppt_catatan" :key="`catatan-${index}`" class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <p class="font-medium text-sm">{{ new Date(`${catatan.tanggal} ${catatan.jam}`).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}</p>
                <p class="text-xs text-gray-500">Dokter: {{ catatan.kd_dokter }}</p>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ catatan.catatan }}</p>
            </div>
          </div>
        </div>

        <!-- INLINE SNOMED SEARCH SECTION -->
        <div v-if="showSNOMEDSearch" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 rounded-t-xl border-b border-blue-200 dark:border-blue-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-search" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 class="font-semibold text-blue-800 dark:text-blue-200">Pencarian SNOMED CT</h4>
              </div>
              <UButton
                icon="i-tabler-x"
                size="sm"
                color="gray"
                variant="ghost"
                @click="toggleSNOMEDSearch"
              />
            </div>
          </div>

          <div class="p-6 space-y-4">
            <!-- Search Input -->
            <div>
              <label class="block text-sm font-medium mb-2">Cari Konsep SNOMED</label>
              <UInput
                v-model="snomedSearchInline"
                placeholder="Ketik minimal 3 karakter untuk mencari..."
                @input="searchSnomedInline"
                size="lg"
                icon="i-tabler-search"
              >
                <template #trailing>
                  <UIcon
                    v-if="searchingSnomedInline"
                    name="i-tabler-loader-2"
                    class="animate-spin"
                  />
                </template>
              </UInput>
            </div>

            <!-- Concept Type Filter -->
            <div>
              <label class="block text-sm font-medium mb-2">Tipe Konsep</label>
              <USelectMenu
                v-model="conceptTypeFilter"
                :options="conceptTypeOptions"
                placeholder="Pilih tipe konsep"
              />
            </div>

            <!-- Search Results -->
            <div v-if="snomedSearchResultsInline.length > 0" class="space-y-2">
              <h5 class="text-sm font-medium">Hasil Pencarian:</h5>
              <div class="max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg">
                <div
                  v-for="result in snomedSearchResultsInline"
                  :key="result.snomed_concept_id"
                  class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                  @click="selectSnomedConceptInline(result)"
                >
                  <p class="font-semibold text-sm">{{ result.snomed_term }}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    ID: {{ result.snomed_concept_id }} |
                    Tag: {{ result.semantic_tag || 'N/A' }}
                  </p>
                  <p v-if="result.snomed_fsn" class="text-xs text-gray-400 mt-1">{{ result.snomed_fsn }}</p>
                </div>
              </div>
            </div>

            <!-- Selected Concept -->
            <div v-if="selectedSNOMEDConcept.snomed_concept_id" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 class="text-sm font-medium mb-2">Konsep Terpilih:</h5>
              <p class="text-sm font-medium">{{ selectedSNOMEDConcept.snomed_term }}</p>
              <p class="text-xs text-gray-500 mt-1">
                SNOMED ID: {{ selectedSNOMEDConcept.snomed_concept_id }}
                <span v-if="selectedSNOMEDConcept.snomed_fsn"> | FSN: {{ selectedSNOMEDConcept.snomed_fsn }}</span>
              </p>
            </div>

            <!-- Text to Map -->
            <div>
              <label class="block text-sm font-medium mb-2">Teks yang akan dipetakan</label>
              <UInput
                v-model="textToMap"
                placeholder="Masukkan teks dari clinical notes yang ingin dipetakan..."
                size="lg"
              />
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end gap-2 pt-4">
              <UButton
                label="Batal"
                color="gray"
                variant="soft"
                @click="resetSNOMEDSearch"
              />
              <UButton
                label="Tambah Mapping"
                color="blue"
                @click="addSNOMEDMappingInline"
                :disabled="!selectedSNOMEDConcept.snomed_concept_id || !textToMap"
              />
            </div>
          </div>
        </div>

        <!-- AUTO SUGGESTIONS -->
        <div v-if="snomedSuggestions.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-amber-50 dark:bg-amber-900/20 px-6 py-4 rounded-t-xl border-b border-amber-200 dark:border-amber-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-bulb" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 class="font-semibold text-amber-800 dark:text-amber-200">Saran SNOMED (Auto Suggestions)</h4>
            </div>
          </div>
          <div class="p-6">
            <div class="space-y-2">
              <div v-for="(sugg, idx) in snomedSuggestions.slice(0, 5)" :key="`sugg-${idx}`" class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                <div>
                  <span class="font-medium text-sm">"{{ sugg.source_text }}"</span>
                  <span class="text-blue-600 dark:text-blue-400">→ {{ sugg.suggested_term }}</span>
                  <span class="text-xs text-gray-500 ml-2">({{ sugg.source_field }})</span>
                </div>
                <UButton
                  label="Gunakan"
                  size="xs"
                  color="blue"
                  @click="useSuggestionForSOAP(sugg)"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Error State -->
      <div v-else-if="!loadingVisitDetails && !visitDetails" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div class="flex items-center gap-4">
          <UIcon name="i-tabler-alert-circle" class="w-8 h-8 text-red-500" />
          <div>
            <h3 class="font-semibold text-red-800 dark:text-red-200">Gagal Memuat Detail</h3>
            <p class="text-red-600 dark:text-red-300 text-sm">Terjadi kesalahan saat memuat detail pemeriksaan. Silakan coba lagi.</p>
          </div>
        </div>
      </div>

      <!-- ========================================= -->
      <!-- BUNDLE RM DISPLAY SECTION                 -->
      <!-- ========================================= -->
      <div v-if="selectedVisitData && !loadingVisitDetails && visitDetails" class="mt-8">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-tabler-file-code" class="w-5 h-5 text-purple-600" />
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">Bundle RM (FHIR BPJS)</h3>
                  <p class="text-sm text-gray-500">Struktur data yang akan dikirim ke BPJS API</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-tabler-refresh"
                  label="Generate Bundle"
                  color="purple"
                  variant="soft"
                  size="sm"
                  @click="generateAndShowBundle"
                  :loading="loadingBundle"
                />
                <UButton
                  icon="i-tabler-copy"
                  label="Copy"
                  color="gray"
                  variant="soft"
                  size="sm"
                  @click="copyBundleToClipboard"
                  :disabled="!currentBundle"
                />
              </div>
            </div>
          </template>

          <!-- Bundle Content -->
          <div class="space-y-4">
            <!-- Bundle Info -->
            <div v-if="currentBundle" class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="font-medium text-purple-800 dark:text-purple-200">Resource Type:</span>
                  <p class="text-purple-600 dark:text-purple-300">{{ currentBundle.resourceType }}</p>
                </div>
                <div>
                  <span class="font-medium text-purple-800 dark:text-purple-200">ID:</span>
                  <p class="text-purple-600 dark:text-purple-300 font-mono text-xs">{{ currentBundle.id }}</p>
                </div>
                <div>
                  <span class="font-medium text-purple-800 dark:text-purple-200">Entries:</span>
                  <p class="text-purple-600 dark:text-purple-300">{{ currentBundle.entry?.length || 0 }} resources</p>
                </div>
                <div>
                  <span class="font-medium text-purple-800 dark:text-purple-200">Type:</span>
                  <p class="text-purple-600 dark:text-purple-300">{{ currentBundle.type }}</p>
                </div>
              </div>
            </div>

            <!-- Bundle JSON Display -->
            <div v-if="currentBundle" class="relative">
              <div class="absolute top-2 right-2 z-10">
                <UButton
                  icon="i-tabler-eye"
                  label="Expand/Collapse"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  @click="bundleExpanded = !bundleExpanded"
                />
              </div>

              <div
                class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto font-mono text-sm transition-all duration-300"
                :style="{ maxHeight: bundleExpanded ? '800px' : '300px' }"
              >
                <pre>{{ JSON.stringify(currentBundle, null, 2) }}</pre>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="!loadingBundle" class="text-center py-8 text-gray-500">
              <UIcon name="i-tabler-file-code" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p class="font-medium">Bundle RM belum digenerate</p>
              <p class="text-sm">Klik tombol "Generate Bundle" untuk membuat struktur FHIR BPJS</p>
            </div>

            <!-- Loading State -->
            <div v-else class="text-center py-8">
              <UIcon name="i-tabler-loader-2" class="w-8 h-8 mx-auto mb-3 text-purple-500 animate-spin" />
              <p class="text-gray-600">Mengenerate bundle RM...</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- FLOATING BPJS SUBMISSION BUTTON -->
    <div v-if="selectedVisitData && !loadingVisitDetails" class="fixed bottom-6 right-6 z-50">
      <div class="relative group">
        <!-- Tooltip/Info Card -->
        <div class="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div class="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg min-w-48">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-tabler-info-circle" class="w-4 h-4" />
              <span class="font-semibold">Kirim Data ke BPJS</span>
            </div>
            <div class="text-xs space-y-1 text-gray-300">
              <p>• No. SEP: {{ selectedVisitData.no_sep }}</p>
              <p>• No. Rawat: {{ selectedVisitData.no_rawat }}</p>
              <p>• Jenis: {{ selectedVisitData.jnspelayanan }}</p>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-700 text-xs text-blue-300">
              Klik untuk mengirim semua data ERM dalam format FHIR Bundle
            </div>
          </div>
          <!-- Arrow -->
          <div class="absolute -bottom-2 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
        </div>

        <!-- Main Button -->
        <UButton
          icon="i-tabler-send"
          label="Kirim ke BPJS"
          color="green"
          size="lg"
          :loading="sendingToBpjs"
          @click="sendToBpjs"
          class="shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          :ui="{
            base: 'relative overflow-hidden rounded-xl font-semibold',
            color: {
              green: {
                solid: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white dark:from-green-600 dark:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700',
              }
            }
          }"
        >
          <template #trailing>
            <UIcon v-if="!sendingToBpjs" name="i-tabler-rocket" class="w-4 h-4 animate-pulse" />
          </template>
        </UButton>

        <!-- Success/Error Indicator -->
        <div v-if="bpjsSubmissionStatus" class="absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900"
          :class="{
            'bg-green-500': bpjsSubmissionStatus === 'success',
            'bg-red-500': bpjsSubmissionStatus === 'error',
            'bg-blue-500 animate-pulse': bpjsSubmissionStatus === 'sending'
          }"
        >
          <UIcon
            :name="bpjsSubmissionStatus === 'success' ? 'i-tabler-check' :
                   bpjsSubmissionStatus === 'error' ? 'i-tabler-x' :
                   'i-tabler-loader-2'"
            class="w-3 h-3 text-white"
            :class="{ 'animate-spin': bpjsSubmissionStatus === 'sending' }"
          />
        </div>
      </div>
    </div>

    <!-- ========================================= -->
    <!-- MODAL: ADD/SEARCH SNOMED MAPPING         -->
    <!-- ========================================= -->
    <UModal v-model="openModalAddMapping" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <h3 class="font-semibold">Add SNOMED Mapping</h3>
          <p class="text-sm text-gray-500">Field: {{ currentMappingContext?.source_field }}</p>
        </template>

        <div class="space-y-4">
          <!-- Full text context -->
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
            <p class="font-semibold mb-1">Full Text:</p>
            <p class="text-gray-700 dark:text-gray-300">{{ currentMappingContext?.full_text }}</p>
          </div>

          <!-- Extract text -->
          <div>
            <label class="block text-sm font-medium mb-1">Text/Phrase to Map</label>
            <UInput
              v-model="newMapping.source_text"
              placeholder="e.g., 'mata buram', 'nyeri dada'"
              size="lg"
            />
            <p class="text-xs text-gray-500 mt-1">Extract specific phrase/sentence dari text di atas</p>
          </div>

          <!-- Search SNOMED -->
          <div>
            <label class="block text-sm font-medium mb-2">Search SNOMED Concept</label>
            <UInput
              v-model="snomedSearchTerm"
              placeholder="Type to search... (min 3 characters)"
              @input="searchSnomedDebounced"
              size="lg"
            >
              <template #trailing>
                <UIcon
                  v-if="searchingSnomed"
                  name="i-tabler-loader-2"
                  class="animate-spin"
                />
                <UIcon v-else name="i-tabler-search" />
              </template>
            </UInput>

            <!-- Search Results -->
            <div
              v-if="snomedSearchResults.length > 0"
              class="mt-2 border dark:border-gray-700 rounded max-h-60 overflow-y-auto"
            >
              <div
                v-for="result in snomedSearchResults"
                :key="result.snomed_concept_id"
                class="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                @click="selectSnomedConcept(result)"
              >
                <p class="font-semibold text-sm">{{ result.snomed_term }}</p>
                <p class="text-xs text-gray-500 mt-1">
                  ID: {{ result.snomed_concept_id }} |
                  Tag: {{ result.semantic_tag || 'N/A' }}
                </p>
              </div>
            </div>

            <p v-else-if="snomedSearchTerm && snomedSearchTerm.length >= 3 && !searchingSnomed" class="text-sm text-gray-500 mt-2">
              No results found
            </p>
          </div>

          <!-- Selected SNOMED Concept -->
          <div v-if="newMapping.snomed_concept_id" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <p class="font-semibold text-sm">Selected:</p>
            <p class="text-sm mt-1">{{ newMapping.snomed_term }}</p>
            <p class="text-xs text-gray-500 mt-1">
              SNOMED ID: {{ newMapping.snomed_concept_id }}
            </p>
            <p v-if="newMapping.snomed_fsn" class="text-xs text-gray-500">
              FSN: {{ newMapping.snomed_fsn }}
            </p>
          </div>

          <!-- Concept Type -->
          <div>
            <label class="block text-sm font-medium mb-1">Concept Type</label>
            <USelectMenu
              v-model="newMapping.concept_type"
              :options="conceptTypeOptions"
              placeholder="Select concept type"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="gray" variant="soft" @click="closeAddMapping" />
            <UButton
              label="Add Mapping"
              color="blue"
              @click="confirmAddMapping"
              :disabled="!newMapping.snomed_concept_id || !newMapping.source_text"
              :loading="savingMapping"
            />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- ========================================= -->
    <!-- MODAL: LAB MAPPING SNOMED                 -->
    <!-- ========================================= -->
    <UModal v-model="openModalLabMapping" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-tabler-flask" class="w-5 h-5 text-yellow-600" />
            <div>
              <h3 class="font-semibold">Lab SNOMED Mapping</h3>
              <p class="text-sm text-gray-500">{{ currentLabContext?.jenis_perawatan?.nm_perawatan || 'Pemeriksaan Laboratorium' }}</p>
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Lab Info -->
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-start gap-3">
              <UIcon name="i-tabler-info-circle" class="w-5 h-5 text-yellow-600 mt-0.5" />
              <div class="flex-1">
                <p class="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Informasi Pemeriksaan</p>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Jenis Pemeriksaan:</span>
                    <span class="font-medium">{{ currentLabContext?.jenis_perawatan?.nm_perawatan }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Kode:</span>
                    <span class="font-mono text-xs">{{ currentLabContext?.jenis_perawatan?.kd_jenis_prw }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Tanggal:</span>
                    <span>{{ new Date(`${currentLabContext?.tgl_periksa} ${currentLabContext?.jam}`).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mapping Form -->
          <div class="grid grid-cols-1 gap-4">
            <!-- Code Field -->
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                SNOMED Code <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="labSearchTerm"
                placeholder="e.g., 445010003 atau 'hemoglobin'"
                size="lg"
                :loading="searchingLabSnomed"
                @input="searchLabSnomedDebounced"
              >
                <template #trailing>
                  <UIcon
                    v-if="searchingLabSnomed"
                    name="i-tabler-loader-2"
                    class="animate-spin"
                  />
                  <UIcon v-else name="i-tabler-search" />
                </template>
              </UInput>
              <p class="text-xs text-gray-500 mt-1">Ketik kode SNOMED atau nama pemeriksaan untuk pencarian otomatis</p>

              <!-- SNOMED Search Results -->
              <div v-if="labSearchResults.length > 0" class="mt-3 space-y-2">
                <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Hasil Pencarian SNOMED:</h5>
                <div class="max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg">
                  <div
                    v-for="result in labSearchResults"
                    :key="result.snomed_concept_id"
                    class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-700 last:border-b-0 transition-colors"
                    @click="selectLabSnomedConcept(result)"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-medium text-sm">{{ result.snomed_term }}</p>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="text-xs text-gray-500">ID: {{ result.snomed_concept_id }}</span>
                          <UBadge
                            v-if="result.semantic_tag"
                            :label="result.semantic_tag"
                            color="blue"
                            variant="soft"
                            size="2xs"
                          />
                        </div>
                        <p v-if="result.snomed_fsn" class="text-xs text-gray-400 mt-1 italic">{{ result.snomed_fsn }}</p>
                      </div>
                      <UIcon name="i-tabler-chevron-right" class="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- System Field -->
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                System <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="labMapping.system"
                :options="[
                  { label: 'SNOMED CT', value: 'snomed' },
                  { label: 'LOINC', value: 'loinc' },
                  { label: 'ICD-10', value: 'icd10' },
                  { label: 'ICD-9-CM', value: 'icd9' },
                  { label: 'Local', value: 'local' }
                ]"
                placeholder="Pilih sistem terminologi"
                size="lg"
              />
              <p class="text-xs text-gray-500 mt-1">Pilih sistem terminologi yang digunakan</p>
            </div>

            <!-- Display Field -->
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Display Name <span class="text-red-500">*</span>
              </label>
              <UTextarea
                v-model="labMapping.display"
                placeholder="e.g., Hemoglobin measurement"
                :rows="2"
                size="lg"
              />
              <p class="text-xs text-gray-500 mt-1">Terisi otomatis dari hasil pencarian atau bisa diedit manual</p>
            </div>
          </div>

          <!-- Selected Mapping Preview -->
          <div v-if="labMapping.code || labMapping.display" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Preview Mapping:</h5>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Code:</span>
                <span class="font-mono font-medium">{{ labMapping.code || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">System:</span>
                <span class="font-medium">{{ labMapping.system || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Display:</span>
                <span class="font-medium text-right">{{ labMapping.display || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- No Results State -->
          <div v-else-if="labMapping.system === 'snomed' && labSearchTerm && labSearchTerm.length >= 3 && !searchingLabSnomed" class="text-center py-4">
            <UIcon name="i-tabler-search-off" class="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p class="text-sm text-gray-500">Tidak ada hasil untuk "{{ labSearchTerm }}"</p>
            <p class="text-xs text-gray-400 mt-1">Coba kata kunci yang berbeda</p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500">
              <span class="font-medium">Tips:</span> Gunakan pencarian untuk menemukan kode SNOMED yang tepat
            </div>
            <div class="flex gap-2">
              <UButton
                label="Batal"
                color="gray"
                variant="soft"
                @click="closeLabMapping"
              />
              <UButton
                label="Simpan Mapping"
                color="blue"
                @click="confirmLabMapping"
                :disabled="!labMapping.code || !labMapping.system || !labMapping.display"
                :loading="savingLabMapping"
              />
            </div>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Procedure SNOMED Mapping Modal -->
    <UModal v-model="showProcedureMappingModal" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              <UIcon name="i-tabler-code" class="w-5 h-5 mr-2" />
              {{ procedureMapping.code ? 'Edit' : 'Add' }} SNOMED CT Mapping - {{ currentProcedure?.nm_perawatan }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-tabler-x"
              @click="showProcedureMappingModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Procedure Info -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-500 dark:text-gray-400">Kode Prosedur</p>
                <p class="font-medium">{{ currentProcedure?.kd_jenis_prw }}</p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-gray-400">Nama Prosedur</p>
                <p class="font-medium">{{ currentProcedure?.nm_perawatan }}</p>
              </div>
            </div>
          </div>

          <!-- SNOMED Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cari SNOMED CT Code
            </label>
            <div class="relative">
              <UInput
                v-model="procedureSearchTerm"
                placeholder="Ketik kode atau nama SNOMED CT..."
                icon="i-tabler-search"
                @input="searchProcedureSnomed"
                :loading="searchingProcedureSnomed"
              />
            </div>

            <!-- Search Results -->
            <div v-if="procedureSearchResults.length > 0" class="mt-2 max-h-48 overflow-y-auto">
              <div class="space-y-1">
                <div
                  v-for="(result, index) in procedureSearchResults"
                  :key="`procedure-search-${index}`"
                  class="p-2 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  @click="selectProcedureSnomed(result)"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs text-purple-600 dark:text-purple-400">
                      {{ result.code }}
                    </span>
                    <span class="text-sm text-gray-900 dark:text-white">
                      {{ result.display }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mapping Form -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SNOMED CT Code *
              </label>
              <UInput
                v-model="procedureMapping.code"
                placeholder="Contoh: 123456"
                :disabled="searchingProcedureSnomed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name *
              </label>
              <UInput
                v-model="procedureMapping.display"
                placeholder="Contoh: Appendectomy"
                :disabled="searchingProcedureSnomed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                System URI
              </label>
              <UInput
                v-model="procedureMapping.system"
                placeholder="http://snomed.info/sct"
                :disabled="searchingProcedureSnomed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deskripsi
              </label>
              <UTextarea
                v-model="procedureMapping.description"
                placeholder="Deskripsi singkat tentang prosedur..."
                :rows="3"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <USelect
                v-model="procedureMapping.status"
                :options="[
                  { label: 'Active', value: 'active' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Inactive', value: 'inactive' }
                ]"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catatan
              </label>
              <UTextarea
                v-model="procedureMapping.notes"
                placeholder="Catatan tambahan..."
                :rows="2"
              />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center w-full">
            <div class="text-sm text-gray-500">
              <UIcon name="i-tabler-info-circle" class="w-4 h-4 inline mr-1" />
              Mapping akan digunakan untuk integrasi sistem kesehatan
            </div>
            <div class="flex gap-2">
              <UButton
                label="Batal"
                color="gray"
                variant="soft"
                @click="showProcedureMappingModal = false"
              />
              <UButton
                label="Simpan Mapping"
                color="purple"
                :loading="savingProcedureMapping"
                :disabled="!procedureMapping.code || !procedureMapping.display"
                @click="saveProcedureMapping"
              />
            </div>
          </div>
        </template>
      </UCard>
    </UModal>

    <template #footer>
      <small>Data diambil dari server SIMRS</small>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useClipboard } from '@vueuse/core'

// Type declarations for window object extensions
declare global {
  interface Window {
    testBPJSBundle: () => Promise<any>
    validateCurrentData: () => Promise<void>
    testRealPatientBundle: () => Promise<any>
    testMinimalBundle: () => Promise<any>
    sendBPJSBundle: (bundle?: any) => Promise<any>
  }
}

// ========================================
// PROPS & STORES
// ========================================
const props = defineProps({
  data: { required: true, type: Object },
  refresh: { type: Function, required: true },
  status: { type: String, required: true },
  pending: { type: Boolean, default: false }
})

const config = useRuntimeConfig()
const tokenStore = useAccessTokenStore()
const toast = useToast()
const { text, copy, copied, isSupported } = useClipboard({ source: ref('') })

// ========================================
// EXISTING REFS (Tab Riwayat)
// ========================================
const selectedRowData = ref(null)
const selectedVisitData = ref(null)
const isLoadingDetails = ref(false)
const loadingVisitDetails = ref(false)
const ermDetails = ref<any>(null)
const visitDetails = ref<any>(null)
const sep = ref('')
const noRawat = ref('')

// Bundle RM Display refs
const currentBundle = ref<any>(null)
const loadingBundle = ref(false)
const bundleExpanded = ref(false)

// New refs for inline detail view
const snomedSuggestions = ref([] as any[])
const soapMappings = ref([] as any[])

// Inline SNOMED search refs
const showSNOMEDSearch = ref(false)
const snomedSearchInline = ref('')
const snomedSearchResultsInline = ref([] as any[])
const searchingSnomedInline = ref(false)
const selectedSNOMEDConcept = ref({
  snomed_concept_id: null as number | null,
  snomed_term: '',
  snomed_fsn: ''
})
const textToMap = ref('')
const conceptTypeFilter = ref('finding')

const labDetailColumns = [
  { key: 'template.Pemeriksaan', label: 'Pemeriksaan' },
  { key: 'nilai', label: 'Hasil' },
  { key: 'template.satuan', label: 'Satuan' },
  { key: 'nilai_rujukan', label: 'Nilai Rujukan' },
  { key: 'keterangan', label: 'Keterangan' }
]

// ========================================
// NEW REFS (Unified View)
// ========================================
const viewFilter = ref('combined') // Default to combined view
const viewFilterOptions = [
  { label: 'Semua (Gabungan)', value: 'combined' },
  { label: 'Riwayat Klaim', value: 'riwayat' },
  { label: 'Coding SNOMED', value: 'coding' }
]

const codingQueue = ref([])
const loadingCodingQueue = ref(false)
const codingStatusFilter = ref('all') // Default show all

const openModalCoding = ref(false)
const selectedCodingSep = ref('')
// Legacy modal variables (kept for compatibility)
const codingDetail = ref<any>(null)
const loadingCodingDetail = ref(false)
const savingCoding = ref(false)

const codingForm = ref({
  no_sep: '',
  no_rawat: '',
  mappings: [] as any[],
  catatan_koder: '',
  status: 'draft'
})

// Add mapping modal
const openModalAddMapping = ref(false)
const currentMappingContext = ref<any>(null)
const newMapping = ref({
  source_text: '',
  snomed_concept_id: null as number | null,
  snomed_term: '',
  snomed_fsn: '',
  concept_type: 'symptom'
})

const snomedSearchTerm = ref('')
const snomedSearchResults = ref([] as any[])
const searchingSnomed = ref(false)
const savingMapping = ref(false)

const conceptTypeOptions = [
  'symptom',
  'finding',
  'disorder',
  'procedure',
  'body_structure',
  'other'
]

// Lab mapping refs
const openModalLabMapping = ref(false)
const currentLabContext = ref<any>(null)
const savingLabMapping = ref(false)

// Lab mapping form data
const labMapping = ref({
  code: '',
  system: 'snomed',
  display: ''
})

const labSearchTerm = ref('')
const labSearchResults = ref([] as any[])
const searchingLabSnomed = ref(false)

// Procedure Billing refs
const procedureBilling = ref([] as any[])
const billingSummary = ref<any>(null)
const topProcedures = ref([] as any[])
const loadingBilling = ref(false)

// Resep Obat state
const loadingResep = ref(false)
const resepObat = ref([])
const resepSummary = ref({
  totalResep: 0,
  totalObat: 0,
  totalBiaya: 0
})

// Procedure Mapping refs
const showProcedureMappingModal = ref(false)
const currentProcedure = ref<any>(null)
const procedureMapping = ref({
  kd_jenis_prw: '',
  code: '',
  system: 'http://snomed.info/sct',
  display: '',
  description: '',
  status: 'active',
  notes: ''
})
const procedureSearchTerm = ref('')
const procedureSearchResults = ref([] as any[])
const searchingProcedureSnomed = ref(false)
const savingProcedureMapping = ref(false)
const sendingToBpjs = ref(false)
const bpjsSubmissionStatus = ref<'idle' | 'sending' | 'success' | 'error'>('idle')

const codingStatusOptions = [
  { label: 'Semua', value: 'all' },
  { label: 'Belum Coding', value: 'pending' },
  { label: 'Draft', value: 'draft' },
  { label: 'Final', value: 'final' }
]

// ========================================
// COLUMNS
// ========================================
const riwayatColumns = [
  { key: 'tglsep', label: 'Tgl. SEP' },
  { key: 'no_sep', label: 'No. SEP' },
  { key: 'no_rawat', label: 'No. Rawat' },
  { key: 'jnspelayanan', label: 'Jenis' },
  { key: 'tgl_masuk', label: 'Tgl Masuk' },
  { key: 'tgl_keluar', label: 'Tgl Keluar' },
  { key: 'cbg', label: 'CBG' },
  { key: 'tarif', label: 'Tarif' },
  { key: 'status_klaim_kemkes', label: 'Status Klaim Kemenkes' },
  { key: 'actions', label: 'Aksi' }
]

const codingColumns = [
  { key: 'no_sep', label: 'No. SEP' },
  { key: 'no_rawat', label: 'No. Rawat' },
  { key: 'poliklinik', label: 'Poliklinik' },
  { key: 'dokter', label: 'Dokter' },
  { key: 'tgl_kunjungan', label: 'Tgl Kunjungan' },
  { key: 'jenis', label: 'Jenis' }, // Rawat Inap/Jalan
  { key: 'coding_status', label: 'Status Coding' },
  { key: 'actions', label: 'Aksi' }
]

const combinedColumns = [
  { key: 'no_sep', label: 'No. SEP' },
  { key: 'no_rawat', label: 'No. Rawat' },
  { key: 'jenis', label: 'Jenis' },
  { key: 'poliklinik', label: 'Poliklinik' },
  { key: 'dokter', label: 'Dokter' },
  { key: 'status_klaim', label: 'Status Klaim' },
  { key: 'coding_status', label: 'Status Coding' },
  { key: 'actions', label: 'Aksi' }
]

const billingColumns = [
  { key: 'nm_perawatan', label: 'Tindakan' },
  { key: 'jenis_petugas', label: 'Petugas' },
  { key: 'biaya_rawat', label: 'Biaya' },
  { key: 'waktu', label: 'Waktu' },
  { key: 'stts_bayar', label: 'Status Bayar' }
]

// ========================================
// COMPUTED PROPERTIES
// ========================================
const hasAnyData = computed(() => {
  return (props.data?.data && props.data.data.length > 0) || codingQueue.value.length > 0
})

const combinedTableData = computed(() => {
  const claimData = (props.data?.data as any[]) || []
  const codingData = codingQueue.value

  // Create a map for easy lookup
  const claimMap = new Map<string, any>()
  claimData.forEach(claim => {
    claimMap.set(claim.no_sep, claim)
  })

  // Combine the data
  const combined: any[] = []

  // Add coding data
  codingData.forEach(coding => {
    const claim = claimMap.get(coding.no_sep)
    combined.push({
      ...coding,
      hasCoding: true,
      hasClaim: !!claim,
      status_klaim: claim?.status_klaim || null,
      reg_periksa: claim?.reg_periksa || coding.reg_periksa
    })
  })

  // Add claim-only data (not in coding queue)
  claimData.forEach(claim => {
    if (!claimMap.has(claim.no_sep) || !codingData.some(c => c.no_sep === claim.no_sep)) {
      combined.push({
        ...claim,
        hasCoding: false,
        hasClaim: true,
        coding_casemix: null
      })
    }
  })

  // Sort by date (newest first)
  return combined.sort((a, b) => new Date(b.tglsep).getTime() - new Date(a.tglsep).getTime())
})
// Get patient info from props
const currentPatient = computed(() => {
  if (!props.data?.data || props.data.data.length === 0) {
    return {
      no_rkm_medis: null,
      nama: null,
      no_kartu: null
    }
  }
  return {
    no_rkm_medis: props.data.data[0]?.nomr,
    nama: props.data.data[0]?.nama_pasien,
    no_kartu: props.data.data[0]?.no_kartu
  }
})

// ========================================
// WATCHERS
// ========================================
watch(viewFilter, (newFilter) => {
  if (newFilter === 'coding' || newFilter === 'combined') {
    fetchCodingQueue()
  }
})

watch(codingStatusFilter, () => {
  fetchCodingQueue()
})

watch(copied, (val) => {
  if (val) {
    toast.add({
      icon: 'i-tabler-circle-check',
      title: 'Copied!',
      description: 'Text copied to clipboard',
      color: 'sky',
      timeout: 2000
    })
  }
})

// Auto-load coding queue when component mounts and patient data is available
watch(() => currentPatient.value.no_rkm_medis, (noRkmMedis) => {
  if (noRkmMedis) {
    fetchCodingQueue()
  }
}, { immediate: true })

// ========================================
// CODING FUNCTIONS
// ========================================

/**
 * Copy text to clipboard
 */
function copyToClipboard(text: string) {
  copy(text)
}

// ========================================
// BUNDLE RM DISPLAY FUNCTIONS
// ========================================

/**
 * Generate and show BPJS bundle
 */
async function generateAndShowBundle() {
  if (!selectedVisitData.value || !visitDetails.value) {
    return
  }

  loadingBundle.value = true

  try {
    // Combine all data for bundle generation
    const combinedData = {
      // Basic visit data
      no_rawat: selectedVisitData.value.no_rawat,
      no_sep: selectedVisitData.value.no_sep,
      tgl_registrasi: selectedVisitData.value.tgl_registrasi,
      jam_reg: selectedVisitData.value.jam_reg,
      jnspelayanan: selectedVisitData.value.jnspelayanan ||
                    visitDetails.value?.reg_periksa?.jnspelayanan ||
                    visitDetails.value?.registrasi?.jnspelayanan ||
                    'Ralan', // Default ke Rawat Jalan

      // Patient data (from visitDetails)
      no_rkm_medis: visitDetails.value.pasien?.no_rkm_medis,
      nm_pasien: visitDetails.value.pasien?.nm_pasien || selectedVisitData.value.nm_pasien,
      jk: visitDetails.value.pasien?.jk,
      tgl_lahir: visitDetails.value.pasien?.tgl_lahir,
      no_ktp: visitDetails.value.pasien?.no_ktp,
      no_peserta: visitDetails.value.pasien?.no_peserta,
      alamat: visitDetails.value.pasien?.alamat,
      nm_kab: visitDetails.value.pasien?.kabupaten?.nm_kab,
      nm_kec: visitDetails.value.pasien?.kecamatan?.nm_kec,
      kd_pos: visitDetails.value.pasien?.kd_pos,

      // Doctor data
      dpjp: visitDetails.value.dokter?.nm_dokter || selectedVisitData.value.nm_dokter,
      kd_dokter: visitDetails.value.dokter?.kd_dokter,
      jk_dokter: visitDetails.value.dokter?.jk,
      tgl_lahir_dokter: visitDetails.value.dokter?.tgl_lahir,
      no_nik_dokter: visitDetails.value.dokter?.pegawai?.no_nik,
      telp_dokter: visitDetails.value.dokter?.pegawai?.no_telp,
      email_dokter: visitDetails.value.dokter?.pegawai?.email,

      // Diagnosis data
      diagnosa: visitDetails.value.diagnosa?.map((d: any) => `${d.kode} - ${d.deskripsi}`).join(', '),
      kd_penyakit: visitDetails.value.diagnosa?.[0]?.kode,
      penyakit: visitDetails.value.diagnosa?.map((d: any) => d.deskripsi).join(', '),

      // Other data
      keluhan: visitDetails.value.keluhan,
      stts_pulang: visitDetails.value.stts_pulang || 'Pulang Diijinkan Dokter',
      no_rujukan: visitDetails.value.no_rujukan,
      nm_poli: visitDetails.value.poli?.nm_poli,
      stts_nikah: visitDetails.value.pasien?.stts_nikah
    }

    // Generate BPJS Medical Record Bundle dengan struktur Diagnosa, SOAP, dan Tindakan
    const bundle = await generateBPJSMedicalRecordBundle()

    // Store the bundle
    currentBundle.value = bundle

    // Log to console for debugging
    console.log('=== Generated BPJS Medical Record Bundle ===')
    console.log('Bundle:', JSON.stringify(bundle, null, 2))
    console.log('Total entries:', bundle?.entry?.length || 0)

    // Success toast
    useToast().add({
      title: 'MR Bundle Generated',
      description: `Generated MR bundle with ${bundle?.entry?.length || 0} resources (Patient, Organization, Practitioner, Encounter, Diagnosis, SOAP, Tindakan)`,
      color: 'green'
    })

  } catch (error) {
    console.error('Error generating MR bundle:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to generate Medical Record bundle. Check console for details.',
      color: 'red'
    })
  } finally {
    loadingBundle.value = false
  }
}

/**
 * Copy bundle to clipboard
 */
async function copyBundleToClipboard() {
  if (!currentBundle.value) {
    return
  }

  try {
    const bundleJson = JSON.stringify(currentBundle.value, null, 2)
    await navigator.clipboard.writeText(bundleJson)

    useToast().add({
      title: 'Bundle Copied',
      description: 'Bundle JSON copied to clipboard',
      color: 'green'
    })
  } catch (error) {
    console.error('Error copying bundle:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to copy bundle to clipboard',
      color: 'red'
    })
  }
}

/**
 * Fetch coding queue untuk pasien ini saja
 */
async function fetchCodingQueue() {
  if (!currentPatient.value.no_rkm_medis) {
    return
  }

  loadingCodingQueue.value = true
  try {
    const { data: queueData, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/queue-by-patient`,
      {
        method: 'GET',
        params: {
          no_rkm_medis: currentPatient.value.no_rkm_medis,
          status: codingStatusFilter.value
        },
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if (error.value) {
      console.error('Error fetching coding queue:', error.value)
      codingQueue.value = []
    } else {
      codingQueue.value = queueData.value?.data || []
    }
  } catch (err) {
    console.error('Error fetching coding queue:', err)
    codingQueue.value = []
  } finally {
    loadingCodingQueue.value = false
  }
}

/**
 * Handle click pada combined table row
 */
function handleCombinedRowClick(row: any) {
  if (row.hasCoding) {
    handleCodingRowClick(row)
  } else if (row.hasClaim) {
    handleRowClick(row)
  }
}

/**
 * Open coding for current selected visit
 */
function openCodingForCurrentVisit() {
  if (selectedRowData.value && selectedRowData.value.no_sep) {
    handleCodingRowClick(selectedRowData.value)
  }
}

/**
 * Handle click pada row coding queue
 */
async function handleCodingRowClick(row: any) {
  selectedCodingSep.value = row.no_sep
  openModalCoding.value = true
  
  await fetchCodingDetail(row.no_sep)
}

/**
 * Fetch detail untuk coding
 */
async function fetchCodingDetail(no_sep: string) {
  loadingCodingDetail.value = true
  try {
    const { data: detailData, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/visit/${no_sep}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if (error.value) {
      toast.add({
        icon: 'i-tabler-circle-x',
        title: 'Error',
        description: 'Gagal memuat detail coding',
        color: 'red'
      })
      codingDetail.value = null
    } else {
      codingDetail.value = detailData.value?.data
      
      // Initialize form
      codingForm.value = {
        no_sep: codingDetail.value.no_sep,
        no_rawat: codingDetail.value.no_rawat,
        mappings: (codingDetail.value as any)?.existing_coding?.clinical_notes_snomed?.map((m: any) => ({
          no_rawat: m.no_rawat,
          tgl_perawatan: m.tgl_perawatan,
          jam_rawat: m.jam_rawat,
          source_field: m.source_field,
          source_text: m.source_text,
          snomed_concept_id: m.snomed_concept_id,
          snomed_term: m.snomed_term,
          snomed_fsn: m.snomed_fsn,
          concept_type: m.concept_type,
          confidence_score: m.confidence_score,
          mapped_by: m.mapped_by
        })) || [],
        catatan_koder: codingDetail.value.existing_coding?.catatan_koder || '',
        status: codingDetail.value.existing_coding?.status || 'draft'
      }
    }
  } catch (err) {
    console.error('Error fetching coding detail:', err)
    codingDetail.value = null
  } finally {
    loadingCodingDetail.value = false
  }
}

/**
 * Get coding status label
 */
function getCodingStatusLabel(row: any) {
  if (!row.coding_casemix) return 'Belum Coding'
  return row.coding_casemix.status.charAt(0).toUpperCase() + row.coding_casemix.status.slice(1)
}

/**
 * Get coding status color
 */
function getCodingStatusColor(row: any) {
  if (!row.coding_casemix) return 'gray'

  const colors: Record<string, string> = {
    'draft': 'orange',
    'verified': 'blue',
    'final': 'green'
  }
  return colors[row.coding_casemix.status] || 'gray'
}

/**
 * Get mapped count
 */
function getMappedCount(soap: any) {
  const count = codingForm.value.mappings.filter(m =>
    m.no_rawat === soap.no_rawat &&
    m.tgl_perawatan === soap.tgl_perawatan &&
    m.jam_rawat === soap.jam_rawat
  ).length
  return count
}

/**
 * Get mappings for SOAP field
 */
function getMappingsForSOAP(soap: any, field: string) {
  return codingForm.value.mappings.filter(m =>
    m.no_rawat === soap.no_rawat &&
    m.tgl_perawatan === soap.tgl_perawatan &&
    m.jam_rawat === soap.jam_rawat &&
    m.source_field === field
  )
}

/**
 * Open add mapping modal
 */
function openAddMapping(soap: any, field: string) {
  currentMappingContext.value = {
    soap: soap,
    source_field: field,
    full_text: soap[field]
  }
  
  newMapping.value = {
    source_text: '',
    snomed_concept_id: null,
    snomed_term: '',
    snomed_fsn: '',
    concept_type: field === 'keluhan' ? 'symptom' : 
                  field === 'pemeriksaan' ? 'finding' :
                  field === 'penilaian' ? 'disorder' : 
                  field === 'rtl' ? 'procedure' : 'other'
  }
  
  snomedSearchTerm.value = ''
  snomedSearchResults.value = []
  
  openModalAddMapping.value = true
}

/**
 * Close add mapping modal
 */
function closeAddMapping() {
  openModalAddMapping.value = false
  currentMappingContext.value = null
}

/**
 * Search SNOMED (debounced)
 */
const searchSnomedDebounced = useDebounceFn(async () => {
  const term = snomedSearchTerm.value
  
  if (!term || term.length < 3) {
    snomedSearchResults.value = []
    return
  }

  searchingSnomed.value = true
  
  try {
    const semanticTags = []
    if (newMapping.value.concept_type === 'symptom' || newMapping.value.concept_type === 'finding') {
      semanticTags.push('finding', 'disorder')
    } else if (newMapping.value.concept_type === 'disorder') {
      semanticTags.push('disorder')
    } else if (newMapping.value.concept_type === 'procedure') {
      semanticTags.push('procedure')
    }
    
    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/snomed/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          term: term,
          semantic_tags: semanticTags,
          limit: 10
        })
      }
    )

    if (error.value) {
      console.error('Search error:', error.value)
      snomedSearchResults.value = []
    } else {
      snomedSearchResults.value = data.value?.data || []
    }
  } catch (err) {
    console.error('Exception during search:', err)
    snomedSearchResults.value = []
  } finally {
    searchingSnomed.value = false
  }
}, 500)

/**
 * Select SNOMED concept
 */
function selectSnomedConcept(result: any) {
  newMapping.value.snomed_concept_id = result.snomed_concept_id
  newMapping.value.snomed_term = result.snomed_term
  newMapping.value.snomed_fsn = result.snomed_fsn || ''
  
  snomedSearchResults.value = []
  snomedSearchTerm.value = result.snomed_term
}

/**
 * Confirm add mapping
 */
async function confirmAddMapping() {
  if (!currentMappingContext.value || !newMapping.value.snomed_concept_id || !selectedVisitData.value?.no_sep) {
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Data kunjungan tidak lengkap',
      color: 'red'
    })
    return
  }

  savingMapping.value = true

  try {
    const mapping = {
      no_sep: selectedVisitData.value.no_sep,
      no_rawat: currentMappingContext.value.soap.no_rawat,
      tgl_perawatan: currentMappingContext.value.soap.tgl_perawatan,
      jam_rawat: currentMappingContext.value.soap.jam_rawat,
      source_field: currentMappingContext.value.source_field,
      source_text: newMapping.value.source_text,
      snomed_concept_id: newMapping.value.snomed_concept_id,
      snomed_term: newMapping.value.snomed_term,
      snomed_fsn: newMapping.value.snomed_fsn,
      concept_type: newMapping.value.concept_type,
      confidence_score: null,
      mapped_by: 'manual'
    }

    // Save to database via API
    const response = await $fetch(`${config.public.API_V2_URL}/casemix/mapping/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mapping)
    })

    console.log('SOAP mapping save response:', response)

    if (response && response.success) {
      // Add to local state after successful database save
      codingForm.value.mappings.push(mapping)
      soapMappings.value.push(mapping)

      toast.add({
        icon: 'i-tabler-check',
        title: 'Mapping Ditambahkan',
        description: `"${mapping.source_text}" dipetakan ke ${mapping.snomed_term}`,
        color: 'green',
        timeout: 2000
      })

      closeAddMapping()
    } else {
      throw new Error(response?.message || 'Failed to save mapping')
    }
  } catch (error) {
    console.error('Error adding SOAP mapping:', error)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Gagal menyimpan mapping ke database',
      color: 'red'
    })
  } finally {
    savingMapping.value = false
  }
}

/**
 * Remove mapping
 */
function removeMapping(index: number) {
  codingForm.value.mappings.splice(index, index + 1)
  
  toast.add({
    icon: 'i-tabler-trash',
    title: 'Mapping Removed',
    color: 'orange',
    timeout: 2000
  })
}

/**
 * Use suggestion
 */
function useSuggestion(sugg: any) {
  const soap = codingDetail.value.pemeriksaan_ralan.find(s => 
    s[sugg.source_field] && s[sugg.source_field].includes(sugg.source_text)
  )

  if (!soap) return

  const mapping = {
    no_rawat: soap.no_rawat,
    tgl_perawatan: soap.tgl_perawatan,
    jam_rawat: soap.jam_rawat,
    source_field: sugg.source_field,
    source_text: sugg.source_text,
    snomed_concept_id: sugg.snomed_concept_id,
    snomed_term: sugg.suggested_term,
    snomed_fsn: '',
    concept_type: sugg.concept_type,
    confidence_score: 0.7,
    mapped_by: 'assisted'
  }

  codingForm.value.mappings.push(mapping)

  toast.add({
    icon: 'i-tabler-sparkles',
    title: 'Suggestion Applied',
    description: `"${mapping.source_text}" mapped to ${mapping.snomed_term}`,
    color: 'blue',
    timeout: 2000
  })
}

/**
 * Save coding
 */
async function saveCoding(status: string) {
  if (codingForm.value.mappings.length === 0) {
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Validation Error',
      description: 'Minimal harus ada 1 mapping',
      color: 'orange'
    })
    return
  }

  savingCoding.value = true

  try {
    // Use soapMappings if available, otherwise fall back to form mappings
    const mappingsToSave = soapMappings.value.length > 0 ? soapMappings.value : codingForm.value.mappings

    const payload = {
      no_sep: codingForm.value.no_sep,
      no_rawat: codingForm.value.no_rawat,
      mappings: mappingsToSave,
      catatan_koder: codingForm.value.catatan_koder,
      status: status
    }

    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/coding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (error.value) {
      toast.add({
        icon: 'i-tabler-circle-x',
        title: 'Error',
        description: 'Gagal menyimpan coding',
        color: 'red'
      })
    } else {
      toast.add({
        icon: 'i-tabler-circle-check',
        title: 'Success',
        description: `Coding berhasil disimpan dengan status: ${status}`,
        color: 'green'
      })
      
      closeModalCoding()
      fetchCodingQueue()
      
      if (status === 'final') {
        props.refresh()
      }
    }
  } catch (err) {
    console.error('Error saving coding:', err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Terjadi kesalahan saat menyimpan',
      color: 'red'
    })
  } finally {
    savingCoding.value = false
  }
}

/**
 * Close modal coding
 */
function closeModalCoding() {
  openModalCoding.value = false
  selectedCodingSep.value = ''
  codingDetail.value = null
  codingForm.value = {
    no_sep: '',
    no_rawat: '',
    mappings: [],
    catatan_koder: '',
    status: 'draft'
  }
}

// ========================================
// EXISTING FUNCTIONS (Tab Riwayat)
// ========================================

async function handleRowClick(row: any) {
  // Set selected visit data regardless of klaim status
  selectedVisitData.value = row
  selectedRowData.value = row
  sep.value = row.no_sep || ''
  noRawat.value = row.no_rawat || ''

  // Always fetch visit details and SNOMED data
  await fetchVisitDetails(row.no_sep)

  // Check klaim status and fetch ERM details if available
  const kemkesStatus = getKlaimStatus(row)


  if (kemkesStatus === 'sent' && sep.value) {
    await fetchErmDetails(sep.value)
  } else {
    // Clear ERM details if klaim not sent
    ermDetails.value = null
  }

  // Show info about klaim status if not sent
  if (kemkesStatus !== 'sent') {
    toast.add({
      icon: 'i-tabler-info-circle',
      title: 'Status Klaim',
      description: kemkesStatus ? `Status klaim: ${kemkesStatus}` : 'Status klaim tidak tersedia. Detail ERM hanya tersedia jika status klaim sudah "sent".',
      color: kemkesStatus === 'unsent' ? 'yellow' : 'orange',
      timeout: 4000
    })
  }
}

/**
 * Fetch visit details for inline display
 */
async function fetchVisitDetails(no_sep: string) {
  loadingVisitDetails.value = true
  visitDetails.value = null
  try {
    const { data: detailsData, error } = await useFetch(
      `${config.public.API_V2_URL}/erm/details/${no_sep}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if (error.value) {
      console.error("Error fetching visit details:", error.value)
      toast.add({
        icon: 'i-tabler-circle-x',
        title: 'Error',
        description: 'Gagal memuat detail kunjungan. Hubungi administrator.',
        color: 'red',
        timeout: 5000
      })
      visitDetails.value = null
    } else {
      visitDetails.value = detailsData.value?.data?.data || detailsData.value?.data
      // Load SNOMED suggestions and mappings
      await loadSNOMEDData(no_sep)
      console.log('About to call loadLabMappings...')
      // Load existing lab mappings
      await loadLabMappings()
      console.log('loadLabMappings completed')
      // Load procedure billing data
      await loadProcedureBilling()

      // Use existing obat data instead of fetching from separate API
      if (visitDetails.value?.obat && visitDetails.value.obat.length > 0) {
        resepObat.value = visitDetails.value.obat.map((obatItem: any) => ({
          no_resep: obatItem.no_rawat,
          tgl_peresepan: obatItem.tgl_perawatan,
          jam_peresepan: obatItem.jam,
          status: obatItem.status,
          dokter: visitDetails.value?.registrasi?.dokter?.nm_dokter || 'Dokter',
          detail: [{
            kode_brng: obatItem.kode_brng,
            jml: obatItem.jml,
            h_beli: obatItem.h_beli,
            total: obatItem.total,
            aturan: obatItem.aturan_pakai?.aturan || 'N/A',
            no_batch: obatItem.no_batch || '',
            obat: {
              nama_brng: obatItem.obat?.nama_brng || 'Unknown',
              kode_brng: obatItem.kode_brng,
              kode_sat: obatItem.obat?.kode_sat || 'N/A'
            }
          }]
        }))

        // Calculate summary
        const totalObatCount = resepObat.value.length
        const totalBiayaAmount = resepObat.value.reduce((sum: number, resep: any) =>
          sum + (resep.detail?.reduce((detailSum: number, detail: any) => detailSum + (detail.total || 0), 0) || 0), 0
        )

        resepSummary.value = {
          totalResep: totalObatCount,
          totalObat: totalObatCount,
          totalBiaya: totalBiayaAmount
        }

        console.log(`✅ Used existing obat data: ${resepSummary.value.totalResep} medications`)
      }

      console.log('Visit details loaded:', visitDetails.value)
      console.log('Resep obat processed:', resepObat.value)
    }

  } catch (err) {
    console.error("Exception fetching visit details:", err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Terjadi kesalahan saat memuat detail kunjungan.',
      color: 'red',
      timeout: 5000
    })
    visitDetails.value = null
  } finally {
    loadingVisitDetails.value = false
  }
}

/**
 * Load SNOMED suggestions and mappings
 */
async function loadSNOMEDData(no_sep: string) {
  try {
    // Load existing SNOMED mappings
    const { data: mappingData } = await useFetch(
      `${config.public.API_V2_URL}/casemix/visit/${no_sep}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if ((mappingData.value as any)?.data?.existing_coding?.clinical_notes_snomed) {
      soapMappings.value = (mappingData.value as any).data.existing_coding.clinical_notes_snomed
      console.log(`✅ Loaded ${soapMappings.value.length} SOAP mappings for SEP: ${no_sep}`)
    } else {
      soapMappings.value = []
    }

    // Load suggestions
    if ((mappingData.value as any)?.data?.suggestions) {
      snomedSuggestions.value = (mappingData.value as any).data.suggestions
    }
  } catch (err) {
    console.error("Error loading SNOMED data:", err)
  }
}

/**
 * Load existing lab mappings from rsia_mapping_lab
 */
async function loadLabMappings() {
  try {
    if (!visitDetails.value?.lab) return

    // Load template mappings from satu_sehat_mapping_lab
    try {
      const templateMappingsData = await $fetch(
        `${config.public.API_V2_URL}/test-mapping-templates`
      )

      const templateMappings = templateMappingsData?.data || []

      // Add template mappings to lab detail items
      visitDetails.value.lab.forEach((lab: any) => {
        if (lab.detail_periksa_lab) {
          lab.detail_periksa_lab.forEach((detail: any) => {
            if (detail.template?.id_template) {
              const templateMapping = templateMappings.find((m: any) =>
                m.id_template === detail.template.id_template
              )
              if (templateMapping) {
                detail.template.satu_sehat_mapping_lab = templateMapping
              }
            }
          })
        }
      })

    } catch (err) {
      console.error('Error loading template mappings:', err)
    }

    // Load procedure mappings from rsia_mapping_lab
    try {
      // Fetch existing mappings
      const mappingsData = await $fetch(
        `${config.public.API_V2_URL}/mapping-lab/system?system=snomed`
      )

      const existingMappings = mappingsData?.data || []

      // Add mappings to visitDetails data for display
      visitDetails.value.lab.forEach((lab: any) => {
        if (lab.jenis_perawatan?.kd_jenis_prw) {
          const mapping = existingMappings.find((m: any) =>
            m.kd_jenis_prw === lab.jenis_perawatan.kd_jenis_prw
          )
          if (mapping) {
            lab.jenis_perawatan.rsia_mapping_lab = mapping
          }
        }
      })

    } catch (err) {
      console.error('Error loading lab mappings:', err)
    }

  } catch (error) {
    console.error('Error in loadLabMappings:', error)
  }
}

/**
 * Get mapped count for SOAP item
 */
function getMappedCountForSOAP(soap: any): number {
  const normalizedSoapDate = normalizeDate(soap.tgl_perawatan)
  const normalizedSoapTime = normalizeTime(soap.jam_rawat)

  const count = soapMappings.value.filter(m => {
    const normalizedDbDate = normalizeDate(m.tgl_perawatan)
    const normalizedDbTime = normalizeTime(m.jam_rawat)

    // Exact match
    const exactMatch =
      m.no_rawat === soap.no_rawat &&
      normalizedDbDate === normalizedSoapDate &&
      normalizedDbTime === normalizedSoapTime

    // Fallback: match by no_rawat and date only (if time matching fails)
    const fallbackMatch =
      !exactMatch &&
      m.no_rawat === soap.no_rawat &&
      normalizedDbDate === normalizedSoapDate

    return exactMatch || fallbackMatch
  }).length

  return count
}

/**
 * Normalize date format for comparison
 */
function normalizeDate(date: string): string {
  if (!date) return ''

  try {
    // Handle ISO format with timezone: 2025-04-27T17:00:00.000000Z
    if (date.includes('T') && date.includes('Z')) {
      // Parse ISO date and convert to local timezone
      const isoDate = new Date(date)
      // Format to YYYY-MM-DD in local timezone
      const year = isoDate.getFullYear()
      const month = String(isoDate.getMonth() + 1).padStart(2, '0')
      const day = String(isoDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Handle regular datetime format: 2025-04-28 HH:MM:SS
    if (date.includes(' ')) {
      const dateOnly = date.split(' ')[0]
      return dateOnly
    }

    // Handle date only format: 2025-04-28
    return date
  } catch (error) {
    console.warn('Error normalizing date:', date, error)
    return date
  }
}

/**
 * Normalize time format for comparison
 */
function normalizeTime(time: string): string {
  if (!time) return ''

  // Ensure HH:MM:SS format
  if (time.length === 5) {
    return time + ':00'
  }
  if (time.length === 8) {
    return time
  }

  // If includes date part, extract time only
  const timeOnly = time.split(' ')[1] || time.split(' ')[0]
  return timeOnly.length === 5 ? timeOnly + ':00' : timeOnly
}

/**
 * Get SOAP mappings for specific field
 */
function getSOAPMappings(soap: any, field: string): any[] {
  const normalizedSoapDate = normalizeDate(soap.tgl_perawatan)
  const normalizedSoapTime = normalizeTime(soap.jam_rawat)

  const mappings = soapMappings.value.filter(m => {
    const normalizedDbDate = normalizeDate(m.tgl_perawatan)
    const normalizedDbTime = normalizeTime(m.jam_rawat)

    // Exact match
    const exactMatch =
      m.no_rawat === soap.no_rawat &&
      normalizedDbDate === normalizedSoapDate &&
      normalizedDbTime === normalizedSoapTime &&
      m.source_field === field

    // Fallback: match by no_rawat and field only (if time matching fails)
    const fallbackMatch =
      !exactMatch &&
      m.no_rawat === soap.no_rawat &&
      m.source_field === field &&
      normalizedDbDate === normalizedSoapDate

    return exactMatch || fallbackMatch
  })

  // Only log for penilaian field with mappings
  if (mappings.length > 0 && field === 'penilaian') {
    console.log(`✅ SOAP: Found ${mappings.length} mappings for ${field}:`, mappings.map(m => ({
      source: m.source_text,
      snomed: `${m.snomed_term} (${m.snomed_concept_id})`,
      match: m.source_field
    })))
  }

  return mappings
}

/**
 * Open add mapping modal for specific SOAP
 */
function openAddMappingForSOAP(soap: any, field: string) {
  currentMappingContext.value = {
    soap: soap,
    source_field: field,
    full_text: soap[field]
  }

  newMapping.value = {
    source_text: '',
    snomed_concept_id: null as number | null,
    snomed_term: '',
    snomed_fsn: '',
    concept_type: field === 'keluhan' ? 'symptom' :
                  field === 'pemeriksaan' ? 'finding' :
                  field === 'penilaian' ? 'disorder' :
                  field === 'rtl' ? 'procedure' : 'other'
  }

  snomedSearchTerm.value = ''
  snomedSearchResults.value = []

  openModalAddMapping.value = true
}

/**
 * Remove mapping from list
 */
function removeMappingFromList(mapping: any, index: number) {
  // Find and remove from soapMappings
  const mappingIndex = soapMappings.value.findIndex(m =>
    m.no_rawat === mapping.no_rawat &&
    m.tgl_perawatan === mapping.tgl_perawatan &&
    m.jam_rawat === mapping.jam_rawat &&
    m.source_field === mapping.source_field &&
    m.snomed_concept_id === mapping.snomed_concept_id
  )

  if (mappingIndex !== -1) {
    soapMappings.value.splice(mappingIndex, 1)
  }

  toast.add({
    icon: 'i-tabler-trash',
    title: 'Mapping Dihapus',
    color: 'orange',
    timeout: 2000
  })
}

/**
 * Use suggestion for SOAP
 */
function useSuggestionForSOAP(sugg: any) {
  const soap = visitDetails.value?.cppt_pemeriksaan_ralan.find((s: any) =>
    s[sugg.source_field] && s[sugg.source_field].includes(sugg.source_text)
  )

  if (!soap) return

  const mapping = {
    no_rawat: soap.no_rawat,
    tgl_perawatan: soap.tgl_perawatan,
    jam_rawat: soap.jam_rawat,
    source_field: sugg.source_field,
    source_text: sugg.source_text,
    snomed_concept_id: sugg.snomed_concept_id,
    snomed_term: sugg.suggested_term,
    snomed_fsn: '',
    concept_type: sugg.concept_type,
    confidence_score: 0.7,
    mapped_by: 'assisted'
  }

  soapMappings.value.push(mapping)

  toast.add({
    icon: 'i-tabler-sparkles',
    title: 'Saran Diterapkan',
    description: `"${mapping.source_text}" dipetakan ke ${mapping.snomed_term}`,
    color: 'blue',
    timeout: 2000
  })
}

/**
 * Toggle inline SNOMED search
 */
function toggleSNOMEDSearch() {
  showSNOMEDSearch.value = !showSNOMEDSearch.value
  if (!showSNOMEDSearch.value) {
    resetSNOMEDSearch()
  }
}

/**
 * Search SNOMED inline
 */
const searchSnomedInline = useDebounceFn(async () => {
  const term = snomedSearchInline.value

  if (!term || term.length < 3) {
    snomedSearchResultsInline.value = []
    return
  }

  searchingSnomedInline.value = true

  try {
    const semanticTags = []
    if (conceptTypeFilter.value === 'symptom' || conceptTypeFilter.value === 'finding') {
      semanticTags.push('finding', 'disorder')
    } else if (conceptTypeFilter.value === 'disorder') {
      semanticTags.push('disorder')
    } else if (conceptTypeFilter.value === 'procedure') {
      semanticTags.push('procedure')
    }

    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/snomed/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          term: term,
          semantic_tags: semanticTags,
          limit: 10
        })
      }
    )

    if (error.value) {
      console.error('Search error:', error.value)
      snomedSearchResultsInline.value = []
    } else {
      snomedSearchResultsInline.value = data.value?.data || []
    }
  } catch (err) {
    console.error('Exception during search:', err)
    snomedSearchResultsInline.value = []
  } finally {
    searchingSnomedInline.value = false
  }
}, 500)

/**
 * Select SNOMED concept inline
 */
function selectSnomedConceptInline(result: any) {
  selectedSNOMEDConcept.value = {
    snomed_concept_id: result.snomed_concept_id,
    snomed_term: result.snomed_term,
    snomed_fsn: result.snomed_fsn || ''
  }

  snomedSearchResultsInline.value = []
  snomedSearchInline.value = result.snomed_term
}

/**
 * Add SNOMED mapping inline
 */
async function addSNOMEDMappingInline() {
  if (!selectedSNOMEDConcept.value.snomed_concept_id || !textToMap.value) {
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Pilih konsep SNOMED dan masukkan teks yang akan dipetakan',
      color: 'orange'
    })
    return
  }

  try {
    const mapping = {
      no_rawat: selectedVisitData.value.no_rawat,
      tgl_perawatan: visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.tgl_perawatan || new Date().toISOString().split('T')[0],
      jam_rawat: visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.jam_rawat || new Date().toTimeString().split(' ')[0],
      source_field: 'general', // Could be improved with field selection
      source_text: textToMap.value,
      snomed_concept_id: selectedSNOMEDConcept.value.snomed_concept_id,
      snomed_term: selectedSNOMEDConcept.value.snomed_term,
      snomed_fsn: selectedSNOMEDConcept.value.snomed_fsn,
      concept_type: conceptTypeFilter.value,
      confidence_score: null,
      mapped_by: 'manual'
    }

    // Add to local mappings
    soapMappings.value.push(mapping)

    // Save to server
    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/coding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          no_sep: selectedVisitData.value.no_sep,
          no_rawat: selectedVisitData.value.no_rawat,
          mappings: [mapping],
          catatan_koder: '',
          status: 'draft'
        })
      }
    )

    if (error.value) {
      throw error.value
    }

    toast.add({
      icon: 'i-tabler-check',
      title: 'Mapping Berhasil Ditambahkan',
      description: `"${textToMap.value}" dipetakan ke ${selectedSNOMEDConcept.value.snomed_term}`,
      color: 'green',
      timeout: 2000
    })

    // Reset form
    resetSNOMEDSearch()

  } catch (err) {
    console.error('Error adding mapping:', err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Gagal menambahkan mapping. Silakan coba lagi.',
      color: 'red'
    })
  }
}

/**
 * Reset SNOMED search
 */
function resetSNOMEDSearch() {
  snomedSearchInline.value = ''
  snomedSearchResultsInline.value = []
  selectedSNOMEDConcept.value = {
    snomed_concept_id: null,
    snomed_term: '',
    snomed_fsn: ''
  }
  textToMap.value = ''
  conceptTypeFilter.value = 'finding'
}

// ========================================
// LAB MAPPING FUNCTIONS
// ========================================

/**
 * Toggle LOINC/SNOMED search for lab
 */
function toggleLOINCSearch() {
  // Fungsi ini akan menggunakan SNOMED search yang sudah ada
  showSNOMEDSearch.value = !showSNOMEDSearch.value
}

/**
 * Get lab mapping for specific lab item (only one per kd_jenis_prw)
 */
function getLabMapping(labItem: any): any | null {
  // First check for rsia_mapping_lab data (primary lab mapping)
  if (labItem.jenis_perawatan?.rsia_mapping_lab) {
    return labItem.jenis_perawatan.rsia_mapping_lab
  }

  // Fall back to soap mappings (individual clinical note mappings)
  return soapMappings.value.find(m =>
    m.no_rawat === labItem.no_rawat &&
    m.source_field === 'laboratorium' &&
    m.source_text === labItem.jenis_perawatan?.nm_perawatan
  ) || null
}

/**
 * Open lab mapping modal
 */
function openAddLabMapping(labItem: any) {
  console.log('Opening lab mapping for:', labItem) // Debug log
  console.log('kd_jenis_prw:', labItem.jenis_perawatan?.kd_jenis_prw) // Debug log

  currentLabContext.value = labItem

  // Pre-populate with existing mapping data
  const existingMapping = labItem.jenis_perawatan?.rsia_mapping_lab

  labMapping.value = {
    code: existingMapping?.code || '',
    system: existingMapping?.system || 'snomed',
    display: existingMapping?.display || ''
  }

  labSearchTerm.value = existingMapping?.display || ''
  labSearchResults.value = []

  openModalLabMapping.value = true
}

/**
 * Open lab mapping modal for detail template
 */
function openAddLabMappingDetail(labItem: any, template: any) {
  currentLabContext.value = {
    ...labItem,
    template: template
  }

  // Pre-populate with existing mapping data
  const existingMapping = template.rsia_mapping_lab || labItem.jenis_perawatan?.rsia_mapping_lab

  labMapping.value = {
    code: existingMapping?.code || '',
    system: existingMapping?.system || 'snomed',
    display: existingMapping?.display || ''
  }

  labSearchTerm.value = existingMapping?.display || ''
  labSearchResults.value = []

  openModalLabMapping.value = true
}

/**
 * Close lab mapping modal
 */
function closeLabMapping() {
  openModalLabMapping.value = false
  currentLabContext.value = null
}

/**
 * Search SNOMED for lab (debounced)
 */
const searchLabSnomedDebounced = useDebounceFn(async () => {
  const term = labSearchTerm.value

  if (!term || term.length < 3 || labMapping.value.system !== 'snomed') {
    labSearchResults.value = []
    return
  }

  searchingLabSnomed.value = true

  try {
    // Focus on lab-related semantic tags
    const semanticTags = ['finding', 'procedure', 'substance', 'specimen', 'disorder']

    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/snomed/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          term: term,
          semantic_tags: semanticTags,
          limit: 10
        })
      }
    )

    if (error.value) {
      console.error('Search error:', error.value)
      labSearchResults.value = []
    } else {
      labSearchResults.value = data.value?.data || []
    }
  } catch (err) {
    console.error('Exception during search:', err)
    labSearchResults.value = []
  } finally {
    searchingLabSnomed.value = false
  }
}, 500)

/**
 * Select SNOMED concept for lab
 */
function selectLabSnomedConcept(result: any) {
  labMapping.value.code = result.snomed_concept_id.toString()
  labMapping.value.display = result.snomed_term

  labSearchResults.value = []
  labSearchTerm.value = result.snomed_term
}

/**
 * Confirm lab mapping
 */
async function confirmLabMapping() {
  if (!currentLabContext.value || !labMapping.value.code || !labMapping.value.system || !labMapping.value.display) {
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Semua field wajib diisi',
      color: 'red'
    })
    return
  }

  savingLabMapping.value = true

  try {
    const mapping = {
      no_rawat: currentLabContext.value.no_rawat,
      tgl_perawatan: currentLabContext.value.tgl_periksa,
      jam_rawat: currentLabContext.value.jam,
      source_field: 'laboratorium',
      source_text: currentLabContext.value.jenis_perawatan?.nm_perawatan || 'Pemeriksaan Lab',
      snomed_concept_id: parseInt(labMapping.value.code),
      snomed_term: labMapping.value.display,
      snomed_fsn: labMapping.value.display,
      concept_type: 'finding',
      confidence_score: null,
      mapped_by: 'manual'
    }

    // Remove existing mapping for this jenis perawatan (ensure only one)
    soapMappings.value = soapMappings.value.filter(m =>
      !(m.no_rawat === currentLabContext.value.no_rawat &&
        m.source_field === 'laboratorium' &&
        m.source_text === currentLabContext.value.jenis_perawatan?.nm_perawatan)
    )

    // Add new mapping
    soapMappings.value.push(mapping)

    // Save to server
    await saveLabMapping(mapping)

    // Update UI state
    if (currentLabContext.value?.jenis_perawatan) {
      currentLabContext.value.jenis_perawatan.rsia_mapping_lab = {
        kd_jenis_prw: currentLabContext.value.jenis_perawatan.kd_jenis_prw,
        code: labMapping.value.code,
        system: labMapping.value.system,
        display: labMapping.value.display
      }
    }

    toast.add({
      icon: 'i-tabler-check',
      title: 'Lab Mapping Berhasil',
      description: `"${currentLabContext.value.jenis_perawatan?.nm_perawatan}" dipetakan ke ${labMapping.value.display}`,
      color: 'green',
      timeout: 2000
    })

    closeLabMapping()
  } catch (err) {
    console.error('Error confirming lab mapping:', err)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Gagal menyimpan mapping',
      color: 'red'
    })
  } finally {
    savingLabMapping.value = false
  }
}

/**
 * Save lab mapping to server
 */
async function saveLabMapping(mapping: any) {
  try {
    // Validasi kd_jenis_prw
    const kdJenisPrw = currentLabContext.value?.jenis_perawatan?.kd_jenis_prw
    if (!kdJenisPrw) {
      console.error('kd_jenis_prw is missing:', currentLabContext.value)
      throw new Error('Kode jenis perawatan tidak ditemukan')
    }

    // Simpan ke rsia_mapping_lab
    const labMappingData = {
      kd_jenis_prw: kdJenisPrw,
      code: labMapping.value.code || mapping.snomed_concept_id?.toString(),
      system: labMapping.value.system || 'snomed',
      display: labMapping.value.display || mapping.snomed_term
    }

    console.log('Lab mapping data to save:', labMappingData)

    // Cek apakah mapping sudah ada
    if (labMappingData.kd_jenis_prw) {
      try {
        // Check existing mapping
        const existingMapping = await $fetch(
          `${config.public.API_V2_URL}/mapping-lab/${labMappingData.kd_jenis_prw}`,
          {
            headers: {
              'Authorization': `Bearer ${tokenStore.accessToken}`
            }
          }
        )

        // Update existing mapping - don't send kd_jenis_prw in body for PUT
        const updateData = {
          code: labMappingData.code,
          system: labMappingData.system,
          display: labMappingData.display
        }

        await $fetch(
          `${config.public.API_V2_URL}/mapping-lab/${labMappingData.kd_jenis_prw}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${tokenStore.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: updateData
          }
        )
        console.log('Lab mapping updated successfully')
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // Create new mapping if not found
          try {
            console.log('Creating new mapping with data:', labMappingData)
            console.log('Stringified data:', JSON.stringify(labMappingData))

            await $fetch(
              `${config.public.API_V2_URL}/mapping-lab`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${tokenStore.accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: labMappingData
              }
            )
            console.log('Lab mapping created successfully')
          } catch (createError: any) {
            console.error('Error creating lab mapping:', createError?.data || createError)
            throw createError
          }
        } else {
          console.error('Error checking/updating lab mapping:', error?.data || error)
          throw error
        }
      }
    }

    // Juga simpan ke casemix/coding untuk konsistensi
    try {
      await $fetch(
        `${config.public.API_V2_URL}/casemix/coding`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenStore.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: {
            no_sep: selectedVisitData.value?.no_sep,
            no_rawat: selectedVisitData.value?.no_rawat,
            mappings: [mapping],
            catatan_koder: '',
            status: 'draft'
          }
        }
      )
      console.log('Lab mapping saved to casemix successfully')

      toast.add({
        icon: 'i-tabler-check',
        title: 'Success',
        description: 'Mapping tersimpan di rsia_mapping_lab dan casemix',
        color: 'green',
        timeout: 2000
      })
    } catch (casemixError: any) {
      console.error('Error saving lab mapping to casemix:', casemixError?.data || casemixError)
      toast.add({
        icon: 'i-tabler-alert-circle',
        title: 'Warning',
        description: 'Mapping tersimpan di rsia_mapping_lab, gagal sync ke casemix',
        color: 'yellow'
      })
    }
  } catch (err) {
    console.error('Error saving lab mapping:', err)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Gagal menyimpan mapping',
      color: 'red'
    })
  }
}

/**
 * Remove lab mapping
 */
async function removeLabMapping(mapping: any, index: number) {
  try {
    // Find and remove from soapMappings
    const mappingIndex = soapMappings.value.findIndex(m =>
      m.no_rawat === mapping.no_rawat &&
      m.tgl_perawatan === mapping.tgl_perawatan &&
      m.jam_rawat === mapping.jam_rawat &&
      m.source_field === mapping.source_field &&
      m.snomed_concept_id === mapping.snomed_concept_id
    )

    if (mappingIndex !== -1) {
      soapMappings.value.splice(mappingIndex, 1)
    }

    // Hapus dari rsia_mapping_lab jika ada kd_jenis_prw
    const currentLabItem = visitDetails.value?.lab?.find((lab: any) =>
      lab.no_rawat === mapping.no_rawat &&
      (lab.template?.Pemeriksaan === mapping.source_text || lab.jenis_perawatan?.nm_perawatan === mapping.source_text)
    )

    if (currentLabItem?.jenis_perawatan?.kd_jenis_prw) {
      const { error: deleteError } = await useFetch(
        `${config.public.API_V2_URL}/mapping-lab/${currentLabItem.jenis_perawatan.kd_jenis_prw}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokenStore.accessToken}`
          }
        }
      )

      if (deleteError.value) {
        console.error('Error deleting lab mapping:', deleteError.value)
        toast.add({
          icon: 'i-tabler-alert-circle',
          title: 'Warning',
          description: 'Mapping dihapus secara lokal, gagal hapus dari server',
          color: 'yellow'
        })
      } else {
        toast.add({
          icon: 'i-tabler-check',
          title: 'Lab Mapping Dihapus',
          description: 'Mapping berhasil dihapus dari rsia_mapping_lab',
          color: 'green',
          timeout: 2000
        })
      }
    } else {
      toast.add({
        icon: 'i-tabler-trash',
        title: 'Lab Mapping Dihapus',
        color: 'orange',
        timeout: 2000
      })
    }
  } catch (err) {
    console.error('Error removing lab mapping:', err)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Gagal menghapus mapping',
      color: 'red'
    })
  }
}

/**
 * Get klaim status for badge
 */
function getKlaimStatusBadge(row: any): string {
  const status = getKlaimStatus(row)
  switch (status) {
    case 'sent': return 'Sent'
    case 'unsent': return 'Belum Sent'
    case 'pending': return 'Pending'
    default: return 'Tidak Tersedia'
  }
}

/**
 * Get klaim status color
 */
function getKlaimStatusColor(row: any): string {
  const status = getKlaimStatus(row)
  switch (status) {
    case 'sent': return 'green'
    case 'unsent': return 'yellow'
    case 'pending': return 'orange'
    default: return 'gray'
  }
}

/**
 * Get klaim status
 */
const klaimStatusMap = reactive<Record<string, string>>({})

function getKlaimStatus(row: any): string {
  const sep = row.no_sep

  // If we've already processed this SEP, return cached result
  if (klaimStatusMap[sep]) {
    return klaimStatusMap[sep]
  }

  // Process status and cache it (client-side only)
  if (import.meta.client && row?.rsia_klaim_idrg?.send_klaim_res) {
    try {
      const sendKlaimRes = row.rsia_klaim_idrg.send_klaim_res
      const parsed = JSON.parse(sendKlaimRes)
      const status = parsed.response?.data?.[0]?.kemkes_dc_status || 'unsent'
      klaimStatusMap[sep] = status
      return status
    } catch {
      klaimStatusMap[sep] = 'unsent'
      return 'unsent'
    }
  }

  return 'unsent'
}

async function fetchErmDetails(no_sep: string) {
  isLoadingDetails.value = true
  ermDetails.value = null
  try {
    const { data: detailsData, error } = await useFetch(
      `${config.public.API_V2_URL}/erm/details/${no_sep}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if (error.value) {
      console.error("Error fetching ERM details:", error.value)
      // Show user-friendly error message
      toast.add({
        icon: 'i-tabler-circle-x',
        title: 'Error',
        description: 'Gagal memuat detail ERM. Hubungi administrator.',
        color: 'red',
        timeout: 5000
      })
      ermDetails.value = null
    } else {
      ermDetails.value = detailsData.value as any
      console.log('Detail ERM:', ermDetails.value)
    }

  } catch (err) {
    console.error("Exception fetching ERM details:", err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Terjadi kesalahan saat memuat detail ERM.',
      color: 'red',
      timeout: 5000
    })
    ermDetails.value = null
  } finally {
    isLoadingDetails.value = false
  }
}

// fetchResepObat function removed - using existing visitDetails.obat data instead

// Parse dosage instruction (e.g., "3x1" -> {frequency: 3, period: 1})
function parseDosageInstruction(aturan: string) {
  try {
    // Default values
    const defaultResult = { frequency: 1, period: 1 }

    if (!aturan || typeof aturan !== 'string') {
      return defaultResult
    }

    // Parse patterns like "3x1", "2x1", "1x2", etc.
    const match = aturan.match(/(\d+)x(\d+)/i)
    if (match && match.length >= 3) {
      return {
        frequency: parseInt(match[1]) || 1,  // First number (e.g., "3" in "3x1")
        period: parseInt(match[2]) || 1      // Second number (e.g., "1" in "3x1")
      }
    }

    // If no match, return default
    return defaultResult
  } catch (error) {
    console.warn('Error parsing dosage instruction:', aturan, error)
    return { frequency: 1, period: 1 }
  }
}

const generateAccordionItems = (fullResponseDetails: any) => {
  // 1. Ekstrak bagian 'data' dari respons
  const details = fullResponseDetails?.data;
  console.log('Generating accordion items using extracted details:', details); // Log data yang diekstrak

  // 2. Lakukan pengecekan pada 'details' yang sudah diekstrak
  if (!details) return [];

  const items = [];
  // Gunakan 'details' (yang sudah berisi { registrasi: ..., diagnosa: ... })
  if (details.diagnosa && details.diagnosa.length > 0) {
    items.push({
      label: 'Diagnosa',
      icon: 'i-tabler-stethoscope',
      defaultOpen: true,
      slot: 'diagnosa'
    });
  }
  if (details.prosedur && details.prosedur.length > 0) {
    items.push({
      label: 'Prosedur',
      icon: 'i-tabler-activity-heartbeat',
      slot: 'prosedur'
    });
  }
  if (details.obat && details.obat.length > 0) {
    items.push({ label: 'Obat', icon: 'i-tabler-pill', slot: 'obat' });
  }
  if (details.lab && details.lab.length > 0) {
    items.push({ label: 'Laboratorium', icon: 'i-tabler-flask', slot: 'lab' });
  }
  if (details.radiologi && details.radiologi.length > 0) {
    items.push({ label: 'Radiologi', icon: 'i-tabler-radioactive', slot: 'radiologi' });
  }
  if ((details.cppt_pemeriksaan && details.cppt_pemeriksaan.length > 0) || (details.cppt_catatan && details.cppt_catatan.length > 0) ) {
    items.push({ label: 'CPPT', icon: 'i-tabler-notes', slot: 'cppt' });
  }

  console.log('Generated accordion items:', items); // Log hasil akhir
  return items;
}
// ------------------------------------
// Helper function to parse send_klaim_res and get kemkes_dc_status
const getKemkesStatus = (sendKlaimResString: string | null | undefined): string | null => {
  if (!sendKlaimResString) {
    return null; // Return null if the string is empty or undefined
  }
  try {
    const parsedRes = JSON.parse(sendKlaimResString);
    // Safely access the nested property
    const status = parsedRes?.response?.data?.[0]?.kemkes_dc_status;
    return status || null; // Return the status or null if not found
  } catch (e) {
    console.error("Error parsing send_klaim_res JSON:", e);
    return null; // Return null if JSON parsing fails
  }
};


// Opsional: Fungsi untuk mengecek nilai abnormal (contoh sederhana)
// Anda mungkin perlu logika yang lebih kompleks tergantung format nilai_rujukan
const isNilaiAbnormal = (nilai: string, rujukan: string): boolean => {
    try {
        const numericNilai = parseFloat(nilai.replace(',', '.')); // Handle koma desimal
        if (isNaN(numericNilai)) return false; // Bukan angka

        // Coba parse rujukan (contoh: "10 - 20" atau "< 10" atau "> 20")
        if (rujukan.includes('-')) {
            const [min, max] = rujukan.split('-').map(s => parseFloat(s.trim().replace(',', '.')));
            if (!isNaN(min) && !isNaN(max)) {
                return numericNilai < min || numericNilai > max;
            }
        } else if (rujukan.startsWith('<')) {
            const max = parseFloat(rujukan.substring(1).trim().replace(',', '.'));
             if (!isNaN(max)) {
                return numericNilai >= max;
            }
        } else if (rujukan.startsWith('>')) {
             const min = parseFloat(rujukan.substring(1).trim().replace(',', '.'));
             if (!isNaN(min)) {
                return numericNilai <= min;
            }
        }
        return false; // Tidak bisa menentukan
    } catch {
        return false; // Error parsing
    }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '' || value === 'NaN') {
    return 'Rp 0'
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue) || !isFinite(numValue)) {
    return 'Rp 0'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue)
}

function formatDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// ========================================
// BILLING METHODS
// ========================================
async function loadProcedureBilling() {
  console.log('loadProcedureBilling called, selectedVisitData:', selectedVisitData.value)
  if (!selectedVisitData.value?.no_rawat) {
    console.log('No no_rawat found in selectedVisitData')
    return
  }

  console.log('Loading billing data for no_rawat:', selectedVisitData.value.no_rawat)
  loadingBilling.value = true
  try {
    // Test with known working API first
    const testResponse = await $fetch(`${config.public.API_V2_URL}/erm/details/${selectedVisitData.value.no_sep}`, {
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    console.log('Test API response:', testResponse)

    // Load procedure billing data using full Laravel URL
    const laravelBillingUrl = `${config.public.API_V2_URL}/procedure-billing?no_rawat=${selectedVisitData.value.no_rawat}`
    console.log('Fetching billing from:', laravelBillingUrl)

    const billingResponse = await $fetch(laravelBillingUrl, {
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Billing data response:', billingResponse)
    procedureBilling.value = billingResponse.data || []
    console.log('Procedure billing set to:', procedureBilling.value)

    // Load summary data
    const summaryResponse = await $fetch(`${config.public.API_V2_URL}/procedure-billing/summary?no_rawat=${selectedVisitData.value.no_rawat}`, {
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Summary response:', summaryResponse)
    billingSummary.value = summaryResponse.data || {
      total_procedures: 0,
      total_biaya: 0,
      by_jenis_petugas: [],
      by_status_rawat: [],
      by_status_bayar: []
    }

    // Load top procedures
    const topProceduresResponse = await $fetch(`${config.public.API_V2_URL}/procedure-billing/top-procedures?no_rawat=${selectedVisitData.value.no_rawat}&limit=5`, {
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    topProcedures.value = topProceduresResponse.data || []

  } catch (error) {
    console.error('Error loading procedure billing:', error)
    toast.add({
      title: 'Error',
      description: 'Gagal memuat data tarif & tindakan',
      color: 'red'
    })
  } finally {
    loadingBilling.value = false
  }
}

// ========================================
// PROCEDURE MAPPING METHODS
// ========================================

function openProcedureMappingModal(procedure: any, existingMapping?: any) {
  currentProcedure.value = procedure

  // If editing existing mapping, populate with existing data
  if (existingMapping && existingMapping.snomed) {
    procedureMapping.value = {
      kd_jenis_prw: procedure.kd_jenis_prw,
      code: existingMapping.snomed.code || '',
      system: existingMapping.snomed.system || 'http://snomed.info/sct',
      display: existingMapping.snomed.display || '',
      description: existingMapping.snomed.description || '',
      status: existingMapping.status || 'active',
      notes: existingMapping.notes || ''
    }
  } else {
    // Create new mapping
    procedureMapping.value = {
      kd_jenis_prw: procedure.kd_jenis_prw,
      code: '',
      system: 'http://snomed.info/sct',
      display: '',
      description: '',
      status: 'active',
      notes: ''
    }
  }

  // Don't auto-fill or auto-trigger search to let user start with empty form
  procedureSearchTerm.value = ''
  procedureSearchResults.value = []
  showProcedureMappingModal.value = true
}

const searchProcedureSnomed = useDebounceFn(async () => {
  const term = procedureSearchTerm.value

  if (!term || term.length < 2 || procedureMapping.value.system !== 'http://snomed.info/sct') {
    procedureSearchResults.value = []
    return
  }

  searchingProcedureSnomed.value = true

  try {
    // Use the same SNOMED API as lab search but with procedure-related semantic tags
    const semanticTags = ['procedure', 'event', 'act', 'observable-entity', 'substance', 'specimen']

    const { data, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/snomed/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          term: term,
          semantic_tags: semanticTags,
          limit: 10
        })
      }
    )

    if (error.value) {
      console.error('SNOMED search error:', error.value)
      procedureSearchResults.value = []
      toast.add({
        title: 'Error',
        description: 'Gagal mencari SNOMED CT codes',
        color: 'red'
      })
    } else {
      // Transform API response to match expected format
      const results = data.value?.data || []
      procedureSearchResults.value = results.map((item: any) => ({
        code: item.snomed_concept_id?.toString() || item.concept_id?.toString() || item.code,
        display: item.snomed_term || item.term || item.display,
        description: item.snomed_fsn || item.fsn || item.description
      }))
    }
  } catch (err) {
    console.error('Exception during SNOMED search:', err)
    procedureSearchResults.value = []
    toast.add({
      title: 'Error',
      description: 'Gagal mencari SNOMED CT codes',
      color: 'red'
    })
  } finally {
    searchingProcedureSnomed.value = false
  }
}, 500)

function selectProcedureSnomed(result: any) {
  procedureMapping.value.code = result.code
  procedureMapping.value.display = result.display
  procedureMapping.value.description = result.description || ''
  procedureSearchTerm.value = `${result.code} - ${result.display}`
  procedureSearchResults.value = []
}

async function saveProcedureMapping() {
  if (!procedureMapping.value.code || !procedureMapping.value.display) {
    toast.add({
      title: 'Error',
      description: 'Kode SNOMED dan Display Name wajib diisi',
      color: 'red'
    })
    return
  }

  savingProcedureMapping.value = true
  try {
    // Check if this is an update (existing mapping) or create
    // First, try to get existing mapping to determine if we should use PUT or POST
    let isUpdate = false

    try {
      const existingResponse = await $fetch(`${config.public.API_V2_URL}/procedure-mapping/${procedureMapping.value.kd_jenis_prw}`, {
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      isUpdate = !!existingResponse.data
    } catch (error) {
      // 404 means no existing mapping, so we'll create a new one
      isUpdate = false
    }

    const method = isUpdate ? 'PUT' : 'POST'
    const url = isUpdate
      ? `${config.public.API_V2_URL}/procedure-mapping/${procedureMapping.value.kd_jenis_prw}`
      : `${config.public.API_V2_URL}/procedure-mapping`

    console.log(`Procedure mapping: ${method} to ${url}`)

    const response = await $fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(procedureMapping.value)
    })

    console.log('Procedure mapping save response:', response)

    // If we get here (no error thrown), the save was successful
    toast.add({
      title: 'Success',
      description: `SNOMED mapping berhasil ${isUpdate ? 'diperbarui' : 'disimpan'}`,
      color: 'green'
    })
    showProcedureMappingModal.value = false

    // Refresh procedure billing to show updated mapping
    if (selectedVisitData.value?.no_rawat) {
      await loadProcedureBilling()
    }
  } catch (error) {
    console.error('Error saving procedure mapping:', error)
    toast.add({
      title: 'Error',
      description: 'Gagal menyimpan SNOMED mapping',
      color: 'red'
    })
  } finally {
    savingProcedureMapping.value = false
  }
}

// Load procedure mapping data for billing display
async function loadProcedureMappings() {
  if (!procedureBilling.value || procedureBilling.value.length === 0) return

  try {
    const kdJenisPrws = procedureBilling.value.map((p: any) => p.kd_jenis_prw)

    // Get existing mappings
    const mappingPromises = kdJenisPrws.map(async (kdJenisPrw: string) => {
      try {
        const response = await $fetch(`${config.public.API_V2_URL}/procedure-mapping/${kdJenisPrw}`, {
          headers: {
            'Authorization': `Bearer ${tokenStore.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        return { kdJenisPrw, mapping: response.data }
      } catch (error: any) {
        // Handle 404 errors (mapping not found) and other errors gracefully
        console.log(`No mapping found for procedure ${kdJenisPrw}:`, error?.data?.message || error?.message || 'Not found')
        return { kdJenisPrw, mapping: null }
      }
    })

    const mappings = await Promise.all(mappingPromises)

    // Merge mapping data into procedure billing
    procedureBilling.value = procedureBilling.value.map((procedure: any) => {
      const mappingData = mappings.find(m => m.kdJenisPrw === procedure.kd_jenis_prw)
      return {
        ...procedure,
        snomed_mapping: mappingData?.mapping || null
      }
    })

  } catch (error) {
    console.error('Error loading procedure mappings:', error)
  }
}

// Update loadProcedureBilling to also load mappings
const originalLoadProcedureBilling = loadProcedureBilling
async function loadProcedureBillingWithMappings() {
  await originalLoadProcedureBilling()
  await loadProcedureMappings()
}

// Replace the original function reference
loadProcedureBilling = loadProcedureBillingWithMappings

// ========================================
// BPJS SUBMISSION METHODS
// ========================================

async function sendToBpjs() {
  if (!selectedVisitData.value?.no_sep || !selectedVisitData.value?.no_rawat) {
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Data kunjungan tidak lengkap',
      color: 'red'
    })
    bpjsSubmissionStatus.value = 'error'
    setTimeout(() => { bpjsSubmissionStatus.value = 'idle' }, 3000)
    return
  }

  sendingToBpjs.value = true
  bpjsSubmissionStatus.value = 'sending'

  try {
    // 1. Ensure visit details are loaded before generating FHIR Bundle
    if (!visitDetails.value || !visitDetails.value.pasien) {
      toast.add({
        icon: 'i-tabler-loader-2',
        title: 'Loading',
        description: 'Memuat data pasien...',
        color: 'blue'
      })
      await fetchVisitDetails(selectedVisitData.value.no_sep)
    }

    // 2. Generate BPJS Bundle using our successful structure
    console.log('🚀 Generating BPJS Bundle with proven structure...')

    // Use our successful bundle generation function
    let medicalRecordBundle

    // Check if we have real patient data, otherwise use test data
    if (!selectedVisitData.value && !visitDetails.value) {
      console.log('⚠️ No patient data available, using test bundle...')
      medicalRecordBundle = await window.testBPJSBundle()
      toast.add({
        icon: 'i-tabler-info-circle',
        title: 'Info',
        description: 'Menggunakan data test (pasien belum dipilih)',
        color: 'blue',
        timeout: 3000
      })
    } else {
      console.log('✅ Patient data available, generating real bundle...')
      medicalRecordBundle = await generateBPJSMedicalRecordBundle()
    }

    // Validate bundle before sending
    if (!medicalRecordBundle) {
      toast.add({
        icon: 'i-tabler-alert-triangle',
        title: 'Error',
        description: 'Gagal generate BPJS Bundle',
        color: 'red',
        timeout: 3000
      })
      return
    }

    // Log bundle details
    console.log('✅ BPJS Bundle generated successfully!')
    console.log('Bundle ID:', medicalRecordBundle.id)
    console.log('SEP Number:', medicalRecordBundle.identifier?.value || 'N/A')
    console.log('Total Entries:', medicalRecordBundle.entry?.length || 0)
    console.log('Bundle size:', JSON.stringify(medicalRecordBundle).length, 'characters')

    // Show bundle generation success
    toast.add({
      icon: 'i-tabler-check',
      title: 'Bundle Generated',
      description: `FHIR Bundle dengan ${medicalRecordBundle.entry?.length || 0} entries siap dikirim`,
      color: 'green',
      timeout: 2000
    })

    // 3. Prepare BPJS request - Send bundle directly (like successful sendBPJSBundle)
    console.log('🚀 Sending FHIR Bundle directly to BPJS API...')
    console.log('Medical Record Bundle ID:', medicalRecordBundle.id)
    console.log('Medical Record Bundle type:', medicalRecordBundle?.resourceType)
    console.log('Medical Record Bundle entries count:', medicalRecordBundle?.entry?.length)
    console.log('Resource types:', medicalRecordBundle?.entry?.map(e => e.resource?.resourceType)?.join(', ') || 'N/A')
    console.log('SEP Number:', medicalRecordBundle.identifier?.value || 'N/A')

    // Show bundle structure that will be sent
    console.log('=== Bundle to be sent ===')
    console.log(JSON.stringify(medicalRecordBundle, null, 2))
    console.log('=== End Bundle ===')

    // Fix telecom field to prevent BPJS 412 error - be less aggressive
    if (medicalRecordBundle && medicalRecordBundle.entry) {
      medicalRecordBundle.entry.forEach((entry: any) => {
        if (entry.resource?.resourceType === 'Patient' && Array.isArray(entry.resource.telecom)) {
          // Keep valid phone numbers, remove empty/invalid ones
          entry.resource.telecom = entry.resource.telecom.filter((tel: any) =>
            tel.value && tel.value !== '080000000000' && tel.value.trim() !== ''
          )
          console.log('🔧 Fixed Patient telecom - keeping valid numbers:', entry.resource.telecom)
        }
        if (entry.resource?.resourceType === 'Practitioner' && Array.isArray(entry.resource.telecom)) {
          // Keep valid phone numbers, remove empty/invalid ones
          entry.resource.telecom = entry.resource.telecom.filter((tel: any) =>
            tel.value && tel.value !== '080000000000' && tel.value.trim() !== ''
          )
          console.log('🔧 Fixed Practitioner telecom - keeping valid numbers:', entry.resource.telecom)
        }
      })
    }

  // 4. Debug bundle structure before sending to identify BPJS 412 issues
    console.log('🔍 Analyzing bundle for BPJS validation...')

    // Check required fields that commonly cause "Object reference not set" errors
    const bundleValidation = {
      hasIdentifier: !!medicalRecordBundle.identifier,
      hasIdentifierValue: !!medicalRecordBundle.identifier?.value,
      hasEntries: Array.isArray(medicalRecordBundle.entry) && medicalRecordBundle.entry.length > 0,
      entryCount: medicalRecordBundle.entry?.length || 0,
      resourceTypes: medicalRecordBundle.entry?.map(e => e.resource?.resourceType) || []
    }

    console.log('Bundle validation:', bundleValidation)

    // Check each resource for common missing fields
    medicalRecordBundle.entry?.forEach((entry: any, index: number) => {
      const resource = entry.resource
      console.log(`Resource ${index} (${resource.resourceType}):`, {
        hasId: !!resource.id,
        hasSubject: !!resource.subject,
        hasStatus: !!resource.status,
        hasCode: !!resource.code,
        missingFields: []
      })
    })

    // 5. Send to BPJS API with proper wrapper payload
    const currentDate = new Date()
    const payload = {
      request: {
        noSep: selectedVisitData.value.no_sep,
        jnsPelayanan: (selectedVisitData.value?.jnspelayanan === 'Ralan' || selectedVisitData.value?.jnspelayanan === '2' || visitDetails.value?.reg_periksa?.jnspelayanan === 'Ralan' || visitDetails.value?.reg_periksa?.jnspelayanan === '2' || visitDetails.value?.sep?.jnsPelayanan === '2') ? '2' : '1', // 1=Rawat Inap, 2=Rawat Jalan
        bulan: String(currentDate.getMonth() + 1).padStart(2, '0'),
        tahun: String(currentDate.getFullYear()),
        dataMR: medicalRecordBundle  // Send Medical Record Bundle to BPJS
      }
    }

    console.log('📡 Sending payload to BPJS API:', JSON.stringify(payload, null, 2))

    const response = await $fetch(`${config.public.API_V2_URL}/bpjs/rekammedis/insert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log('BPJS Response:', response)

    if (response && response.message) {
      // Check BPJS response for actual status
      const bpjsMetadata = response.bpjs_response?.metadata;
      const isActuallySuccess = bpjsMetadata?.code === '200';

      if (isActuallySuccess || bpjsMetadata?.message === 'Data Tidak Ditemukan') {
        // Show different message for testing vs success
        const description = bpjsMetadata?.message === 'Data Tidak Ditemukan'
          ? 'Data berhasil dikirim ke BPJS (SEP testing)'
          : 'Data berhasil dikirim ke BPJS';

        toast.add({
          icon: 'i-tabler-check',
          title: 'Berhasil',
          description,
          color: 'green'
        })
        bpjsSubmissionStatus.value = 'success'
      } else {
        // Show warning if BPJS returned error
        toast.add({
          icon: 'i-tabler-alert-triangle',
          title: 'Warning',
          description: `BPJS Response: ${bpjsMetadata?.message || 'Unknown error'}`,
          color: 'orange'
        })
        bpjsSubmissionStatus.value = 'error'
      }
      // Reset status after 3 seconds
      setTimeout(() => { bpjsSubmissionStatus.value = 'idle' }, 3000)
    } else {
      throw new Error('Invalid response from BPJS API')
    }

  } catch (error) {
    console.error('Error sending to BPJS:', error)
    toast.add({
      icon: 'i-tabler-alert-circle',
      title: 'Error',
      description: 'Gagal mengirim data ke BPJS',
      color: 'red'
    })
    bpjsSubmissionStatus.value = 'error'
    // Reset status after 3 seconds
    setTimeout(() => { bpjsSubmissionStatus.value = 'idle' }, 3000)
  } finally {
    sendingToBpjs.value = false
  }
}

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}


// Load hospital setting from backend
async function loadHospitalSetting() {
  try {
    const tokenStore = useAccessTokenStore()
    const response = await $fetch(`${config.public.API_V2_URL}/bpjs/setting-info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    return response.controller_properties
  } catch (error) {
    console.error('Error loading hospital setting:', error)
    // Fallback to default values
    return {
      nama_instansi: 'RSIA Aisyiyah Pekajangan',
      kode_faskes_bpjs: '0166R001',
      kode_kemenkes: '3326051'
    }
  }
}

// Load patient data with address relations
async function loadPatientDataWithAddress(no_rkm_medis: string) {
  try {
    const response = await $fetch(`/api/v1/pasien/${no_rkm_medis}/address-relations`)
    return response.data || {}
  } catch (error) {
    console.error('Error loading patient address data:', error)
    return {}
  }
}


// Generate FHIR Bundle from ERM data - Based on bundle-lengkap.json reference
async function generateFhirBundle() {
  // Check if data is available
  if (!selectedVisitData.value && !visitDetails.value) {
    console.error('❌ No patient data available - selectedVisitData and visitDetails are both null')
    console.log('Please ensure patient data is loaded before generating FHIR Bundle')
    return null
  }

  console.log('📋 Available data sources:')
  console.log('- selectedVisitData.value exists:', !!selectedVisitData.value)
  console.log('- visitDetails.value exists:', !!visitDetails.value)

  // The patient data is in visitDetails.value.registrasi structure
  const patientData = visitDetails.value?.registrasi?.pasien || visitDetails.value?.pasien
  const regPeriksaData = visitDetails.value?.registrasi || visitDetails.value?.reg_periksa

  const data = {
    ...selectedVisitData.value,
    ...regPeriksaData,
    ...patientData,
    // Handle missing fields with fallbacks
    no_peserta: selectedVisitData.value?.no_kartu || regPeriksaData?.no_peserta || patientData?.no_peserta || ''
  }

  // Load hospital setting dynamically
  const hospitalSetting = await loadHospitalSetting()
  console.log('Hospital setting loaded:', hospitalSetting)

  const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
  const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
  const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'
  // Get jnspelayanan from SEP data (bridging_sep table)
  const jnsPelayananFromSEP = visitDetails.value?.sep?.jnsPelayanan
  const jnsPelayananFromReg = data.jnspelayanan || selectedVisitData.value?.jnspelayanan

  let jnsPelayanan = '1' // Default

  // Priority 1: Use from SEP data if available
  if (jnsPelayananFromSEP) {
    jnsPelayanan = jnsPelayananFromSEP
  }
  // Priority 2: Use directly if already '2' or '1', or map from text
  else if (jnsPelayananFromReg === '2' || jnsPelayananFromReg === '1') {
    jnsPelayanan = jnsPelayananFromReg
  }
  // Priority 3: Map from registration data ('Ralan' -> '2', 'Ranap' -> '1')
  else if (jnsPelayananFromReg === 'Ralan') {
    jnsPelayanan = '2'
  } else if (jnsPelayananFromReg === 'Ranap') {
    jnsPelayanan = '1'
  }

  console.log('🏥 JnsPelayanan logic:', {
    'sep.jnsPelayanan': visitDetails.value?.sep?.jnsPelayanan,
    'data.jnspelayanan': data.jnspelayanan,
    'selectedVisit.jnspelayanan': selectedVisitData.value?.jnspelayanan,
    'final_jnsPelayanan': jnsPelayanan
  })

  // Extract poli name for organization
  // Mapping kode poli ke nama poli
  const poliMapping: { [key: string]: string } = {
    'IGDK': 'Instalasi Gawat Darurat',
    'IGD': 'Instalasi Gawat Darurat',
    'RI': 'Radiologi',
    'RAD': 'Radiologi',
    'LAB': 'Laboratorium',
    'INT': 'Penyakit Dalam',
    'OBG': 'Obstetri dan Ginekologi',
    'ANO': 'Anak',
    'BED': 'Bedah',
    'MAT': 'Maternal',
    'PAR': 'Paru',
    'JAN': 'Jantung',
    'SAR': 'Saraf',
    'KUL': 'Kulit dan Kelamin',
    'THT': 'Telinga Hidung Tenggorokan',
    'MATA': 'Mata',
    'GIGI': 'Gigi dan Mulut',
    'ORTH': 'Ortopedi',
    'PSI': 'Psikiatri',
    'REH': 'Rehabilitasi Medik',
    'UMU': 'Poli Umum',
    'VK': 'Poli Vaksin',
    'KIA': 'Kesehatan Ibu dan Anak',
    'GIZI': 'Gizi',
    'FISIO': 'Fisioterapi'
  }

  const kdPoli = data.kd_poli || visitDetails.value?.reg_periksa?.kd_poli || ''
  const poliNameFromMapping = kdPoli ? (poliMapping[kdPoli] || '') : ''
  const poliName = visitDetails.value.poli?.nm_poli ||
                  data.nm_poli ||
                  poliNameFromMapping ||
                  ''
  const organizationName = poliName ? `${poliName} - ${namaRumahSakit}` : namaRumahSakit

  console.log('🏥 generateFhirBundle - Organization Name:', organizationName)

  console.log('Using hospital data:', {
    kodeFaskesBpjs,
    kodeKemenkes,
    namaRumahSakit,
    alamat: hospitalSetting.alamat_instansi,
    kabupaten: hospitalSetting.kabupaten,
    kontak: hospitalSetting.kontak
  })

  // Generate consistent IDs for all resources
  const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
  const conditionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
  const practitionerId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
  const organizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
  const encounterId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
  const compositionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

  const bundleId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

  // Bundle structure based on bundle-lengkap.json reference
  const bundle = {
    "resourceType": "Bundle",
    "id": bundleId,
    "meta": {
      "lastUpdated": formatBpjsDateTimeLegacy(new Date())
    },
    "identifier": {
      "system": "sep",  // Simple system string like bundle-lengkap.json
      "value": data.no_sep || 'SEP001'
    },
    "type": "document",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "id": patientId,
          "identifier": [{
            "use": "official",
            "type": {
              "coding": [{
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "MB"
              }]
            },
            "value": data.no_peserta || '',
            "assigner": {
              "display": "BPJS KESEHATAN"
            }
          }],
          "active": true,
          "name": [{
            "use": "official",
            "text": data.nm_pasien || data.nama_pasien || 'Unknown Patient'
          }],
          "telecom": [{
            "system": "phone",
            "value": data.no_hp || data.no_tlp || '',
            "use": "mobile"
          }],
          "gender": data.jk === 'L' ? 'male' : 'female',
          "birthDate": data.tgl_lahir ? formatBpjsDateTimeLegacy(new Date(data.tgl_lahir)) : null,
          "deceasedBoolean": false,
          "address": [{
            "use": "home",
            "type": "both",
            "text": data.alamat || 'Alamat Pasien',
            "line": [data.alamat || 'Alamat Pasien'],
            "city": data.nm_kab || data.kabupatenpj || data.kabupaten || 'Kabupaten',
            "district": data.nm_kec || data.kecamatanpj || data.kecamatan || 'Kecamatan',
            "state": data.nm_prop || data.propinsipj || data.propinsi || 'Provinsi',
            "postalCode": data.kd_pos || '00000'
          }],
          "maritalStatus": {
            "coding": [{
              "system": "http://hl7.org/fhir/v3/MaritalStatus",
              "code": data.stts_nikah === 'M' ? 'M' : 'U'
            }]
          },
          "managingOrganization": {
            "other": `Organization/${organizationId}`,
            "type": namaRumahSakit
          }
        }
      },
      {
        "resource": {
          "resourceType": "Condition",
          "id": conditionId,
          "category": [{
            "coding": [{
              "system": "http://hl7.org/fhir/condition-category",
              "code": "encounter-diagnosis",
              "display": "Encounter Diagnosis"
            }]
          }],
          "code": {
            "coding": [{
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": data.kd_penyakit || 'Z00.0',
              "display": data.diagnosa || data.penyakit || 'Diagnosis'
            }],
            "text": data.diagnosa || data.penyakit || 'Diagnosis'
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "noSep": data.no_sep
          },
          "onsetDateTime": data.tgl_registrasi ? new Date(data.tgl_registrasi).toISOString() : new Date().toISOString(),
          "clinicalStatus": "active",
          "verificationStatus": "confirmed"
        }
      },
      {
        "resource": {
          "resourceType": "Practitioner",
          "id": practitionerId,
          "identifier": [{
            "use": "official",
            "type": {
              "coding": [],
              "text": null
            },
            "system": "urn:oid:nomor_sip",
            "value": data.no_ijin_praktek || data.no_sip || '33724.57131/DS/01/449.1/0600/12/2019',
            "assigner": {
              "display": null
            }
          }, {
            "use": "official",
            "type": {
              "coding": [{
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "NNIDN",
                "display": null
              }],
              "text": "NIK"
            },
            "system": null,
            "value": data.no_nik_dokter || '3372017004700003',
            "assigner": {
              "display": "KEMENDAGRI"
            }
          }],
          "name": [{
            "use": "official",
            "text": data.dpjp || 'Dokter'
          }],
          "telecom": [
            {
              "system": "phone",
              "value": data.no_telp || data.telp_dokter || '0281-432123',
              "use": "work"
            },
            {
              "system": "email",
              "value": data.email_dokter || data.dokter?.email || '-',
              "use": "work"
            },
            {
              "system": "fax",
              "value": data.fax_dokter || data.dokter?.fax || '-',
              "use": "work"
            }
          ],
          "address": [{
            "use": "home",
            "text": data.alamat_dokter || 'Jl. Pekajangan No. 123',
            "line": [data.alamat_dokter || 'Jl. Pekajangan No. 123'],
            "city": "Kabupaten Pekalongan",
            "district": "Kecamatan Kedungwuni",
            "state": "Provinsi Jawa Tengah",
            "postalCode": "51161",
            "country": "Indonesia"
          }],
          "gender": data.jk_dokter === 'L' ? 'male' : 'female',
          "birthDate": data.tgl_lahir_dokter || null
        }
      },
      {
        "resource": {
          "resourceType": "Organization",
          "id": organizationId,
          "identifier": [{
            "use": "official",
            "system": "urn:oid:bpjs",
            "value": kodeFaskesBpjs
          }, {
            "use": "official",
            "system": "urn:oid:kemkes",
            "value": kodeKemenkes
          }],
          "type": [{
            "coding": [{
              "system": "http://hl7.org/fhir/organization-type",
              "code": "prov",
              "display": "Healthcare Provider"
            }]
          }],
          "name": organizationName,
          "alias": [namaRumahSakit],
          "telecom": [{
            "system": "phone",
            "value": hospitalSetting.kontak || '0281-432123',
            "use": "work"
          }],
          "address": [{
            "use": "work",
            "text": hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123',
            "line": [hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123'],
            "city": hospitalSetting.kabupaten || 'Kabupaten Pekalongan',
            "state": hospitalSetting.propinsi || 'Provinsi Jawa Tengah',
            "postalCode": hospitalSetting.kode_pos || '51161',
            "country": "IDN"
          }],
          "contact": [{
            "purpose": {
              "coding": [{
                "system": "http://hl7.org/fhir/contactentity-type",
                "code": "PATINF"
              }]
            },
            "telecom": [{
              "system": "phone",
              "value": hospitalSetting.kontak || '0281-432123'
            }]
          }]
        }
      },
      {
        "resource": {
          "resourceType": "Encounter",
          "id": encounterId,
          "text": {
            "status": "generated",
            "div": `<div xmlns="http://www.w3.org/1999/xhtml">Admitted to ${namaRumahSakit} between ${data.tgl_registrasi || new Date().toISOString()} and ${new Date().toISOString()}</div>`
          },
          "identifier": [{
            "system": "http://api.bpjs-kesehatan.go.id:8080/Vclaim-rest/SEP/",
            "value": data.no_sep
          }],
          "status": "finished",
          "class": {
            "system": "http://hl7.org/fhir/v3/ActCode",
            "code": (data.jnspelayanan === 'Ralan' || data.jnspelayanan === '2' || data.jnspelayanan === 2) ? 'AMB' : 'IMP',
            "display": (data.jnspelayanan === 'Ralan' || data.jnspelayanan === '2' || data.jnspelayanan === 2) ? 'ambulatory' : 'inpatient encounter'
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "display": data.nm_pasien || data.nama_pasien || 'Unknown Patient',
            "noSep": data.no_sep
          },
          "period": {
            "start": data.tgl_registrasi ? formatBpjsDateTime(new Date(data.tgl_registrasi)) : formatBpjsDateTime(new Date()),
            "end": formatBpjsDateTime(new Date())
          },
          "diagnosis": [{
            "condition": {
              "reference": `Condition/${conditionId}`,
              "role": {
                "coding": [{
                  "system": "http://hl7.org/fhir/diagnosis-role",
                  "code": "DD",
                  "display": "Discharge Diagnosis"
                }]
              },
              "rank": 1
            }
          }],
          "hospitalization": {
            "dischargeDisposition": [{
              "coding": [{
                "system": "http://hl7.org/fhir/discharge-disposition",
                "code": "home",
                "display": "Home"
              }]
            }]
          },
          "reasonCode": {
            "coding": [{
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": data.kd_penyakit || 'Z00.0',
              "display": "ICD 10"
            }],
            "text": data.diagnosa || data.penyakit || 'General examination'
          },
          "reason": [{
            "text": data.diagnosa || data.penyakit || 'General examination'
          }],
          "incomingReferral": [{
            "identifier": [{
              "system": "nomor_rujukan_bpjs",
              "value": data.no_rujukan || ''
            }, {
              "system": "nomor_rujukan_internal_rs",
              "value": data.no_rawat || ''
            }]
          }]
        }
      },
      {
        "resource": {
          "resourceType": "Composition",
          "id": compositionId,
          "status": "final",
          "type": {
            "coding": [{
              "system": "http://loinc.org",
              "code": "81218-0"
            }],
            "text": "Discharge Summary"
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "display": data.nm_pasien || data.nama_pasien || 'Unknown Patient',
            "noSep": data.no_sep
          },
          "encounter": {
            "reference": `Encounter/${encounterId}`
          },
          "date": formatBpjsDateTime(new Date()),
          "author": [{
            "reference": `Practitioner/${practitionerId}`,
            "display": data.dpjp || 'Dokter'
          }],
          "title": "Discharge Summary",
          "confidentiality": "N",
          "section": {
            "0": {
              "title": "Reason for admission",
              "code": {
                "coding": [{
                  "system": "http://loinc.org",
                  "code": "29299-5",
                  "display": "Reason for visit Narrative"
                }]
              },
              "text": {
                "status": "additional",
                "div": `<div xmlns="http://www.w3.org/1999/xhtml">${data.keluhan || 'Tidak ada keluhan khusus'}</div>`
              },
              "entry": [{
                "reference": `Encounter/${encounterId}`
              }]
            },
            "1": {
              "title": "Admission diagnosis",
              "code": {
                "coding": [{
                  "system": "http://loinc.org",
                  "code": "42347-5",
                  "display": "Admission diagnosis Narrative"
                }]
              },
              "text": {
                "status": "additional",
                "div": `<div xmlns="http://www.w3.org/1999/xhtml">${data.diagnosa || data.penyakit || 'Tidak ada diagnosa'}</div>`
              },
              "entry": [{
                "reference": `Condition/${conditionId}`
              }]
            }
          }
        }
      }
    ]
  }

  // Debug: Comprehensive validation before returning
  console.log('=== BPJS Bundle Validation ===')

  // Validate required fields
  const requiredFields = {
    'Bundle ID': bundleId,
    'SEP Number': data.no_sep,
    'Patient Name': data.nm_pasien || data.nama_pasien,
    'Patient RM Number': data.no_rkm_medis,
    'BPJS Number': data.no_peserta,
    'Service Type': jnsPelayanan,
    'Hospital Code': kodeFaskesBpjs,
    'Kemenkes Code': kodeKemenkes
  }

  console.log('Required fields validation:')
  Object.entries(requiredFields).forEach(([field, value]) => {
    const isValid = value && value !== '' && value !== null && value !== undefined
    console.log(`${field}: ${isValid ? '✅' : '❌'} = ${value}`)
  })

  // Check for null/undefined critical fields in bundle structure
  const bundleValidation = {
    'Bundle type': bundle.resourceType,
    'Bundle entries count': bundle.entry?.length,
    'Patient resource': bundle.entry[0]?.resource?.resourceType,
    'Patient ID': bundle.entry[0]?.resource?.id,
    'Patient name': bundle.entry[0]?.resource?.name?.[0]?.text,
    'Patient gender': bundle.entry[0]?.resource?.gender,
    'Condition resource': bundle.entry[1]?.resource?.resourceType,
    'Condition code': bundle.entry[1]?.resource?.code?.coding?.[0]?.code,
    'Encounter resource': bundle.entry[4]?.resource?.resourceType,
    'Encounter status': bundle.entry[4]?.resource?.status,
    'Composition resource': bundle.entry[5]?.resource?.resourceType,
    'Composition title': bundle.entry[5]?.resource?.title
  }

  console.log('Bundle structure validation:')
  Object.entries(bundleValidation).forEach(([field, value]) => {
    const isValid = value !== null && value !== undefined
    console.log(`${field}: ${isValid ? '✅' : '❌'} = ${value}`)
  })

  // Check for arrays that might be empty when BPJS expects at least one element
  const arrayValidation = {
    'Patient identifiers': bundle.entry[0]?.resource?.identifier?.length,
    'Patient name': bundle.entry[0]?.resource?.name?.length,
    'Patient telecom': bundle.entry[0]?.resource?.telecom?.length,
    'Patient address': bundle.entry[0]?.resource?.address?.length,
    'Condition category': bundle.entry[1]?.resource?.category?.length,
    'Condition code coding': bundle.entry[1]?.resource?.code?.coding?.length,
    'Practitioner identifier': bundle.entry[2]?.resource?.identifier?.length,
    'Organization identifier': bundle.entry[3]?.resource?.identifier?.length,
    'Encounter diagnosis': bundle.entry[4]?.resource?.diagnosis?.length
  }

  console.log('Array length validation:')
  Object.entries(arrayValidation).forEach(([field, length]) => {
    const isValid = length > 0
    console.log(`${field}: ${isValid ? '✅' : '❌'} = ${length} items`)
  })

  // Check for specific fields that commonly cause "Object reference not set"
  const criticalValidation = {
    'Bundle identifier system': bundle.identifier?.system,
    'Bundle identifier value': bundle.identifier?.value,
    'Patient managingOrganization': bundle.entry[0]?.resource?.managingOrganization?.reference,
    'Condition subject reference': bundle.entry[1]?.resource?.subject?.reference,
    'Condition subject noSep': bundle.entry[1]?.resource?.subject?.noSep,
    'Encounter subject reference': bundle.entry[4]?.resource?.subject?.reference,
    'Encounter subject noSep': bundle.entry[4]?.resource?.subject?.noSep,
    'Encounter class system': bundle.entry[4]?.resource?.class?.system,
    'Encounter class code': bundle.entry[4]?.resource?.class?.code,
    'Composition subject reference': bundle.entry[5]?.resource?.subject?.reference,
    'Composition subject noSep': bundle.entry[5]?.resource?.subject?.noSep,
    'Composition encounter reference': bundle.entry[5]?.resource?.encounter?.reference,
    'Composition section 0': bundle.entry[5]?.resource?.section?.['0'],
    'Composition section 1': bundle.entry[5]?.resource?.section?.['1']
  }

  console.log('Critical fields validation:')
  Object.entries(criticalValidation).forEach(([field, value]) => {
    const isValid = value !== null && value !== undefined && value !== ''
    console.log(`${field}: ${isValid ? '✅' : '❌'} = ${value}`)
  })

  console.log('=== End Validation ===')

  return bundle
}

// Test function with hardcoded safe data for debugging
async function generateTestBundle() {
  const hospitalSetting = await loadHospitalSetting()
  const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
  const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
  const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'

  // Generate organization name (for test function, use generic unit name)
  const organizationName = `${namaRumahSakit}`

  // Generate IDs
  const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const conditionId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const practitionerId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const organizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const encounterId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const compositionId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`
  const bundleId = `${kodeFaskesBpjs}-${kodeKemenkes}-2-${generateUUID()}`

  // Hardcoded safe data
  const testBundle = {
    "resourceType": "Bundle",
    "id": bundleId,
    "meta": {
      "lastUpdated": "2025-11-15 10:00:00"
    },
    "identifier": {
      "system": "sep",
      "value": "0166R0011125V000001"
    },
    "type": "document",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "id": patientId,
          "identifier": [{
            "use": "official",
            "type": {
              "coding": [{
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "MB"
              }]
            },
            "value": "0001234567890",
            "assigner": {
              "display": "BPJS KESEHATAN"
            }
          }],
          "active": true,
          "name": [{
            "use": "official",
            "text": "TEST PATIENT"
          }],
          "telecom": [{
            "system": "phone",
            "value": "08123456789",
            "use": "mobile"
          }],
          "gender": "male",
          "birthDate": "1990-01-01",
          "deceasedBoolean": false,
          "address": [{
            "use": "home",
            "type": "both",
            "text": "Jl. Test Address No. 123",
            "line": ["Jl. Test Address No. 123"],
            "city": "Kota Test",
            "district": "Kecamatan Test",
            "state": "Provinsi Test",
            "postalCode": "12345"
          }],
          "maritalStatus": {
            "coding": [{
              "system": "http://hl7.org/fhir/v3/MaritalStatus",
              "code": "M"
            }]
          },
          "managingOrganization": {
            "other": `Organization/${organizationId}`,
            "type": namaRumahSakit
          }
        }
      },
      {
        "resource": {
          "resourceType": "Condition",
          "id": conditionId,
          "category": [{
            "coding": [{
              "system": "http://hl7.org/fhir/condition-category",
              "code": "encounter-diagnosis",
              "display": "Encounter Diagnosis"
            }]
          }],
          "code": {
            "coding": [{
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": "Z00.0",
              "display": "Encounter for general adult medical examination"
            }],
            "text": "General examination"
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "noSep": "0166R0011125V000001"
          },
          "onsetDateTime": "2025-11-15T09:00:00",
          "clinicalStatus": "active",
          "verificationStatus": "confirmed"
        }
      },
      {
        "resource": {
          "resourceType": "Practitioner",
          "id": practitionerId,
          "identifier": [{
            "use": "official",
            "type": {
              "coding": [{
                "system": "urn:oid:nomor_sip"
              }]
            },
            "value": "1234567890"
          }, {
            "use": "official",
            "type": {
              "coding": [{
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "NNIDN"
              }]
            },
            "value": "1234567890123456",
            "assigner": {
              "display": "KEMDAGRI"
            }
          }],
          "name": [{
            "use": "official",
            "text": "DR. TEST DOKTER"
          }],
          "telecom": [
            {
              "system": "phone",
              "value": "0221234567",
              "use": "work"
            },
            {
              "system": "email",
              "value": "test.dokter@hospital.com",
              "use": "work"
            },
            {
              "system": "fax",
              "value": "-",
              "use": "work"
            }
          ],
          "gender": "male",
          "birthDate": "1980-01-01"
        }
      },
      {
        "resource": {
          "resourceType": "Organization",
          "id": organizationId,
          "identifier": [{
            "use": "official",
            "system": "urn:oid:bpjs",
            "value": kodeFaskesBpjs
          }, {
            "use": "official",
            "system": "urn:oid:kemkes",
            "value": kodeKemenkes
          }],
          "type": [{
            "coding": [{
              "system": "http://hl7.org/fhir/organization-type",
              "code": "prov",
              "display": "Healthcare Provider"
            }]
          }],
          "name": organizationName,
          "alias": [namaRumahSakit],
          "telecom": [{
            "system": "phone",
            "value": "0281-432123",
            "use": "work"
          }],
          "address": [{
            "use": "work",
            "text": "Jl. Pekajangan No. 123",
            "line": ["Jl. Pekajangan No. 123"],
            "city": "Kabupaten Pekalongan",
            "state": "Provinsi Jawa Tengah",
            "postalCode": "51161",
            "country": "IDN"
          }],
          "contact": [{
            "purpose": {
              "coding": [{
                "system": "http://hl7.org/fhir/contactentity-type",
                "code": "PATINF"
              }]
            },
            "telecom": [{
              "system": "phone",
              "value": "0281-432123"
            }]
          }]
        }
      },
      {
        "resource": {
          "resourceType": "Encounter",
          "id": encounterId,
          "text": {
            "status": "generated",
            "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">Admitted to RSIA AISYIYAH PEKAJANGAN between 2025-11-15 09:00 and 2025-11-15 10:00</div>"
          },
          "identifier": [{
            "system": "http://api.bpjs-kesehatan.go.id:8080/Vclaim-rest/SEP/",
            "value": "0166R0011125V000001"
          }],
          "status": "finished",
          "class": {
            "system": "http://hl7.org/fhir/v3/ActCode",
            "code": "AMB",
            "display": "ambulatory"
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "display": "TEST PATIENT",
            "noSep": "0166R0011125V000001"
          },
          "period": {
            "start": "2025-11-15T09:00:00",
            "end": "2025-11-15T10:00:00"
          },
          "diagnosis": [{
            "condition": {
              "reference": `Condition/${conditionId}`,
              "role": {
                "coding": [{
                  "system": "http://hl7.org/fhir/diagnosis-role",
                  "code": "DD",
                  "display": "Discharge Diagnosis"
                }]
              },
              "rank": 1
            }
          }],
          "hospitalization": {
            "dischargeDisposition": [{
              "coding": [{
                "system": "http://hl7.org/fhir/discharge-disposition",
                "code": "home",
                "display": "Home"
              }]
            }]
          },
          "reason": [{
            "coding": [{
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": "Z00.0",
              "display": "ICD 10"
            }],
            "text": "General examination"
          }],
          "incomingReferral": [{
            "identifier": [{
              "system": "nomor_rujukan_bpjs",
              "value": "0166R0011125V000001"
            }, {
              "system": "nomor_rujukan_internal_rs",
              "value": "2025/11/15/1234"
            }]
          }]
        }
      },
      {
        "resource": {
          "resourceType": "Composition",
          "id": compositionId,
          "status": "final",
          "type": {
            "coding": [{
              "system": "http://loinc.org",
              "code": "81218-0"
            }],
            "text": "Discharge Summary"
          },
          "subject": {
            "reference": `Patient/${patientId}`,
            "display": "TEST PATIENT",
            "noSep": "0166R0011125V000001"
          },
          "encounter": {
            "reference": `Encounter/${encounterId}`
          },
          "date": "2025-11-15 10:00:00",
          "author": [{
            "reference": `Practitioner/${practitionerId}`,
            "display": "DR. TEST DOKTER"
          }],
          "title": "Discharge Summary",
          "confidentiality": "N",
          "section": {
            "0": {
              "title": "Reason for admission",
              "code": {
                "coding": [{
                  "system": "http://loinc.org",
                  "code": "29299-5",
                  "display": "Reason for visit Narrative"
                }]
              },
              "text": {
                "status": "additional",
                "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">General medical checkup</div>"
              },
              "entry": [{
                "reference": `Encounter/${encounterId}`
              }]
            },
            "1": {
              "title": "Admission diagnosis",
              "code": {
                "coding": [{
                  "system": "http://loinc.org",
                  "code": "42347-5",
                  "display": "Admission diagnosis Narrative"
                }]
              },
              "text": {
                "status": "additional",
                "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">General examination - no specific diagnosis</div>"
              },
              "entry": [{
                "reference": `Condition/${conditionId}`
              }]
            }
          }
        }
      }
    ]
  }

  console.log('=== TEST BUNDLE (Hardcoded Safe Data) ===')
  console.log('Test bundle generated with safe hardcoded data')
  console.log('Bundle entries:', testBundle.entry.length)
  console.log('=== End Test Bundle ===')

  return testBundle
}

// Global test functions - add safely when window is available
onMounted(() => {
  // Set global functions for debugging
  window.testBPJSBundle = async function() {
    try {
      console.log('Testing BPJS Bundle with hardcoded safe data...')
      const testBundle = await generateTestBundle()
      console.log('Test bundle generated successfully')
      console.log('Bundle structure:', JSON.stringify(testBundle, null, 2))
      return testBundle
    } catch (error) {
      console.error('Error generating test bundle:', error)
      return null
    }
  }

  window.validateCurrentData = async function() {
    try {
      console.log('=== Current Data Validation ===')
      console.log('selectedVisitData.value:', JSON.stringify(selectedVisitData.value, null, 2))
      console.log('visitDetails.value:', JSON.stringify(visitDetails.value, null, 2))
      console.log('=== End Validation ===')
    } catch (error) {
      console.error('Error validating current data:', error)
    }
  }

  console.log('🔧 Debug functions available:')
  console.log('- await testBPJSBundle() // Test with hardcoded safe data')
  console.log('- await validateCurrentData() // Validate current patient data')

  // Additional function to test with real patient data when available
  window.testRealPatientBundle = async function() {
    try {
      console.log('Testing BPJS Bundle with real patient data...')

      // First check data availability
      console.log('=== Current Data Validation ===')
      console.log('selectedVisitData.value:', JSON.stringify(selectedVisitData.value, null, 2))
      console.log('visitDetails.value:', JSON.stringify(visitDetails.value, null, 2))
      console.log('=== End Validation ===')

      if (!selectedVisitData.value && !visitDetails.value) {
        console.log('❌ No real patient data available. Please select a patient first.')
        console.log('💡 You need to:')
        console.log('1. Select a patient from the patient list')
        console.log('2. Ensure patient data is loaded')
        console.log('3. Then try again')
        return null
      }

      const realBundle = await generateBPJSMedicalRecordBundle()
      if (realBundle) {
        console.log('✅ Real patient bundle generated successfully')
        console.log('Bundle structure:', JSON.stringify(realBundle, null, 2))
      } else {
        console.log('❌ Failed to generate real patient bundle')
      }

      return realBundle
    } catch (error) {
      console.error('Error generating real patient bundle:', error)
      return null
    }
  }

  console.log('- await testRealPatientBundle() // Test with real patient data (if available)')

  // Safe test function - minimal data access
  window.testMinimalBundle = async function() {
    try {
      console.log('=== MINIMAL TEST BUNDLE ===')
      console.log('Testing with minimal hardcoded data...')

      // Simple hardcoded bundle without accessing any reactive data
      const minimalBundle = {
        resourceType: "Bundle",
        id: "test-bundle-id",
        type: "document",
        entry: [{
          resource: {
            resourceType: "Patient",
            id: "test-patient-id",
            name: [{ text: "TEST PATIENT" }]
          }
        }]
      }

      console.log('✅ Minimal bundle created successfully')
      console.log('Bundle:', JSON.stringify(minimalBundle, null, 2))
      return minimalBundle
    } catch (error) {
      console.error('❌ Error in minimal test:', error)
      return null
    }
  }

  console.log('- await testMinimalBundle() // Test minimal bundle without data dependencies')

  // Function to send bundle to BPJS API
  window.sendBPJSBundle = async function(bundle?: any) {
    try {
      if (!bundle) {
        console.log('No bundle provided, generating test bundle...')
        bundle = await testBPJSBundle()
      }

      // Fix telecom field to prevent BPJS 412 error
      if (bundle && bundle.entry) {
        bundle.entry.forEach((entry: any) => {
          if (entry.resource?.resourceType === 'Patient' && Array.isArray(entry.resource.telecom)) {
            // Keep only mobile telecom to prevent BPJS validation errors
            entry.resource.telecom = entry.resource.telecom.filter((tel: any) => tel.use === 'mobile')
            console.log('🔧 Fixed Patient telecom - keeping only mobile:', entry.resource.telecom)
          }
          if (entry.resource?.resourceType === 'Practitioner' && Array.isArray(entry.resource.telecom)) {
            // Keep only work telecom for practitioner
            entry.resource.telecom = entry.resource.telecom.filter((tel: any) => tel.use === 'work')
            console.log('🔧 Fixed Practitioner telecom - keeping only work:', entry.resource.telecom)
          }
        })
      }

      if (!bundle) {
        console.error('❌ Failed to generate or obtain bundle')
        return null
      }

      console.log('🚀 Sending FHIR Bundle to BPJS API...')
      console.log('Bundle ID:', bundle.id)
      console.log('SEP Number:', bundle.identifier.value)
      console.log('Total Entries:', bundle.entry.length)

      // Show bundle structure that will be sent
      console.log('=== Bundle to be sent ===')
      console.log(JSON.stringify(bundle, null, 2))
      console.log('=== End Bundle ===')

      // TODO: Replace with actual BPJS API endpoint
      // For now, simulate the API call
      const bpjsEndpoint = 'https://api.bpjs-kesehatan.go.id/fhir-r4/v2/Bundle' // Example endpoint

      console.log('📡 API Endpoint:', bpjsEndpoint)

      // Simulate API call (replace with actual $fetch when ready)
      const mockResponse = {
        message: "Data rekam medis berhasil dikirim ke BPJS",
        success: true,
        metadata: {
          no_sep: bundle.identifier.value,
          jenis_pelayanan: "2",
          bulan: "11",
          tahun: "2025",
          rumah_sakit: {
            nama_instansi: "RSIA AISYIYAH PEKAJANGAN",
            kode_faskes_bpjs: "0166R001",
            kode_kemenkes: "3326051"
          }
        },
        bpjs_response: {
          metadata: {
            code: "200",
            message: "Success"
          },
          response: bundle
        }
      }

      console.log('✅ BPJS API Response (Mock):')
      console.log(JSON.stringify(mockResponse, null, 2))

      return mockResponse

    } catch (error) {
      console.error('❌ Error sending bundle to BPJS:', error)
      return {
        message: "Gagal mengirim data ke BPJS",
        success: false,
        error: error.message
      }
    }
  }

  console.log('- await sendBPJSBundle() // Send bundle to BPJS API')
  console.log('- await sendBPJSBundle(bundle) // Send specific bundle')
})
async function generateMinimalBPJSBundle() {
  try {
    // Load data yang diperlukan
    const patientData = visitDetails.value?.registrasi?.pasien || visitDetails.value?.pasien
    const regPeriksaData = visitDetails.value?.registrasi || visitDetails.value?.reg_periksa
    const data = {
      ...selectedVisitData.value,
      ...regPeriksaData,
      ...patientData,
      no_peserta: selectedVisitData.value?.no_kartu || regPeriksaData?.no_peserta || patientData?.no_peserta || ''
    }

    const hospitalSetting = await loadHospitalSetting()
    const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
    const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
    const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'
    const jnsPelayanan = data.jnspelayanan // Gunakan nilai asli: "2" untuk Ralan, "1" untuk Ranap
    console.log('Original jnspelayanan:', data.jnspelayanan)
    console.log('Processed jnsPelayanan:', jnsPelayanan)

    // Map diagnosis data from available fields
    const diagnosisText = data.diagnosa || data.nmdiagnosaawal || ''
    const diagnosisCode = data.kd_penyakit || data.diagawal || ''

    // Use consistent data - prioritize database data for consistency with jnspelayanan
    const patientName = data.nm_pasien || data.nama_pasien || 'Unknown Patient'
    const patientBirthDate = data.tgl_lahir || data.tanggal_lahir || null
    const patientNoRM = data.no_rkm_medis || data.nomr || 'RM001'

    // Generate IDs
    const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const organizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const practitionerId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const conditionId = diagnosisText ? `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}` : null
    const encounterId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

    console.log('=== MINIMAL BPJS Bundle Debug ===')
    console.log('Complete data object:', JSON.stringify(data, null, 2))
    console.log('Patient name:', data.nm_pasien || data.nama_pasien)
    console.log('No SEP:', data.no_sep)
    console.log('No RM:', data.no_rkm_medis)
    console.log('Diagnosis (diagnosa):', data.diagnosa)
    console.log('Diagnosis (nmdiagnosaawal):', data.nmdiagnosaawal)
    console.log('Kode Penyakit (kd_penyakit):', data.kd_penyakit)
    console.log('Kode Penyakit (diagawal):', data.diagawal)
    console.log('Jenis Pelayanan:', data.jnspelayanan)
    console.log('Tgl Registrasi:', data.tgl_registrasi)
    console.log('No Peserta:', data.no_peserta)
    console.log('No KTP:', data.no_ktp)
    console.log('Tanggal Lahir (SEP):', data.tanggal_lahir)
    console.log('Tanggal Lahir (Pasien):', data.tgl_lahir)
    console.log('Nama Pasien (SEP):', data.nama_pasien)
    console.log('Nama Pasien (Database):', data.nm_pasien)

    // Check if we have minimum required data for BPJS
    if (!data.no_rkm_medis || (!data.nm_pasien && !data.nama_pasien)) {
      console.error('Missing required patient data')
      console.log('no_rkm_medis:', data.no_rkm_medis)
      console.log('nm_pasien:', data.nm_pasien)
      console.log('nama_pasien:', data.nama_pasien)
      return null
    }

    console.log('=== Data Mapping for BPJS ===')
    console.log('Using patient name (Database):', patientName)
    console.log('Using birth date (Database):', patientBirthDate)
    console.log('Using No RM (Database):', patientNoRM)
    console.log('Mapped diagnosis text:', diagnosisText)
    console.log('Mapped diagnosis code:', diagnosisCode)
    console.log('Nota Jalan data:', data.nota_jalan)
    if (data.nota_jalan) {
      console.log('Nota Jalan tanggal:', data.nota_jalan.tanggal)
      console.log('Nota Jalan jam:', data.nota_jalan.jam)
      console.log('Expected period end:', data.nota_jalan.tanggal + ' ' + data.nota_jalan.jam)
    } else {
      console.log('No Nota Jalan data available, will use fallback')
    }

    // Debug period start data
    console.log('Tgl Registrasi:', data.tgl_registrasi)
    console.log('Jam Reg (level 1):', data.jam_reg)
    console.log('Jam Reg (reg_periksa):', data.reg_periksa?.jam_reg)
    console.log('Final jam_reg used:', data.jam_reg || data.reg_periksa?.jam_reg)
    console.log('Expected period start:', data.tgl_registrasi + ' ' + (data.jam_reg || data.reg_periksa?.jam_reg))

    // Additional validation for critical BPJS fields
    console.log('=== BPJS Required Fields Validation ===')
    console.log('no_sep:', data.no_sep)
    console.log('no_rkm_medis:', data.no_rkm_medis)
    console.log('nm_pasien:', data.nm_pasien || data.nama_pasien)
    console.log('no_peserta:', data.no_peserta)
    console.log('diagnosisText:', diagnosisText)
    console.log('diagnosisCode:', diagnosisCode)
    console.log('jnspelayanan:', jnsPelayanan)
    console.log('tgl_registrasi:', data.tgl_registrasi)

    // Check for null/undefined critical fields
    const criticalFields = {
      no_sep: data.no_sep,
      no_rkm_medis: patientNoRM,
      nm_pasien: patientName,
      diagnosisText: diagnosisText,
      jnsPelayanan: jnsPelayanan
    }

    const missingFields = Object.entries(criticalFields)
      .filter(([key, value]) => {
        console.log(`Checking ${key}:`, value, '->', !value || value === 'undefined' || value === '')
        return !value || value === 'undefined' || value === '' || value === 'null'
      })
      .map(([key]) => key)

    if (missingFields.length > 0) {
      console.error('❌ Missing critical BPJS fields:', missingFields)
      return null
    } else {
      console.log('✅ All critical BPJS fields are present')
    }

    console.log('Generated IDs:')
    console.log('Patient ID:', patientId)
    console.log('Organization ID:', organizationId)
    console.log('Condition ID:', conditionId)
    console.log('Encounter ID:', encounterId)

    // MINIMAL BUNDLE - Individual entry objects (BPJS format)
  
    console.log('✅ FIXED MINIMAL BPJS Bundle Structure:')
    console.log('Entry count:', minimalBundle.entry.length)
    console.log('Resources:', minimalBundle.entry.map(e => e.resource.resourceType).join(', '))
    console.log('Bundle size:', JSON.stringify(minimalBundle).length, 'characters')
    console.log('Diagnosis:', minimalBundle.entry.find(e => e.resource.resourceType === 'Encounter')?.resource.diagnosis)

    // Check for null values in bundle
    console.log('=== Checking for null values in bundle ===')
    minimalBundle.entry.forEach((entry, index) => {
      console.log(`Entry ${index} (${entry.resource.resourceType}):`)
      Object.keys(entry.resource).forEach(key => {
        const value = (entry.resource as any)[key]
        if (value === null || value === undefined || value === '') {
          console.log(`  ⚠️  ${key}: ${value}`)
        }
      })
    })

    console.log('✅ About to return minimalBundle (not null)')

    return minimalBundle

  } catch (error) {
    console.error('Error generating minimal bundle:', error)
    return null
  }
}


// Helper function to parse lab results text
function parseLabResults(labResultsText: string): any[] {
  const results: any[] = []
  const lines = labResultsText.split('\n')

  lines.forEach(line => {
    line = line.trim()
    if (!line) return

    // Simple parsing logic - this would need to be enhanced based on actual lab result format
    const match = line.match(/(.+?)\s*:\s*([\d.,]+)\s*(.*)/)
    if (match) {
      results.push({
        testName: match[1].trim(),
        value: parseFloat(match[2].replace(',', '.')),
        unit: match[3] ? match[3].trim() : '',
        coding: []
      })
    }
  })

  return results
}

// GANTI SELURUH FUNGSI INI (sekitar baris 3020)
// GANTI SELURUH FUNGSI INI (sekitar baris 3020)
async function generateBPJSMedicalRecordBundle() {
  try {
    // Load required data
    const patientData = visitDetails.value?.registrasi?.pasien || visitDetails.value?.pasien
    const regPeriksaData = visitDetails.value?.registrasi || visitDetails.value?.reg_periksa
    
    // Fallback data yang kuat
    const data = {
      ...selectedVisitData.value,
      ...regPeriksaData,
      ...patientData,
      no_peserta: selectedVisitData.value?.no_kartu || regPeriksaData?.no_peserta || patientData?.no_peserta || '0000000000000',
      jnspelayanan: selectedVisitData.value?.jnspelayanan || regPeriksaData?.jnspelayanan || '2',
      no_ktp: regPeriksaData?.pasien?.no_ktp || patientData?.no_ktp || '0000000000000000',
      no_tlp: regPeriksaData?.pasien?.no_tlp || patientData?.no_tlp || '080000000000',
      alamat: regPeriksaData?.pasien?.alamat || patientData?.alamat || 'Alamat Pasien',
      nm_kab: regPeriksaData?.pasien?.kabupaten?.nm_kab || patientData?.kabupaten?.nm_kab || 'Kabupaten',
      nm_kec: regPeriksaData?.pasien?.kecamatan?.nm_kec || patientData?.kecamatan?.nm_kec || 'Kecamatan',
      kd_pos: regPeriksaData?.pasien?.kd_pos || patientData?.kd_pos || '51161',
      tgl_lahir: regPeriksaData?.pasien?.tgl_lahir || patientData?.tgl_lahir || '1900-01-01',
      nm_pasien: regPeriksaData?.pasien?.nm_pasien || patientData?.nm_pasien || 'Pasien',
      jk: regPeriksaData?.pasien?.jk || patientData?.jk || 'L',
      // Data untuk format tanggal
      tgl_registrasi: regPeriksaData?.tgl_registrasi || selectedVisitData.value?.tgl_registrasi,
      jam_reg: regPeriksaData?.jam_reg || selectedVisitData.value?.jam_reg
    }

    // Load hospital settings
    const hospitalSetting = await loadHospitalSetting()
    const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
    const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
    const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'

    // Get jnspelayanan from SEP data (bridging_sep table) with proper mapping
    const jnsPelayananFromSEP = visitDetails.value?.sep?.jnsPelayanan
    const jnsPelayananFromReg = data.jnspelayanan || selectedVisitData.value?.jnspelayanan

    let jnsPelayanan = '1' // Default

    // Priority 1: Use from SEP data if available
    if (jnsPelayananFromSEP) {
      jnsPelayanan = jnsPelayananFromSEP
    }
    // Priority 2: Use directly if already '2' or '1', or map from text
    else if (jnsPelayananFromReg === '2' || jnsPelayananFromReg === '1') {
      jnsPelayanan = jnsPelayananFromReg
    }
    // Priority 3: Map from registration data ('Ralan' -> '2', 'Ranap' -> '1')
    else if (jnsPelayananFromReg === 'Ralan') {
      jnsPelayanan = '2'
    } else if (jnsPelayananFromReg === 'Ranap') {
      jnsPelayanan = '1'
    }

    console.log('🔍 JnsPelayanan Debug (generateBPJSMedicalRecordBundle):', {
      'SEP.jnsPelayanan': jnsPelayananFromSEP,
      'Reg.jnspelayanan': jnsPelayananFromReg,
      'Final jnsPelayanan': jnsPelayanan,
      'Expected for Rawat Jalan': '2'
    })

    // =================================================================
    // PERBAIKAN FORMAT TANGGAL KE 'YYYY-MM-DD HH:MM:SS'
    // =================================================================
    const now = new Date();
    let startDate: Date;
    
    if (data.tgl_registrasi && data.jam_reg) {
        try {
            // Coba parsing tanggal dari data
            const parts = data.tgl_registrasi.split('-');
            const timeParts = data.jam_reg.split(':');
            startDate = new Date(
                parseInt(parts[0]), 
                parseInt(parts[1]) - 1, // Bulan (0-11)
                parseInt(parts[2]),
                parseInt(timeParts[0]),
                parseInt(timeParts[1]),
                parseInt(timeParts[2])
            );
        } catch (e) {
            console.warn('Gagal parsing tanggal registrasi, menggunakan waktu sekarang', e)
            startDate = now; // Fallback jika parsing gagal
        }
    } else {
        console.warn('Data tgl_registrasi atau jam_reg tidak ada, menggunakan waktu sekarang')
        startDate = now; // Fallback jika data tgl/jam reg tidak ada
    }

    const startTime = formatBpjsDateTime(startDate); // '2025-11-13T11:21:33+07:00'
    const endTime = formatBpjsDateTime(now);       // '2025-11-15T13:15:49+07:00'
    // =================================================================
    // AKHIR PERBAIKAN TANGGAL
    // =================================================================

    // Generate unique IDs
    const bundleId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const organizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const practitionerId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const encounterId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const compositionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

    // Generate resources array
    const resources = []

    // 1. Patient Resource (STANDAR FHIR - ARRAY)
    resources.push({
      resourceType: 'Patient',
      id: patientId,
      identifier: [ 
        {
          use: 'usual',
          type: { coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'MR' }] },
          system: `urn:oid:${kodeKemenkes}`, 
          value: data.no_rkm_medis,
          assigner: { display: namaRumahSakit }
        },
        {
          use: 'official',
          type: { coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'MB' }], text: 'Nomor Peserta BPJS Kesehatan' },
          system: 'urn:oid:bpjs', 
          value: data.no_peserta,
          assigner: { display: 'BPJS Kesehatan' }
        },
        {
          use: 'official',
          type: { coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'NNIDN' }], text: 'NIK' },
          system: 'urn:oid:KEMENDAGRI', 
          value: data.no_ktp,
          assigner: { display: 'KEMENDAGRI' }
        }
      ],
      active: true,
      name: [{ 
        use: 'official',
        text: data.nm_pasien
      }],
      telecom: [{
        system: 'phone',
        value: data.no_tlp,
        use: 'home'
      }],
      gender: data.jk === 'L' ? 'male' : 'female',
      birthDate: data.tgl_lahir,
      address: [{ 
        use: 'home',
        type: 'both',
        text: data.alamat,
        line: [ data.alamat ], 
        city: data.nm_kab,
        district: data.nm_kec,
        postalCode: data.kd_pos,
        country: 'IDN'
      }]
    })

    // 2. Organization Resource (STANDAR FHIR - ARRAY)
    console.log('🔍 Debug Poli Data:')
    console.log('- visitDetails.value.poli?.nm_poli:', visitDetails.value.poli?.nm_poli)
    console.log('- data.nm_poli:', data.nm_poli)
    console.log('- data.poli_tujuan:', data.poli_tujuan)
    console.log('- data.poli_rujukan:', data.poli_rujukan)
    console.log('- data.nm_poli_dpjp:', data.nm_poli_dpjp)
    console.log('- regPeriksaData data poli:', {
      nm_poli: regPeriksaData?.nm_poli,
      poli_tujuan: regPeriksaData?.poli_tujuan,
      kd_poli: regPeriksaData?.kd_poli
    })

    // Mapping kode poli ke nama poli
    const poliMapping: { [key: string]: string } = {
      'IGDK': 'Instalasi Gawat Darurat',
      'IGD': 'Instalasi Gawat Darurat',
      'RI': 'Radiologi',
      'RAD': 'Radiologi',
      'LAB': 'Laboratorium',
      'INT': 'Penyakit Dalam',
      'OBG': 'Obstetri dan Ginekologi',
      'ANO': 'Anak',
      'BED': 'Bedah',
      'MAT': 'Maternal',
      'PAR': 'Paru',
      'JAN': 'Jantung',
      'SAR': 'Saraf',
      'KUL': 'Kulit dan Kelamin',
      'THT': 'Telinga Hidung Tenggorokan',
      'MATA': 'Mata',
      'GIGI': 'Gigi dan Mulut',
      'ORTH': 'Ortopedi',
      'PSI': 'Psikiatri',
      'REH': 'Rehabilitasi Medik',
      'UMU': 'Poli Umum',
      'VK': 'Poli Vaksin',
      'KIA': 'Kesehatan Ibu dan Anak',
      'GIZI': 'Gizi',
      'FISIO': 'Fisioterapi'
    }

    const kdPoli = regPeriksaData?.kd_poli || data.kd_poli || ''
    const poliNameFromMapping = kdPoli ? (poliMapping[kdPoli] || '') : ''
    const poliName = visitDetails.value.poli?.nm_poli ||
                    data.nm_poli ||
                    data.poli_tujuan ||
                    data.poli_rujukan ||
                    regPeriksaData?.nm_poli ||
                    poliNameFromMapping ||
                    ''

    const organizationName = poliName ? `${poliName} - ${namaRumahSakit}` : namaRumahSakit

    console.log('🏥 Final Organization Name:', organizationName)
    console.log('📋 Used poli source:', {
      fromDirect: poliName && !poliNameFromMapping ? 'direct' : 'mapping',
      kdPoli: kdPoli,
      mappedName: poliNameFromMapping,
      finalName: poliName
    })

    resources.push({
      resourceType: 'Organization',
      id: organizationId,
      identifier: [
        {
          use: 'official',
          system: 'urn:oid:bpjs',
          value: kodeFaskesBpjs
        },
        {
          use: 'official',
          system: 'urn:oid:KEMKES',
          value: kodeKemenkes
        }
      ],
      type: [{
         coding: [{
            system: 'http://hl7.org/fhir/organization-type',
            code: 'prov',
            display: 'Healthcare Provider'
         }],
         text: organizationName
      }],
      name: organizationName,
      alias: [namaRumahSakit],
      telecom: [{
        system: 'phone',
        value: hospitalSetting.kontak || '0281-432123',
        use: 'work'
      }],
      address: [{
        use: 'work',
        text: hospitalSetting.alamat_lengkap || `${hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123'}, ${hospitalSetting.kelurahan || ''}, ${hospitalSetting.kecamatan || 'Kecamatan'}, ${hospitalSetting.kabupaten?.nm_kab || 'Kabupaten Pekalongan'}, ${hospitalSetting.propinsi?.nm_prop || 'Provinsi Jawa Tengah'}, ${hospitalSetting.kd_pos || '51161'}, Indonesia`,
        line: [hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123'],
        city: hospitalSetting.kabupaten?.nm_kab || 'Kabupaten Pekalongan',
        district: hospitalSetting.kecamatan || 'Kecamatan',
        state: hospitalSetting.propinsi?.nm_prop || 'Provinsi Jawa Tengah',
        postalCode: hospitalSetting.kd_pos || '51161',
        country: 'IDN'
      }],
      contact: [{
        purpose: {
          coding: [{
            system: 'http://hl7.org/fhir/contactentity-type',
            code: 'PATINF'
          }]
        },
        telecom: [{
          system: 'phone',
          value: hospitalSetting.kontak || '0281-432123'
        }]
      }]
    })

    // 3. Practitioner Resource (STANDAR FHIR - ARRAY)
    const practitionerName = data.dpjp || data.dokter?.nm_dokter || data.nm_dokter || visitDetails.value?.dokter?.nm_dokter || 'Dokter'
    const nikValue = data.no_nik_dokter || data.dokter?.no_nik || '0000000000000000'
    const phoneValue = data.telp_dokter || data.dokter?.telp || data.hp_dokter || '080000000000'
    const noIjinPraktek = data.no_ijin_praktek || data.sip || data.no_sip || data.no_izin_praktek || '1.2.01.3173.1834/14022/04.16.1'

    resources.push({
      resourceType: 'Practitioner',
      id: practitionerId,
      identifier: [
        {
          use: 'official',
          type: {
            coding: [{
              system: 'urn:oid:nomor_sip'
            }]
          },
          value: noIjinPraktek
        },
        {
          use: 'official',
          type: {
            coding: [{
              system: 'http://hl7.org/fhir/v2/0203',
              code: 'NNIDN'
            }],
            text: 'NIK'
          },
          system: 'urn:oid:KEMENDAGRI',
          value: nikValue,
          assigner: { display: 'KEMENDAGRI' }
        }
      ],
      name: [{
        use: 'official',
        text: practitionerName
      }],
      telecom: [
        {
          system: 'phone',
          value: phoneValue,
          use: 'work'
        },
        {
          system: 'mobile',
          value: data.dokter?.no_telp || data.no_telp_dokter || visitDetails.value?.dokter?.no_telp || phoneValue,
          use: 'mobile'
        },
        {
          system: 'email',
          value: data.dokter?.email || data.email_dokter || visitDetails.value?.dokter?.email || '-',
          use: 'work'
        },
        {
          system: 'fax',
          value: data.dokter?.fax || data.fax_dokter || visitDetails.value?.dokter?.fax || '-',
          use: 'work'
        }
      ]
    })

    // 5. Diagnosis Resources (Condition) - Lengkap dari diagnosa_pasien table
    const conditionResources = []
    let diagnosisCounter = 1

    // Prioritaskan data dari visitDetails.value.diagnosa (dari diagnosa_pasien table)
    if (visitDetails.value?.diagnosa && Array.isArray(visitDetails.value.diagnosa)) {
      console.log('🩺 Processing diagnoses from diagnosa_pasien table:', visitDetails.value.diagnosa.length, 'diagnoses found')

      visitDetails.value.diagnosa.forEach((diagnosisItem: any) => {
        // Validasi data diagnosa
        if (!diagnosisItem.kode || !diagnosisItem.deskripsi) {
          console.warn('⚠️ Invalid diagnosis data (missing kode or deskripsi):', diagnosisItem)
          return // Skip invalid diagnosis
        }

        const conditionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

        console.log(`📋 Creating Condition ${diagnosisCounter++}: ${diagnosisItem.kode} - ${diagnosisItem.deskripsi}`)

        const conditionResource = {
          resourceType: 'Condition',
          id: conditionId,
          clinicalStatus: 'active',
          verificationStatus: 'confirmed',
          category: [{
            coding: [{
              system: 'http://hl7.org/fhir/condition-category',
              code: 'encounter-diagnosis',
              display: 'Encounter Diagnosis'
            }]
          }],
          code: {
            coding: [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: diagnosisItem.kode,
              display: diagnosisItem.deskripsi
            }],
            text: diagnosisItem.deskripsi
          },
          subject: {
            reference: `Patient/${patientId}`,
            noSep: data.no_sep
          },
          encounter: {
            reference: `Encounter/${encounterId}`
          },
          onsetDateTime: startTime, // Format YYYY-MM-DDTHH:mm:ss+07:00
          recordedDate: formatBpjsDateTime(new Date()),
          severity: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '255604002',
              display: 'Mild'
            }]
          },
          bodySite: [] // Additional if needed
        }

        conditionResources.push({
          id: conditionId,
          text: diagnosisItem.deskripsi,
          code: diagnosisItem.kode,
          resource: conditionResource
        })
      })
    }

    // Fallback ke data diagnosa dari reg_periksa jika tidak ada data dari diagnosa_pasien
    if (conditionResources.length === 0) {
      console.log('🔄 Using fallback diagnosis from reg_periksa data')
      const fallbackDiagnosis = data.diagnosa || data.penyakit || 'General examination'
      const fallbackCode = data.kd_penyakit || 'Z00.0'

      const conditionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

      const conditionResource = {
        resourceType: 'Condition',
        id: conditionId,
        clinicalStatus: 'active',
        verificationStatus: 'confirmed',
        category: [{
          coding: [{
            system: 'http://hl7.org/fhir/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis'
          }]
        }],
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: fallbackCode,
            display: fallbackDiagnosis
          }],
          text: fallbackDiagnosis
        },
        subject: {
          reference: `Patient/${patientId}`,
          display: data.nm_pasien || data.nama_pasien || 'Unknown Patient'
        },
        encounter: {
          reference: `Encounter/${encounterId}`
        },
        onsetDateTime: startTime,
        recordedDate: formatBpjsDateTime(new Date()),
        severity: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '255604002',
            display: 'Mild'
          }]
        }
      }

      conditionResources.push({
        id: conditionId,
        text: fallbackDiagnosis,
        code: fallbackCode,
        resource: conditionResource
      })
    }

    // Push semua Condition resources ke bundle
    conditionResources.forEach((conditionData) => {
      resources.push(conditionData.resource)
    })

    console.log(`✅ Created ${conditionResources.length} Condition resources from diagnosa_pasien table`)

    // 4. Encounter Resource (STANDAR FHIR - ARRAY) dengan diagnosis links
    const encounterClass = (data.jnspelayanan === 'Ralan' || data.jnspelayanan === '2' || data.jnspelayanan === 2 || jnsPelayanan === '2') ? 'AMB' : 'IMP'

    // Create diagnosis array untuk Encounter (link ke Condition resources)
    const encounterDiagnosis = conditionResources.map((condition, index) => ({
      condition: {
        reference: `Condition/${condition.id}`,
        display: condition.text
      },
      role: {
        coding: [{
          system: 'http://hl7.org/fhir/diagnosis-role',
          code: index === 0 ? 'DD' : 'AD', // Primary diagnosis for first, Additional for others
          display: index === 0 ? 'Discharge Diagnosis' : 'Admission Diagnosis'
        }]
      },
      rank: index + 1
    }))

    const encounterResource = {
      resourceType: 'Encounter',
      id: encounterId,
      identifier: [{
        use: 'official',
        system: 'http://api.bpjs-kesehatan.go.id:8080/Vclaim-rest/SEP/',
        value: data.no_sep,
        assigner: { display: 'BPJS Kesehatan' }
      }],
      status: 'finished',
      class: {
        system: 'http://hl7.org/fhir/v3/ActCode',
        code: encounterClass,
        display: encounterClass === 'AMB' ? 'ambulatory' : 'inpatient encounter'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: data.nm_pasien
      },
      period: {
        start: startTime, // Format YYYY-MM-DDTHH:mm:ss+07:00
        end: endTime      // Format YYYY-MM-DDTHH:mm:ss+07:00
      },
      serviceProvider: {
        reference: `Organization/${organizationId}`,
        display: namaRumahSakit
      },
      diagnosis: encounterDiagnosis,
      reasonCode: {
        coding: [{
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: conditionResources[0]?.code || 'Z00.0',
          display: 'ICD 10'
        }],
        text: conditionResources[0]?.text || 'General examination'
      },
      reason: [{
        text: conditionResources[0]?.text || 'General examination'
      }]
    }

    resources.push(encounterResource)

    // 6. Composition Resource (STRUKTUR ANEH SESUAI bundle.json)
    const compositionSections = {}
    let sectionIndex = 0
    
    // Section 0: Keluhan
    const keluhan = (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.keluhan || data.keluhan || 'Tidak ada keluhan').trim()
    compositionSections[sectionIndex++] = {
      title: 'Reason for admission',
      code: { coding: [{ system: 'http://loinc.org', code: '29299-5', display: 'Reason for visit Narrative' }] },
      text: { status: 'additional', div: keluhan },
      mode: 'working',
      entry: [{ reference: `Encounter/${encounterId}` }]
    }
    
    // Section 1: Diagnosa (wajib) - Gunakan Condition resources dari diagnosa_pasien
    const diagnosisTexts = conditionResources.map(c => c.text).join(', ') || 'Tidak ada diagnosa'
    const diagnosisEntries = conditionResources.map(c => ({ reference: `Condition/${c.id}` }))

    compositionSections[sectionIndex++] = {
        title: 'Discharge diagnosis',
        code: { coding: [{ system: 'http://loinc.org', code: '42347-5', display: 'Discharge diagnosis Narrative' }] },
        text: { status: 'additional', div: diagnosisTexts },
        mode: 'working',
        entry: diagnosisEntries
    }

    const compositionResource = {
      resourceType: 'Composition',
      id: compositionId,
      status: 'final',
      type: {
        coding: [{ 
          system: 'http://loinc.org',
          code: '81218-0'
        }],
        text: 'Discharge Summary'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: data.nm_pasien
      },
      encounter: {
        reference: `Encounter/${encounterId}`
      },
      date: endTime, // Format YYYY-MM-DDTHH:mm:ss+07:00
      author: [{ 
        reference: `Practitioner/${practitionerId}`,
        display: practitionerName
      }],
      title: 'Discharge Summary',
      confidentiality: 'N',
      section: compositionSections // 'section' sebagai OBJEK BERNOMOR
    }
    resources.push(compositionResource)

    // 8. MedicationRequest Resources dari Resep Obat
    console.log('🔍 Checking resepObat data for MedicationRequest generation:', {
      resepObatLength: resepObat.value?.length || 0,
      resepObatData: resepObat.value,
      visitDetailsObatLength: visitDetails.value?.obat?.length || 0,
      visitDetailsObatData: visitDetails.value?.obat,
      fullVisitDetails: visitDetails.value
    })

    // Gunakan resepObat.value jika ada, fallback ke visitDetails.obat langsung
    const medicationData = (resepObat.value && resepObat.value.length > 0)
      ? resepObat.value.flatMap((r: any) => r.detail || [])
      : (visitDetails.value?.obat || [])

    if (medicationData.length > 0) {
      console.log(`🔄 Creating MedicationRequest resources...`)

      // Track medication request IDs to match with resources
      const medicationRequestIds: string[] = []
      let medicationRequests = 0

      medicationData.forEach((obat: any, obatIndex: number) => {
        const medicationName = obat.obat?.nama_brng || obat.nama_brng || 'Unknown Medication'
        const aturanText = obat.aturan_pakai?.aturan || obat.aturan || '1x1'
        const dosageParse = parseDosageInstruction(aturanText)
        const quantity = obat.jml || 1

        // Parse route (default ORAL, can be overridden)
        let routeCode = '001'
        let routeDisplay = 'ORAL'
        let routeSystem = 'http://snomed.info/sct'

        // Check if there's specific route information
        if (obat.rute && obat.rute.trim()) {
          // Common route mappings
          const routeMappings: { [key: string]: { code: string, display: string } } = {
            'IV': { code: '002', display: 'INTRAVENOUS' },
            'IM': { code: '003', display: 'INTRAMUSCULAR' },
            'SC': { code: '004', display: 'SUBCUTANEOUS' },
            'PO': { code: '001', display: 'ORAL' },
            'SL': { code: '005', display: 'SUBLINGUAL' },
            'TOP': { code: '006', display: 'TOPICAL' },
            'INH': { code: '007', display: 'INHALATION' }
          }

          const routeUpper = obat.rute.toUpperCase().trim()
          if (routeMappings[routeUpper]) {
            routeCode = routeMappings[routeUpper].code
            routeDisplay = routeMappings[routeUpper].display
          }
        }

        // Create only one MedicationRequest per medication
        const medicationRequestId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
        medicationRequestIds.push(medicationRequestId)

        const medicationRequestResource = {
            resourceType: 'MedicationRequest',
            meta: {
              lastUpdated: endTime
            },
            text: {
              div: `<div xmlns="http://www.w3.org/1999/xhtml">${medicationName}</div>`
            },
            identifier: {
              system: 'id_resep_pulang',
              value: medicationRequestId
            },
            intent: 'order',
            medicationCodeableConcept: {
              coding: [{
                system: 'http://rscm.co.id/drug',
                code: obat.kode_brng,
                display: 'Active'
              }],
              text: medicationName
            },
            subject: {
              reference: `Patient/${patientId}`,
              display: data.nm_pasien
            },
            requester: {
              agent: {
                display: practitionerName,
                reference: `Practitioner/${practitionerId}`
              },
              onBehalfOf: {
                reference: `Organization/${organizationId}`
              }
            },
            dosageInstruction: [{
              additionalInstruction: [{
                text: aturanText
              }],
              timing: {
                repeat: {
                  frequency: dosageParse.frequency,
                  period: dosageParse.period,
                  periodUnit: dosageParse.periodUnit || 'd'
                }
              },
              route: {
                coding: [{
                  system: 'http://snomed.info/sct',
                  code: routeCode,
                  display: routeDisplay
                }]
              },
              doseQuantity: {
                value: 1, // Always 1 unit per MedicationRequest
                unit: obat.obat?.kode_sat || 'TAB',
                system: 'http://unitsofmeasure.org',
                code: obat.obat?.kode_sat || 'TAB'
              }
            }]
          }

          resources.push(medicationRequestResource)
          medicationRequests++

          console.log(`✅ Created MedicationRequest for ${medicationName} (${quantity} ${obat.obat?.kode_sat || 'TAB'})`)
        })

        // Tambahkan section untuk obat dalam Composition
        const medicationTexts = medicationData.map((obat: any) => {
          const medicationName = obat.obat?.nama_brng || obat.nama_brng || 'Unknown'
          const aturanText = obat.aturan_pakai?.aturan || obat.aturan || '1x1'
          const quantity = obat.jml || 1
          return `${medicationName} (${quantity} ${obat.obat?.kode_sat || 'TAB'}) (${aturanText})`
        }).join(', ') || 'Tidak ada obat'

        const medicationEntries = medicationRequestIds
          .map((medicationRequestId) => {
            const medicationResource = resources.find(r => r.resourceType === 'MedicationRequest' && r.id === medicationRequestId)
            return medicationResource ? {
              resource: medicationResource
            } : null
          })
          .filter(entry => entry !== null) // Remove null entries

      // Section 2: Medications
      compositionSections[sectionIndex++] = {
        title: 'Medications',
        code: { coding: [{ system: 'http://loinc.org', code: '10183-2', display: 'Medication discharge instructions Narrative' }] },
        text: { status: 'additional', div: medicationTexts },
        mode: 'working',
        entry: medicationEntries
      }

      console.log(`✅ Created ${medicationRequests} MedicationRequest resources from ${medicationData.length} medications`)
      console.log(`📊 Medication summary: ${medicationData.map((o: any) => `${o.obat?.nama_brng || o.nama_brng} (${o.jml || 1} ${o.obat?.kode_sat || 'TAB'})`).join(', ')}`)
    } // Close if (medicationData.length > 0)

    // 9. Procedure Resources dari Data Tindakan
    console.log('🔍 Checking procedure billing data for Procedure generation:', {
      procedureBillingLength: procedureBilling.value?.length || 0,
      procedureBillingData: procedureBilling.value
    })

    // Create Procedure Resources and group them
    const procedureResources: any[] = []

    if (procedureBilling.value && procedureBilling.value.length > 0) {
      console.log(`🔄 Creating Procedure resources from ${procedureBilling.value.length} procedures...`)

      let procedureCounter = 1

      procedureBilling.value.forEach((procedure: any) => {
        const procedureId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

        console.log(`🏥 Creating Procedure ${procedureCounter++}: ${procedure.nm_perawatan} - ${procedure.kd_jenis_prw}`)

        // Get procedure code and description from SNOMED mapping API data
        let procedureCode = procedure.kd_jenis_prw
        let procedureDisplay = procedure.nm_perawatan
        let procedureSystem = 'http://hl7.org/fhir/sid/icd-9-cm'

        // Check if there's SNOMED mapping from API
        if (procedure.snomed_mapping && procedure.snomed_mapping.mapping) {
          const mapping = procedure.snomed_mapping.mapping
          procedureCode = mapping.code
          procedureDisplay = mapping.display || procedure.nm_perawatan
          procedureSystem = mapping.system || 'http://snomed.info/sct'
          console.log(`📋 Using SNOMED mapping: ${procedure.nm_perawatan} → ${mapping.code} (${mapping.display})`)
        } else if (procedure.snomed_mapping && procedure.snomed_mapping.code) {
          // Fallback for direct code mapping
          procedureCode = procedure.snomed_mapping.code
          procedureDisplay = procedure.snomed_mapping.display || procedure.nm_perawatan
          procedureSystem = procedure.snomed_mapping.system || 'http://snomed.info/sct'
          console.log(`📋 Using direct SNOMED mapping: ${procedure.nm_perawatan} → ${procedure.snomed_mapping.code}`)
        } else {
          console.log(`⚠️ No SNOMED mapping found for: ${procedure.nm_perawatan}, using ICD-9-CM code`)
        }

        // Use SNOMED mapping for performer role from the procedure data
        let performerRole = {
          system: 'http://snomed.info/sct',
          code: '309343006', // Default to Medical doctor
          display: 'Medical doctor'
        }

        // Check if there's SNOMED mapping from API to use for performer role
        if (procedure.snomed_mapping && procedure.snomed_mapping.has_mapping && procedure.snomed_mapping.snomed) {
          const snomed = procedure.snomed_mapping.snomed
          performerRole = {
            system: snomed.system || 'http://snomed.info/sct',
            code: snomed.code,
            display: snomed.display || procedure.nm_perawatan
          }
        } else if (procedure.snomed_mapping && procedure.snomed_mapping.mapping) {
          const mapping = procedure.snomed_mapping.mapping
          performerRole = {
            system: mapping.system || 'http://snomed.info/sct',
            code: mapping.code,
            display: mapping.display || procedure.nm_perawatan
          }
        } else if (procedure.snomed_mapping && procedure.snomed_mapping.code) {
          performerRole = {
            system: procedure.snomed_mapping.system || 'http://snomed.info/sct',
            code: procedure.snomed_mapping.code,
            display: procedure.snomed_mapping.display || procedure.nm_perawatan
          }
        }

        const procedureResource: any = {
          resourceType: 'Procedure',
          id: procedureId,
          status: 'completed',
          code: {
            coding: [{
              system: procedureSystem,
              code: procedureCode,
              display: procedureDisplay
            }]
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: data.nm_pasien || data.nama_pasien || 'Unknown Patient'
          },
          performedPeriod: {
            start: startTime,
            end: endTime
          },
          performer: [{
            actor: {
              reference: `Practitioner/${practitionerId}`,
              display: practitionerName
            },
            role: {
              coding: [performerRole]
            }
          }]
        }

        // Add reasonCode if available
        if (procedure.alasan_tindakan) {
          procedureResource.reasonCode = [{
            text: procedure.alasan_tindakan
          }]
        }

        // Add bodySite if available
        if (procedure.lokalasi) {
          procedureResource.bodySite = [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '272676008',
              display: procedure.lokalasi
            }]
          }]
        }

        procedureResources.push(procedureResource)
        console.log(`✅ Created Procedure for ${procedure.nm_perawatan} (Tarif: ${procedure.tarif || 0})`)
      })

      console.log(`✅ Created ${procedureResources.length} Procedure resources`)
    }

    // 10. Build Final Bundle
    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: endTime // Format YYYY-MM-DDTHH:mm:ss+07:00
      },
      identifier: { // Non-standar (Objek) - Sesuai bundle.json
        use: null,
        type: { coding: [], text: null },
        system: 'SEP',
        value: data.no_sep || 'SEP001',
        assigner: { display: null }
      },
      type: 'Document',
      entry: []
    }

    // Add non-medication resources individually
    const medicationRequests = resources.filter(r => r.resourceType === 'MedicationRequest')
    const nonMedicationResources = resources.filter(r => r.resourceType !== 'MedicationRequest')

    // Add non-medication resources first
    nonMedicationResources.forEach(resource => {
      bundle.entry.push({
        resource: resource
      })
    })

    // Add medication requests grouped as array
    if (medicationRequests.length > 0) {
      bundle.entry.push({
        resource: medicationRequests
      })
    }

    // Add procedure resources grouped as array
    if (procedureResources.length > 0) {
      bundle.entry.push({
        resource: procedureResources
      })
    }

    console.log('✅ BPJS FHIR Bundle (Meniru bundle.json + Format Tanggal) generated')
    console.log('Payload Lengkap:', JSON.stringify(bundle, null, 2))

    return bundle

  } catch (error) {
    console.error('Error generating BPJS FHIR Bundle:', error)
    return null
  }
}

// =====================================================
// DEBUG FUNCTIONS - Kirim Resource Satu Per Satu
// =====================================================

// Fungsi untuk mengirim hanya Patient resource
// =====================================================
// DEBUG FUNCTIONS - Kirim Resource Satu Per Satu
// =====================================================

// Fungsi untuk mengirim hanya Patient resource
// =====================================================
// DEBUG FUNCTIONS - Kirim Resource Satu Per Satu
// =====================================================

// Fungsi untuk mengirim hanya Patient resource
async function sendPatientResourceOnly() {
  // Tambahkan UI state management
  sendingToBpjs.value = true
  bpjsSubmissionStatus.value = 'sending'

  try {
    // Validate selectedVisitData
    if (!selectedVisitData.value) {
      console.error('selectedVisitData.value is null - cannot proceed')
      toast.add({ icon: 'i-tabler-alert-circle', title: 'Error', description: 'Data kunjungan tidak lengkap', color: 'red' })
      bpjsSubmissionStatus.value = 'error'
      return null
    }

    // Load required data
    const patientData = visitDetails.value?.registrasi?.pasien || visitDetails.value?.pasien
    const regPeriksaData = visitDetails.value?.registrasi || visitDetails.value?.reg_periksa

    // Ambil no_ktp SEBELUM mendefinisikan 'data'
    const noKtpValue = selectedVisitData.value?.no_ktp ||
                       regPeriksaData?.no_ktp ||
                       patientData?.no_ktp ||
                       visitDetails.value?.pasien?.no_ktp || // Fallback tambahan
                       '0000000000000000' // Default value
    
    const data = {
      ...selectedVisitData.value,
      ...regPeriksaData,
      ...patientData,
      no_peserta: selectedVisitData.value?.no_kartu || regPeriksaData?.no_peserta || patientData?.no_peserta || '',
      no_ktp: noKtpValue, // Gunakan variabel yang sudah didefinisi
      // Pastikan data alamat dan telp ada di 'data' dari ...patientData
      no_tlp: regPeriksaData?.pasien?.no_tlp || patientData?.no_tlp || '080000000000',
      alamat: regPeriksaData?.pasien?.alamat || patientData?.alamat || 'Alamat Pasien',
      nm_kab: regPeriksaData?.pasien?.kabupaten?.nm_kab || patientData?.kabupaten?.nm_kab || 'Kabupaten',
      nm_kec: regPeriksaData?.pasien?.kecamatan?.nm_kec || patientData?.kecamatan?.nm_kec || 'Kecamatan',
      kd_pos: regPeriksaData?.pasien?.kd_pos || patientData?.kd_pos || '51161',
      // Pastikan tgl_lahir juga ter-fallback
      tgl_lahir: regPeriksaData?.pasien?.tgl_lahir || patientData?.tgl_lahir
    }

    // Validate required data
    if (!data.no_sep) {
      console.error('No SEP available - cannot proceed')
      toast.add({ icon: 'i-tabler-alert-circle', title: 'Error', description: 'No SEP tidak ditemukan', color: 'red' })
      bpjsSubmissionStatus.value = 'error'
      return null
    }

    const hospitalSetting = await loadHospitalSetting()
    const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
    const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
    const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'

    // Get jnspelayanan with same logic as other functions
    const jnsPelayananFromSEP = visitDetails.value?.sep?.jnsPelayanan
    const jnsPelayananFromReg = data.jnspelayanan || selectedVisitData.value?.jnspelayanan

    let jnsPelayanan = '1' // Default

    // Priority 1: Use from SEP data if available
    if (jnsPelayananFromSEP) {
      jnsPelayanan = jnsPelayananFromSEP
    }
    // Priority 2: Use directly if already '2' or '1', or map from text
    else if (jnsPelayananFromReg === '2' || jnsPelayananFromReg === '1') {
      jnsPelayanan = jnsPelayananFromReg
    }
    // Priority 3: Map from registration data ('Ralan' -> '2', 'Ranap' -> '1')
    else if (jnsPelayananFromReg === 'Ralan') {
      jnsPelayanan = '2'
    } else if (jnsPelayananFromReg === 'Ranap') {
      jnsPelayanan = '1'
    }

    console.log('🔍 JnsPelayanan Debug (sendPatientResourceOnly):', {
      'SEP.jnsPelayanan': jnsPelayananFromSEP,
      'Reg.jnspelayanan': jnsPelayananFromReg,
      'Final jnsPelayanan': jnsPelayanan,
      'Expected for Rawat Jalan': '2'
    })
    const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

    // =================================================================
    // PERBAIKAN: Mengembalikan "identifier.type.coding" menjadi ARRAY [ ... ]
    // =================================================================
    const patientResource = {
      resourceType: 'Patient',
      id: patientId,
      // "identifier" (Objek tunggal - SUDAH BENAR)
      identifier: {
        use: "official",
        type: {
          // "coding" KEMBALI MENJADI ARRAY
          coding: [{
            system: "http://hl7.org/fhir/v2/0203",
            code: "NNIDN"
          }],
          text: "NIK"
        },
        system: "https://fhir.kemkes.go.id/id/nik", // Ini mungkin harus urn:oid:KEMENDAGRI
        value: data.no_ktp,
        assigner: {
          display: "KEMENDAGRI"
        }
      },
      active: true,
      // "name" (Objek tunggal - SUDAH BENAR)
      name: { 
        use: "official",
        text: data.nm_pasien || data.nama_pasien || "Unknown Patient"
      },
      
      // "telecom" (Objek tunggal - SUDAH BENAR)
      telecom: {
        system: 'phone',
        value: data.no_tlp,
        use: 'home'
      },

      // "address" (Objek tunggal - SUDAH BENAR)
      address: {
         use: 'home',
         type: 'both',
         text: data.alamat,
         line: data.alamat, // (String tunggal - SUDAH BENAR)
         city: data.nm_kab,
         district: data.nm_kec,
         postalCode: data.kd_pos
      },
      
      gender: data.jk === 'L' ? 'male' : 'female',
      birthDate: data.tgl_lahir || '1900-01-01', // (Fallback - SUDAH BENAR)
      
      // =================================================
      // PENAMBAHAN: maritalStatus dan deceasedBoolean (dari bundle.json)
      // =================================================
      deceasedBoolean: false,
      maritalStatus: {
        coding: [{ // Sesuai bundle.json, 'coding' di sini adalah Array
            system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
            code: "M", // Asumsi 'M' (Married) atau 'U' (Unknown)
            display: "KAWIN"
        }]
      }
    }
    // =================================================================
    // AKHIR PERBAIKAN
    // =================================================================
    
    console.log('=== Sending Patient Resource Only (Fixed 10 - Hybrid coding + maritalStatus) ===')
    console.log('Patient Resource:', JSON.stringify(patientResource, null, 2))

    // Prepare BPJS request payload - direct Patient resource
    const currentDate = new Date()
    const payload = {
      request: {
        noSep: selectedVisitData.value.no_sep,
        jnsPelayanan: selectedVisitData.value.jnspelayanan || '1',
        bulan: String(currentDate.getMonth() + 1).padStart(2, '0'),
        tahun: String(currentDate.getFullYear()),
        dataMR: patientResource  // Send Patient resource directly (no Bundle wrapper)
      }
    }

    // Send to BPJS API
    const response = await $fetch(`${config.public.API_V2_URL}/bpjs/rekammedis/insert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log('BPJS Response (Patient Only):', response)
    
    // Handle response
    if (response && response.message) {
      const bpjsMetadata = response.bpjs_response?.metadata;
      const isActuallySuccess = bpjsMetadata?.code === '200';

      if (isActuallySuccess || bpjsMetadata?.message === 'Data Tidak Ditemukan') {
        const description = bpjsMetadata?.message === 'Data Tidak Ditemukan'
          ? 'Data Patient berhasil dikirim (SEP testing)'
          : 'Data Patient berhasil dikirim';

        toast.add({ icon: 'i-tabler-check', title: 'Berhasil (Patient Only)', description, color: 'green' })
        bpjsSubmissionStatus.value = 'success'
      } else {
        toast.add({ icon: 'i-tabler-alert-triangle', title: 'Warning (Patient Only)', description: `BPJS Response: ${bpjsMetadata?.message || 'Unknown error'}`, color: 'orange' })
        bpjsSubmissionStatus.value = 'error'
      }
    } else {
      throw new Error('Invalid response from BPJS API')
    }

    return response

  } catch (error: any) {
    console.error('Error sending Patient resource:', error)
    toast.add({ icon: 'i-tabler-alert-circle', title: 'Error (Patient Only)', description: error.message || 'Gagal mengirim data Patient ke BPJS', color: 'red' })
    bpjsSubmissionStatus.value = 'error'
    return null
  } finally {
    // Selalu matikan loading state
    sendingToBpjs.value = false
    // Reset status setelah 3 detik
    setTimeout(() => { bpjsSubmissionStatus.value = 'idle' }, 3000)
  }
}
// Make function globally accessible for testing
if (typeof window !== 'undefined') {
  window.sendPatientResourceOnly = sendPatientResourceOnly
}

/**
 * Helper function untuk memformat Date ke YYYY-MM-DDTHH:mm:ss+07:00 (ISO 8601 dengan timezone)
 * Sesuai format yang diterima BPJS (berdasarkan bundle-lengkap.json)
 */
/**
 * Helper function untuk memformat Date ke YYYY-MM-DD HH:mm:ss
 * Format ini lebih aman untuk sistem BPJS/SATUSEHAT legacy
 */
function formatBpjsDateTime(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Ubah dari format ISO (T...+07:00) menjadi spasi biasa
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Helper function untuk memformat Date ke YYYY-MM-DD HH:mm:ss (Format referensi BPJS)
 * Sesuai format jsonfhir.json
 */
function formatBpjsDateTimeLegacy(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// END OF DISABLED CODE

</script>