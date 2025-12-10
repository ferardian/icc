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
    <div id="section-riwayat-pemeriksaan" class="space-y-4">
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
            <template #jenis-data="{ row }">
              <UBadge
                :label="row.jnspelayanan == 1 ? 'Rawat Inap' : 'Rawat Jalan'"
                :color="row.jnspelayanan == 1 ? 'blue' : 'green'"
                variant="soft"
                size="xs"
              />
            </template>
            <template #poliklinik-data="{ row }">
              <span class="text-sm">{{ row.nmpolitujuan || '-' }}</span>
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

            <template #jenis-data="{ row }">
              <UBadge
                :label="row.jnspelayanan == 1 ? 'Rawat Inap' : 'Rawat Jalan'"
                :color="row.jnspelayanan == 1 ? 'blue' : 'green'"
                variant="soft"
                size="xs"
              />
            </template>

            <template #poliklinik-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.poliklinik?.nm_poli || '-' }}</span>
            </template>

            <template #dokter-data="{ row }">
              <span class="text-sm">{{ row.reg_periksa?.dokter?.nm_dokter || '-' }}</span>
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
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-1">
                  <span class="font-mono text-sm">{{ row.no_sep }}</span>
                  <UButton @click="copyToClipboard(row.no_sep)" variant="link" color="sky" size="xs" icon="i-tabler-copy" />
                </div>
                <!-- ERM BPJS Status Badge -->
                <div class="flex gap-1 items-center">
                  <!-- ERM BPJS Badge -->
                  <template v-if="row.no_sep && ermBpjsStatus[row.no_sep] === true">
                    <UTooltip text="ERM BPJS Terkirim (Status 200)" :popper="{ placement: 'top' }"
                      :ui="{ background: 'bg-emerald-200 dark:bg-emerald-900' }">
                      <UBadge size="xs" color="emerald" variant="subtle" class="flex items-center gap-1">
                        <UIcon name="i-tabler-file-check" class="text-emerald-400 h-4.5 w-4.5" />
                        ERM BPJS
                      </UBadge>
                    </UTooltip>
                  </template>
                  <!-- Manual Refresh Button for Debugging -->
                  <template v-else-if="row.no_sep">
                    <UButton
                      @click="() => refreshErmStatus(row.no_sep)"
                      size="xs"
                      color="gray"
                      variant="subtle"
                      :loading="isLoading(row.no_sep)"
                      class="text-xs">
                      <UIcon name="i-tabler-refresh" class="h-3 w-3" />
                    </UButton>
                  </template>
                  <!-- Loading ERM Status -->
                  <template v-else-if="row.no_sep && isLoading(row.no_sep)">
                    <UTooltip text="Checking ERM BPJS Status..." :popper="{ placement: 'top' }"
                      :ui="{ background: 'bg-amber-200 dark:bg-amber-900' }">
                      <UBadge size="xs" color="amber" variant="subtle" class="flex items-center gap-1">
                        <UIcon name="i-tabler-loader-2" class="text-amber-400 h-4.5 w-4.5 animate-spin" />
                        ERM
                      </UBadge>
                    </UTooltip>
                  </template>
                </div>
              </div>
            </template>

            <template #no_rawat-data="{ row }">
              <span class="font-mono text-xs">{{ row.no_rawat }}</span>
            </template>

            <template #jenis-data="{ row }">
              <UBadge
                :label="row.jnspelayanan == 1 ? 'Rawat Inap' : 'Rawat Jalan'"
                :color="row.jnspelayanan == 1 ? 'blue' : 'green'"
                variant="soft"
                size="xs"
              />
            </template>

            <template #poliklinik-data="{ row }">
              <!-- Fallback: gunakan data yang sudah ada di BridgingSep -->
              <span class="text-sm">{{
                row.reg_periksa?.poliklinik?.nm_poli ||
                row.poliklinik ||
                row.nmpolitujuan ||
                '-'
              }}</span>
            </template>

            <template #dokter-data="{ row }">
              <!-- Fallback: gunakan data yang sudah ada di BridgingSep -->
              <span class="text-sm">{{
                row.reg_periksa?.dokter?.nm_dokter ||
                row.dokter ||
                row.nmdpdjp ||
                row.nmdpjplayanan ||
                '-'
              }}</span>
            </template>

            <template #status_klaim-data="{ row }">
                  <ClientOnly>
                    <UBadge
                      variant="soft"
                      size="sm"
                      class="w-min"
                      :label="getKlaimStatusSync(row)"
                      :class="{
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': getKlaimStatusSync(row).toLowerCase() === 'sent',
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': getKlaimStatusSync(row).toLowerCase() !== 'sent'
                      }"
                    />
                  </ClientOnly>
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

    <!-- SIDEBAR COMPONENTS REMOVED -->

    <!-- ========================================= -->
    <!-- DETAIL PEMERIKSAAN & CODING SNOMED       -->
    <!-- ========================================= -->
    <div id="section-detail-pemeriksaan" v-if="selectedVisitData" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 ml-16 mt-5">
      <!-- Header Detail -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-xl border-b border-blue-200 dark:border-blue-800">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <UIcon name="i-tabler-file-description" class="w-5 h-5" />
            <h4 class="font-semibold">Detail Pemeriksaan & Coding SNOMED</h4>
          </div>
        </div>
      </div>

      <div class="p-6 space-y-4">
        <!-- Status Klaim Section -->
        <div class="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Status Klaim Kemenkes:</span>
            <UBadge
              :label="getKlaimStatusBadge(selectedVisitData)"
              :color="getKlaimStatusColor(selectedVisitData) as any"
              variant="soft"
              size="sm"
            />
          </div>
          <div v-if="getKlaimStatusSync(selectedVisitData) === 'sent'" class="text-xs text-blue-700 dark:text-blue-300">
            ✓ Detail ERM tersedia untuk ditinjau dan coding
          </div>
          <div v-else class="text-xs text-yellow-700 dark:text-yellow-300">
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

      <!-- Loading State - Show immediately when Detail is clicked -->
      <div v-if="selectedVisitData && loadingVisitDetails" class="flex justify-center items-center py-12">
        <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl mr-3 text-blue-500" />
        <span class="text-gray-600">Memuat detail pemeriksaan...</span>
      </div>
  

    <!-- FLOATING TAB NAVIGATION -->
      <div ref="floatingNav" class="fixed left-4 top-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 space-y-2 transition-all duration-300 opacity-0 invisible pointer-events-none">
        <!-- Detail Pemeriksaan -->
        <button
          @click="scrollToSection('detail-pemeriksaan')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'detail-pemeriksaan'
              ? 'bg-blue-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600'
          ]"
          :title="'Detail Pemeriksaan'"
        >
          <UIcon name="i-tabler-file-description" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Detail</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Detail Pemeriksaan
          </div>
        </button>

        <!-- Diagnosis -->
        <button
          @click="scrollToSection('diagnosis')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'diagnosis'
              ? 'bg-red-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600'
          ]"
          :title="'Diagnosis'"
        >
          <UIcon name="i-tabler-stethoscope" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Diagnosis</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Diagnosis ICD-10
          </div>
        </button>

        <!-- Procedures -->
        <button
          @click="scrollToSection('procedures')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'procedures'
              ? 'bg-purple-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600'
          ]"
          :title="'Prosedur'"
        >
          <UIcon name="i-tabler-bone" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Prosedur</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Prosedur ICD-9
          </div>
        </button>

        <!-- Pemeriksaan Rawat Jalan (SOAP) -->
        <button
          @click="scrollToSection('cppt-pemeriksaan-ralan')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'cppt-pemeriksaan-ralan'
              ? 'bg-blue-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600'
          ]"
          :title="'Pemeriksaan Rawat Jalan (SOAP)'"
        >
          <UIcon name="i-tabler-notes" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">SOAP-R</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Pemeriksaan Rawat Jalan (SOAP)
          </div>
        </button>

        <!-- Pemeriksaan Rawat Inap (SOAP) -->
        <button
          @click="scrollToSection('pemeriksaan-ranap')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'pemeriksaan-ranap'
              ? 'bg-green-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600'
          ]"
          :title="'Pemeriksaan Rawat Inap (SOAP)'"
        >
          <UIcon name="i-tabler-bed" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">SOAP-I</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Pemeriksaan Rawat Inap (SOAP)
          </div>
        </button>

        <!-- Laboratory -->
        <button
          @click="scrollToSection('laboratory')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'laboratory'
              ? 'bg-orange-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600'
          ]"
          :title="'Laboratorium'"
        >
          <UIcon name="i-tabler-test-pipe" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Lab</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Laboratorium
          </div>
        </button>

        <!-- Medications -->
        <button
          @click="scrollToSection('medications')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'medications'
              ? 'bg-green-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600'
          ]"
          :title="'Resep Obat'"
        >
          <UIcon name="i-tabler-pills" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Resep</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Resep Obat
          </div>
        </button>

        <!-- Billing -->
        <button
          @click="scrollToSection('tarif-dan-tindakan')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'tarif-dan-tindakan'
              ? 'bg-blue-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600'
          ]"
          :title="'Tarif dan Tindakan'"
        >
          <UIcon name="i-tabler-receipt" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Billing</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Tarif & Tindakan
          </div>
        </button>

        <!-- Radiology -->
        <button
          @click="scrollToSection('radiology')"
          :class="[
            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
            activeSection === 'radiology'
              ? 'bg-cyan-600 text-white shadow-lg scale-110'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/20 hover:text-cyan-600'
          ]"
          :title="'Radiologi'"
        >
          <UIcon name="i-tabler-x-ray" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">Radio</span>
          <!-- Tooltip -->
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Radiologi
          </div>
        </button>
      </div>

      <!-- Detail Content with left margin for floating nav -->
      <div v-if="selectedVisitData && !loadingVisitDetails && visitDetails" class="space-y-6 ml-16 mt-5" id="section-content">

        <!-- INFORMASI KUNJUNGAN (RAWAT INAP) -->
        <div id="section-informasi-kunjungan" v-if="visitDetails && visitDetails.kamar_inap && selectedVisitData && selectedVisitData.jnspelayanan == 1" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 rounded-t-xl border-b border-indigo-200 dark:border-indigo-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-hospital" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 class="font-semibold text-indigo-800 dark:text-indigo-200">Informasi Kunjungan</h4>
            </div>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Reason for Admission -->
              <div v-if="visitDetails.kamar_inap.diagnosa_awal" class="col-span-full">
                <div class="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
                  <UIcon name="i-tabler-clipboard-text" class="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div class="flex-1">
                    <h5 class="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Alasan Masuk (Reason for Admission)</h5>
                    <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ visitDetails.kamar_inap.diagnosa_awal }}</p>
                  </div>
                </div>
              </div>

              <!-- Informasi Kamar -->
              <div>
                <h5 class="font-medium text-indigo-800 dark:text-indigo-200 mb-2">Informasi Kamar</h5>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Kode Kamar:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ visitDetails.kamar_inap.kd_kamar || '-' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Kelas:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ visitDetails.kamar_inap.kelas || '-' }}</span>
                  </div>
                  <div v-if="visitDetails.kamar_inap.tgl_masuk" class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Tgl Masuk:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ new Date(visitDetails.kamar_inap.tgl_masuk).toLocaleDateString('id-ID') }}</span>
                  </div>
                </div>
              </div>

              <!-- Status Pulang -->
              <div>
                <h5 class="font-medium text-indigo-800 dark:text-indigo-200 mb-2">Status Pulang</h5>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Status:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ visitDetails.kamar_inap.stts_pulang || '-' }}</span>
                  </div>
                  <div v-if="visitDetails.kamar_inap.tgl_keluar" class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Tgl Keluar:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ new Date(visitDetails.kamar_inap.tgl_keluar).toLocaleDateString('id-ID') }}</span>
                  </div>
                  <div v-if="visitDetails.kamar_inap.lama" class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Lama:</span>
                    <span class="font-medium text-gray-900 dark:text-white">{{ visitDetails.kamar_inap.lama }} hari</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DIAGNOSA ICD-10 -->
          <div id="section-diagnosis" v-if="visitDetails && visitDetails.diagnosa && visitDetails.diagnosa.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
        <div id="section-procedures" v-if="visitDetails && visitDetails.prosedur && visitDetails.prosedur.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
        <div id="section-cppt-pemeriksaan-ralan" v-if="visitDetails && visitDetails.cppt_pemeriksaan_ralan && visitDetails.cppt_pemeriksaan_ralan.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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

        <!-- PEMERIKSAAN RAWAT INAP (SOAP) -->
        <div id="section-pemeriksaan-ranap" v-if="visitDetails && visitDetails.pemeriksaan_ranap" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div class="bg-green-50 dark:bg-green-900/20 px-6 py-4 rounded-t-xl border-b border-green-200 dark:border-green-800">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-bed" class="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 class="font-semibold text-green-800 dark:text-green-200">Pemeriksaan Rawat Inap (SOAP)</h4>
              </div>
              <UBadge
                v-if="visitDetails.pemeriksaan_ranap && visitDetails.pemeriksaan_ranap.length === 0"
                label="Data Kosong"
                color="yellow"
                size="sm"
                variant="soft"
              />
            </div>
          </div>
          <div class="p-6 space-y-4">
            <div v-for="(soap, index) in visitDetails.pemeriksaan_ranap" :key="`ranap-${index}`" class="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h5 class="font-semibold text-green-800 dark:text-green-200">
                    {{ soap.tgl_perawatan ? new Date(soap.tgl_perawatan).toLocaleDateString('id-ID') : 'Tanggal tidak tersedia' }}
                    {{ soap.jam_rawat ? `- ${soap.jam_rawat}` : '' }}
                  </h5>
                  <p class="text-sm text-green-700 dark:text-green-300">Dokter: {{ soap.petugas?.nama || soap.petugas?.nm_petugas || soap.nm_dokter || soap.kd_dokter || 'Tidak diketahui' }}</p>
                </div>
              </div>

              <!-- SOAP Components -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Subjective -->
                <div v-if="soap.keluhan" class="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <h6 class="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    <UIcon name="i-tabler-message-circle" class="inline w-4 h-4 mr-1" />
                    Subjective (Keluhan)
                  </h6>
                  <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ soap.keluhan }}</p>
                </div>

                <!-- Objective -->
                <div v-if="soap.pemeriksaan" class="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <h6 class="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    <UIcon name="i-tabler-search" class="inline w-4 h-4 mr-1" />
                    Objective (Pemeriksaan)
                  </h6>
                  <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ soap.pemeriksaan }}</p>
                </div>

                <!-- Assessment -->
                <div v-if="soap.penilaian" class="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <h6 class="font-medium text-orange-800 dark:text-orange-200 mb-2">
                    <UIcon name="i-tabler-brain" class="inline w-4 h-4 mr-1" />
                    Assessment (Penilaian)
                  </h6>
                  <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ soap.penilaian }}</p>
                </div>

                <!-- Plan -->
                <div v-if="soap.rtl" class="bg-white dark:bg-gray-700 p-3 rounded-lg">
                  <h6 class="font-medium text-purple-800 dark:text-purple-200 mb-2">
                    <UIcon name="i-tabler-clipboard-check" class="inline w-4 h-4 mr-1" />
                    Plan (Rencana Tindak Lanjut)
                  </h6>
                  <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ soap.rtl }}</p>
                </div>
              </div>

              <!-- Catatan Dokter -->
              <div v-if="soap.catatan_dokter" class="mt-4 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
                <h6 class="font-medium text-gray-800 dark:text-gray-200 mb-2">
                  <UIcon name="i-tabler-notes" class="inline w-4 h-4 mr-1" />
                  Catatan Penting
                </h6>
                <p class="text-sm text-gray-700 dark:text-gray-300">{{ soap.catatan_dokter }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- HASIL LABORATORIUM -->
              <div id="section-laboratory" v-if="visitDetails && visitDetails.lab && visitDetails.lab.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div class="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 rounded-t-xl border-b border-yellow-200 dark:border-yellow-800">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-tabler-flask" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h4 class="font-semibold text-yellow-800 dark:text-yellow-200">Hasil Laboratorium</h4>
              </div>
              <UButton
                icon="i-tabler-history"
                label="Riwayat Pemeriksaan Lab"
                color="blue"
                size="sm"
                variant="soft"
                @click="openLabHistoryModal"
              />
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
        </div>

        <!-- RESEP OBAT -->
         <div class="space-y-6 ml-16 mt-5">
          <div id="section-medications" v-if="resepObat && !loadingVisitDetails && resepObat.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
                <div class="flex items-center gap-3">
                  <!-- Statistik Rawat Jalan -->
                  <div v-if="resepSummary.ralanCount > 0" class="flex items-center gap-1 text-xs">
                    <UIcon name="i-tabler-user" class="w-4 h-4 text-blue-500" />
                    <span class="text-gray-600 dark:text-gray-400">{{ resepSummary.ralanCount }} Rawat Jalan</span>
                  </div>
                  <!-- Statistik Rawat Inap -->
                  <div v-if="resepSummary.ranapCount > 0" class="flex items-center gap-1 text-xs">
                    <UIcon name="i-tabler-bed" class="w-4 h-4 text-green-500" />
                    <span class="text-gray-600 dark:text-gray-400">{{ resepSummary.ranapCount }} Resep Pulang</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="p-6">
              <!-- Rawat Jalan - Group by no_resep -->
              <div v-if="processedResepObat.some(item => item.tipe_rawatan === 'Rawat Jalan')" class="space-y-6">
                <div class="bg-blue-50 dark:bg-blue-900/10 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h5 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <UIcon name="i-tabler-user" class="w-5 h-5 text-blue-500" />
                    Rawat Jalan
                    <UBadge
                      :label="`${processedResepObat.filter(item => item.tipe_rawatan === 'Rawat Jalan').length} Resep`"
                      color="blue"
                      variant="soft"
                      size="xs"
                      class="ml-2"
                    />
                  </h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Resep obat untuk pasien rawat jalan yang dikelompokkan berdasarkan nomor resep</p>
                </div>
                <div v-for="(resep, noResep) in processedResepObat.filter(item => item.tipe_rawatan === 'Rawat Jalan').reduce((groups, item) => {
                  const key = item.no_resep || 'no-resep';
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(item);
                  return groups;
                }, {})" :key="`ralan-${noResep}`" class="border-b dark:border-gray-700 pb-6 last:border-b-0">
                  <!-- Header Resep Rawat Jalan -->
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <h5 class="font-semibold text-gray-900 dark:text-white">No. Resep: {{ noResep === 'no-resep' ? (resep[0]?.no_resep || 'Tidak ada nomor resep') : noResep }}</h5>
                        <UBadge
                          :label="resep[0].status_resep || 'Belum Diberikan'"
                          :color="resep[0].status_resep === 'Selesai' ? 'green' : resep[0].status_resep === 'Diproses' ? 'yellow' : 'gray'"
                          variant="soft"
                          size="xs"
                        />
                      </div>
                      <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span class="font-medium">Dokter:</span> {{ resep[0].dokter_nama || '-' }}
                        </div>
                        <div>
                          <span class="font-medium">Tanggal Peresepan:</span>
                          {{ resep[0].tgl_peresepan && resep[0].tgl_peresepan !== '0000-00-00' ? new Date(resep[0].tgl_peresepan).toLocaleDateString('id-ID') : 'Tanggal Tidak Tersedia' }}
                          {{ (resep[0].jam_peresepan && resep[0].tgl_peresepan !== '0000-00-00') ? ' ' + resep[0].jam_peresepan : '' }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Detail Obat Rawat Jalan -->
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
                        <tr v-for="(obat, obatIndex) in resep" :key="`ralan-obat-${obatIndex}`" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td class="px-3 py-3">
                            <div>
                              <div class="font-medium text-gray-900 dark:text-white" :class="{ 'whitespace-pre-wrap': obat.is_racikan }">
                                {{ obat.display_nama_brng || obat.nama_brng || 'Nama obat tidak diketahui' }}
                              </div>
                              <div class="text-xs text-gray-500 dark:text-gray-400">{{ obat.kode_brng }}</div>
                              <div v-if="obat.kode_sat" class="text-xs text-gray-400">Satuan: {{ obat.kode_sat }}</div>
                              <div v-if="obat.no_batch" class="text-xs text-gray-400">Batch: {{ obat.no_batch }}</div>
                            </div>
                          </td>
                          <td class="px-3 py-3 text-center">
                            <span class="font-medium">{{ obat.jml }}</span>
                          </td>
                          <td class="px-3 py-3 text-center">
                            <span class="text-xs">{{ obat.kode_sat || '-' }}</span>
                          </td>
                          <td class="px-3 py-3">
                            <div v-if="obat.aturan_pakai">
                              <div class="text-xs">{{
                                typeof obat.aturan_pakai === 'string' ? obat.aturan_pakai :
                                (obat.aturan_pakai?.aturan || obat.aturan_pakai?.aturan_pakai || '-')
                              }}</div>
                              <div v-if="obat.aturan_pakai?.aturan_pakai_desc" class="text-xs text-gray-500 dark:text-gray-400">{{ obat.aturan_pakai.aturan_pakai_desc }}</div>
                            </div>
                            <span v-else class="text-xs text-gray-400">-</span>
                          </td>
                          <td class="px-3 py-3 text-right">
                            <div class="font-medium text-gray-900 dark:text-white">
                              Rp {{ formatCurrency(obat.total) }}
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
                            Rp {{ formatCurrency(resep.reduce((sum, obat) => sum + (obat.total || 0), 0)) }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Visual separator -->
              <div v-if="processedResepObat.some(item => item.tipe_rawatan === 'Rawat Jalan') && processedResepObat.some(item => item.tipe_rawatan === 'Rawat Inap')" class="my-6">
                <div class="flex items-center justify-center space-x-2">
                  <div class="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
                  <div class="text-sm text-gray-500 dark:text-gray-400 px-3 py-1">
                    <UIcon name="i-tabler-arrow-right" class="w-4 h-4" />
                  </div>
                  <div class="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
                </div>
              </div>

              <!-- Rawat Inap - Resep Pulang -->
              <div v-if="processedResepObat.some(item => item.tipe_rawatan === 'Rawat Inap')" class="space-y-6 mt-8">
                <div class="bg-green-50 dark:bg-green-900/10 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                  <h5 class="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <UIcon name="i-tabler-bed" class="w-5 h-5 text-green-500" />
                    Rawat Inap (Resep Pulang)
                    <UBadge
                      :label="`${processedResepObat.filter(item => item.tipe_rawatan === 'Rawat Inap').length} Obat`"
                      color="green"
                      variant="soft"
                      size="xs"
                      class="ml-2"
                    />
                  </h5>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Resep obat yang diberikan kepada pasien rawat inap saat pulang</p>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Obat</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jumlah</th>
                        <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Satuan</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dosis</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bangsal</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      <tr v-for="(obat, index) in processedResepObat.filter(item => item.tipe_rawatan === 'Rawat Inap')" :key="`ranap-obat-${index}`" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-3 py-3">
                          <div>
                            <div class="font-medium text-gray-900 dark:text-white" :class="{ 'whitespace-pre-wrap': obat.is_racikan }">
                              {{ obat.display_nama_brng || obat.nama_brng || 'Nama obat tidak diketahui' }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">{{ obat.kode_brng }}</div>
                            <div v-if="obat.kode_sat" class="text-xs text-gray-400">Satuan: {{ obat.kode_sat }}</div>
                            <div v-if="obat.no_batch" class="text-xs text-gray-400">Batch: {{ obat.no_batch }}</div>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="font-medium">{{ obat.jml }}</span>
                        </td>
                        <td class="px-3 py-3 text-center">
                          <span class="text-xs">{{ obat.kode_sat || '-' }}</span>
                        </td>
                        <td class="px-3 py-3">
                          <span class="text-xs">{{ obat.dosis || '-' }}</span>
                        </td>
                        <td class="px-3 py-3">
                          <span class="text-xs">{{ obat.nama_bangsal || '-' }}</span>
                        </td>
                        <td class="px-3 py-3 text-right">
                          <div class="font-medium text-gray-900 dark:text-white">
                            Rp {{ formatCurrency(obat.total) }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <td colspan="5" class="px-3 py-3 text-right font-medium">
                          Total Resep Pulang:
                        </td>
                        <td class="px-3 py-3 text-right font-bold text-green-600 dark:text-green-400">
                          Rp {{ formatCurrency(processedResepObat.filter(item => item.tipe_rawatan === 'Rawat Inap').reduce((sum, obat) => sum + (obat.total || 0), 0)) }}
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
         <div id="section-tarif-dan-tindakan" class="space-y-6 ml-16 mt-5">
                  <div v-if="procedureBilling  && !loadingVisitDetails && procedureBilling.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
                      :label="row.nama_petugas || row.jenis_petugas"
                      color="gray"
                      size="2xs"
                      variant="soft"
                    />
                  </div>
                  <!-- SNOMED Mapping Display -->
                  <div v-if="hasSnomedMapping(row)" class="mt-2">
                    <div class="bg-purple-50 dark:bg-purple-900/20 rounded p-2 border border-purple-200 dark:border-purple-800">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-tabler-code" class="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span class="text-xs text-purple-700 dark:text-purple-300 font-mono">
                            {{ getSnomedCode(row) }}
                          </span>
                          <span class="text-xs text-purple-600 dark:text-purple-400">
                            {{ getSnomedDisplay(row) }}
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
                  <div v-else-if="row.kd_jenis_prw && !hasSnomedMapping(row)" class="mt-2">
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
                  <p>{{ formatDate(row.waktu?.tgl_perawatan || row.tgl_perawatan) }}</p>
                  <p class="text-xs">{{ row.waktu?.jam_rawat || row.jam_rawat }}</p>
                </div>
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
        </div>

        

        <!-- RADIOLOGI -->
         <div class="space-y-6 ml-16 mt-5">
                <div v-if="visitDetails  && !loadingVisitDetails && visitDetails.radiologi" class="bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/10 dark:from-gray-800 dark:via-blue-900/10 dark:to-cyan-900/10 rounded-2xl shadow-lg border border-blue-200/50 dark:border-blue-700/50 overflow-hidden backdrop-blur-sm">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-800 dark:to-cyan-900 px-6 py-4 relative overflow-hidden">
            <div class="relative z-10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-tabler-file-text" class="w-5 h-5 text-white" />
                <div>
                  <h4 class="font-bold text-white text-base">Hasil Pemeriksaan Radiologi</h4>
                  <p class="text-blue-100 text-xs">Laporan Hasil Bacaan</p>
                </div>
              </div>
              <div class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                <span class="text-white text-xs font-medium">Selesai</span>
              </div>
            </div>
          </div>

          <!-- Main content -->
          <div class="pl-6 pr-6 pt-6 space-y-0">
            <!-- Pemeriksaan Info -->
            <div class="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-lg p-3 border border-cyan-100 dark:border-cyan-700/30">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-tabler-scan" class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span class="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Pemeriksaan</span>
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {{ Array.isArray(visitDetails.radiologi) && visitDetails.radiologi[0]?.jenis_perawatan?.nm_perawatan ? visitDetails.radiologi[0].jenis_perawatan.nm_perawatan : 'Thorax AP/PA' }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {{ Array.isArray(visitDetails.radiologi) && visitDetails.radiologi[0]?.tgl_periksa ? formatDate(visitDetails.radiologi[0].tgl_periksa) : formatDate(visitDetails.tgl_kunjungan) }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {{ Array.isArray(visitDetails.radiologi) && visitDetails.radiologi[0]?.jam ? `Pukul ${visitDetails.radiologi[0].jam}` : '' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="p-6 space-y-1">
            <!-- Hasil Bacaaan Section -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div class="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center gap-2 md:col-start">
                    <UIcon name="i-tabler-microscope" class="w-4 text-gray-600 dark:text-gray-400" />
                    <h5 class="font-semibold text-gray-800 dark:text-gray-100 text-sm">Hasil Bacaan</h5>
                  </div>
                </div>
              </div>
              </div>



              <div class="pt-4">
                <div v-if="visitDetails && visitDetails.radiologi" class="space-y-4">
                  <!-- Hasil Bacaan -->
                  <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div v-for="(line, index) in getRadiologyText(visitDetails.radiologi)" :key="index"
                           class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {{ line }}
                    </div>
                  </div>

                  <!-- Tabel Perbandingan Gambar -->
                  <div class="mt-6 bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div class="flex items-center gap-3 mb-4">
                      <UIcon name="i-tabler-photo" class="w-6 h-6 text-teal-600 dark:text-teal-400" />
                      <h5 class="font-semibold text-gray-800 dark:text-gray-100 text-lg">Gambar Radiologi</h5>
                    </div>

                    <div class="overflow-x-auto">
                      <table class="min-w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tanggal</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Jam</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Gambar</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Petugas</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(item, index) in visitDetails.radiologi" :key="index"
                              class="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {{ formatDate(item.tgl_periksa) }}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {{ item.jam }}
                            </td>
                            <td class="px-4 py-3 text-sm">
                              <div v-if="item.gambarRadiologi && item.gambarRadiologi.length > 0">
                                <div v-for="(gambar, gambarIndex) in item.gambarRadiologi" :key="gambarIndex"
                                     class="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                  <div class="flex items-center gap-3">
                                    <!-- Gambar dengan fitur preview -->
                                    <div class="flex-shrink-0">
                                      <div class="relative inline-block w-16 h-16">
                                        <img :src="gambar.lokasi_gambar"
                                             :alt="gambar.deskripsi || 'Gambar Radiologi'"
                                             @click="openImagePreview(gambar.lokasi_gambar, gambar.deskripsi || 'Gambar Radiologi')"
                                             class="w-full h-full object-contain rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200 bg-gray-50 dark:bg-gray-800"
                                             @load="handleImageLoad">
                                        <!-- Optional: Show loading state -->
                                        <div v-if="gambar.loading"
                                             class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-700/80 rounded-lg border border-gray-300 dark:border-gray-600">
                                          <div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        </div>
                                      </div>
                                    </div>

                                    <!-- Informasi Gambar -->
                                    <div class="flex-1 min-w-0">
                                      <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ gambar.deskripsi || 'Gambar Radiologi' }}</p>
                                      <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Klik gambar untuk preview</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div v-else class="text-sm text-gray-500 dark:text-gray-400">
                                Tidak ada gambar untuk pemeriksaan ini
                              </div>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {{ item.jenis_perawatan?.nm_perawatan || '-' }}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              <div v-if="item.dokter_perujuk" class="flex items-center gap-2">
                                <UIcon name="i-tabler-user" class="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                <div>
                                  <p class="text-sm font-medium">{{ item.dokter_perujuk }}</p>
                                  <p class="text-xs text-gray-600 dark:text-gray-400">Dokter Perujuk</p>
                                </div>
                              </div>
                              <div v-else class="text-gray-500 dark:text-gray-400">
                                -
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Default display if no data -->
                <div v-else class="text-center py-8">
                  <UIcon name="i-tabler-file-x" class="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada hasil pemeriksaan radiologi</p>
                  <!-- Debug: show available data -->
                  <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">DEBUG - Data yang tersedia:</p>
                    <pre class="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">{{ JSON.stringify(visitDetails, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>
            <div class="p-6 space-y-3">
            <!-- Footer -->
            <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <UIcon name="i-tabler-info-circle" class="w-3 h-3" />
                <span>Hasil pemeriksaan telah direview</span>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">Report ID: {{ visitDetails.no_rawat || 'N/A' }}</span>
            </div>
          </div>
          </div>
          </div>


        
        

        <!-- CATATAN TAMBAHAN -->
        <div v-if="visitDetails && visitDetails.cppt_catatan && visitDetails.cppt_catatan.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
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
        <div v-if="snomedSuggestions.length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 ml-16 mt-5">
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

      <!-- ========================================= -->
      <!-- BUNDLE RM DISPLAY SECTION                 -->
      <!-- ========================================= -->
       <div class="space-y-6 ml-16 mt-5">
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
                  icon="i-tabler-download"
                  label="Download JSON"
                  color="green"
                  variant="soft"
                  size="sm"
                  @click="downloadBundleAsJson"
                  :disabled="!currentBundle"
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

        <!-- Buttons Container -->
        <div class="flex gap-3">
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
        </div>

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

    <!-- ========================================= -->
    <!-- MODAL: RIWAYAT LABORATORIUM           -->
    <!-- ========================================= -->
    <UModal v-model="showLabHistoryModal" :ui="{ width: 'sm:max-w-7xl', height: 'h-screen', fullscreen: 'sm:h-full' }">
      <UCard class="overflow-y-auto max-h-screen">
        <template #header>
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UIcon name="i-tabler-flask" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Riwayat Pemeriksaan Laboratorium
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ selectedVisitData?.nama_pasien || 'Pasien' }} •
                  {{ selectedVisitData?.no_rkm_medis || selectedVisitData?.nomr || '-' }}
                </p>
              </div>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              size="sm"
              icon="i-tabler-x"
              @click="showLabHistoryModal = false"
            />
          </div>
        </template>

        <div class="p-6">
          <!-- Filter Section -->
          <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-100 dark:border-gray-700">
            <div class="flex items-center gap-2 mb-4">
              <UIcon name="i-tabler-filter" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 class="font-medium text-gray-900 dark:text-white">Filter Pemeriksaan</h4>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UIcon name="i-tabler-calendar-event" class="w-4 h-4 inline mr-1" />
                  Tanggal Dari
                </label>
                <UInput
                  v-model="labHistoryFilters.tanggalDari"
                  type="date"
                  placeholder="Pilih tanggal mulai"
                  :disabled="loadingLabHistory"
                  size="sm"
                  icon="i-tabler-calendar"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UIcon name="i-tabler-calendar-off" class="w-4 h-4 inline mr-1" />
                  Tanggal Sampai
                </label>
                <UInput
                  v-model="labHistoryFilters.tanggalSampai"
                  type="date"
                  placeholder="Pilih tanggal akhir"
                  :disabled="loadingLabHistory"
                  size="sm"
                  icon="i-tabler-calendar"
                />
              </div>
              <div class="flex items-end gap-2">
                <UButton
                  icon="i-tabler-search"
                  label="Cari"
                  color="blue"
                  :loading="loadingLabHistory"
                  @click="searchLabHistory"
                  size="sm"
                  class="px-4"
                />
                <UButton
                  icon="i-tabler-refresh"
                  variant="outline"
                  color="gray"
                  :loading="loadingLabHistory"
                  @click="() => { labHistoryFilters.tanggalDari = ''; labHistoryFilters.tanggalSampai = ''; searchLabHistory(); }"
                  size="sm"
                />
              </div>
              <div class="flex items-end">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  <UIcon name="i-tabler-info-circle" class="w-4 h-4 inline mr-1" />
                  {{ labHistoryPagination.totalRecords || 0 }} hasil ditemukan
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loadingLabHistory" class="text-center py-12">
            <div class="flex flex-col items-center">
              <UIcon name="i-tabler-loader-2" class="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p class="text-gray-600 dark:text-gray-400 font-medium">Mengambil data riwayat laboratorium...</p>
              <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">Mohon tunggu sebentar</p>
            </div>
          </div>

          <!-- Lab History Data -->
          <div v-else-if="labHistoryData.length > 0" class="space-y-6">
            <div v-for="(labItem, index) in labHistoryData" :key="`history-${index}`"
                 class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">

              <!-- Card Header -->
              <div class="p-4 border-b border-gray-100 dark:border-gray-700">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <UIcon name="i-tabler-microscope" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 class="font-semibold text-gray-900 dark:text-white text-base">
                        {{ labItem.jenis_perawatan?.nm_perawatan || 'Pemeriksaan Laboratorium' }}
                      </h4>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <UBadge
                        :label="labItem.status === 'Ranap' ? 'Rawat Inap' : labItem.status === 'Ralan' ? 'Rawat Jalan' : (labItem.status || 'Ralan')"
                        :color="labItem.status === 'Ranap' ? 'green' : 'blue'"
                        size="xs"
                        variant="soft"
                      />
                      <UBadge
                        :label="labItem.kategori || 'PK'"
                        color="gray"
                        size="xs"
                        variant="soft"
                      />
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        No. Rawat: {{ labItem.no_rawat || '-' }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right ml-4">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">
                      Rp {{ formatCurrency(labItem.biaya || 0) }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {{ new Date(`${labItem.tgl_periksa} ${labItem.jam}`).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card Body -->
              <div class="p-4">
                <!-- Medical Staff Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
                  <div v-if="labItem.dokter" class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <UIcon name="i-tabler-user" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">Dokter</div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ labItem.dokter.nm_dokter }}</div>
                    </div>
                  </div>
                  <div v-if="labItem.dokter_perujuk" class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <UIcon name="i-tabler-user-check" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">Dokter Perujuk</div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ labItem.dokter_perujuk.nm_dokter || labItem.dokter_perujuk }}</div>
                    </div>
                  </div>
                  <div v-if="labItem.registrasi?.poliklinik || labItem.poliklinik" class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <UIcon name="i-tabler-building-hospital" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">Poli</div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ labItem.registrasi?.poliklinik?.nm_poli || labItem.poliklinik?.nm_poli || '-' }}</div>
                    </div>
                  </div>
                  <div v-if="labItem.petugas" class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <UIcon name="i-tabler-clipboard" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">Petugas</div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ labItem.petugas.nama || labItem.petugas }}</div>
                    </div>
                  </div>
                </div>

                <!-- Lab Results -->
                <div v-if="labItem.detail_periksa_lab && labItem.detail_periksa_lab.length > 0">
                  <div class="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div class="flex items-center gap-2 mb-3">
                      <UIcon name="i-tabler-chart-dots" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h5 class="font-medium text-gray-900 dark:text-white">Hasil Pemeriksaan</h5>
                      <UBadge
                        :label="`${labItem.detail_periksa_lab.length} parameter`"
                        color="blue"
                        size="xs"
                        variant="soft"
                      />
                    </div>

                  <!-- Check if this is a grouped test (like Darah Lengkap) or individual parameters -->
                  <div v-if="isGroupedLabTest(labItem.detail_periksa_lab)" class="space-y-4">
                    <!-- Show main test info once -->
                    <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 class="font-semibold text-base text-gray-900 dark:text-white mb-2">
                        {{ labItem.jenis_perawatan?.nm_perawatan || 'Pemeriksaan Laboratorium' }}
                      </h4>
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        Total {{ labItem.detail_periksa_lab.length }} parameter
                      </div>
                    </div>

                    <!-- Individual parameter cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div v-for="detail in labItem.detail_periksa_lab" :key="detail.id_template || detail.no_detail || detail.id"
                           class="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start gap-3">
                          <div class="flex-1 min-w-0">
                            <h5 class="font-semibold text-sm text-gray-900 dark:text-white mb-1 truncate">
                              {{ getParameterName(detail) }}
                            </h5>
                            <div v-if="detail.keterangan || detail.catatan" class="text-xs text-gray-500 dark:text-gray-400">
                              {{ detail.keterangan || detail.catatan }}
                            </div>
                          </div>
                          <div class="text-right flex-shrink-0">
                            <div class="flex items-center gap-1 mb-1">
                              <span :class="[getResultSizeClass(), getResultColorClass(detail)]">{{ detail.nilai || '-' }}</span>
                              <span v-if="detail.satuan || detail.template?.satuan" class="text-xs text-gray-500 dark:text-gray-400">{{ detail.satuan || detail.template?.satuan }}</span>
                            </div>
                            <div v-if="detail.nilai_rujukan || detail.batas_bawah || detail.batas_atas" class="text-xs text-gray-500 dark:text-gray-400">
                              <span class="text-gray-400">Ref:</span>
                              {{ detail.nilai_rujukan || `${detail.batas_bawah || '-'} - ${detail.batas_atas || '-'}` }}
                            </div>
                            <!-- Status indicators -->
                            <div v-if="getParameterStatus(detail)" class="mt-1">
                              <UBadge
                                :label="getParameterStatus(detail)"
                                :color="getParameterStatusColor(detail)"
                                size="2xs"
                                variant="soft"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Single test display (not grouped) -->
                  <div v-else class="space-y-3">
                    <div v-for="detail in labItem.detail_periksa_lab" :key="detail.id_template || detail.no_detail || detail.id"
                         class="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div class="flex justify-between items-start gap-4">
                        <div class="flex-1 min-w-0">
                          <h4 class="font-semibold text-base text-gray-900 dark:text-white mb-1">
                            {{ getParameterName(detail) }}
                          </h4>
                          <div v-if="detail.keterangan || detail.catatan" class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {{ detail.keterangan || detail.catatan }}
                          </div>
                        </div>
                        <div class="flex flex-col items-end gap-1 text-right min-w-fit">
                          <div class="flex items-center gap-2">
                            <span :class="[getResultSizeClass(true), getResultColorClass(detail)]">{{ detail.nilai }}</span>
                            <span v-if="detail.satuan || detail.template?.satuan" class="text-sm text-gray-600 dark:text-gray-400">{{ detail.satuan || detail.template?.satuan }}</span>
                          </div>
                          <div v-if="detail.nilai_rujukan || detail.batas_bawah || detail.batas_atas" class="text-xs text-gray-500 dark:text-gray-400">
                            <span class="text-gray-400">Ref:</span>
                            {{ detail.nilai_rujukan || `${detail.batas_bawah || '-'} - ${detail.batas_atas || '-'}` }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
                <div v-else class="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div class="text-center py-3">
                    <UIcon name="i-tabler-dots" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p class="text-sm text-gray-500 dark:text-gray-400">Detail hasil pemeriksaan tidak tersedia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <div class="flex flex-col items-center">
              <div class="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <UIcon name="i-tabler-flask-off" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Tidak Ada Riwayat Pemeriksaan
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
                Belum ada riwayat pemeriksaan laboratorium untuk pasien ini pada periode yang dipilih.
              </p>
              <UButton
                icon="i-tabler-refresh"
                label="Coba Lagi"
                color="blue"
                variant="soft"
                @click="searchLabHistory"
                size="sm"
              />
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="labHistoryPagination.totalPages > 1" class="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {{ ((labHistoryPagination.currentPage - 1) * labHistoryPagination.perPage) + 1 }} -
              {{ Math.min(labHistoryPagination.currentPage * labHistoryPagination.perPage, labHistoryPagination.totalRecords) }}
              dari {{ labHistoryPagination.totalRecords }} hasil
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-tabler-chevron-left"
                size="sm"
                color="gray"
                variant="outline"
                :disabled="!labHistoryPagination.hasPrevPage || loadingLabHistory"
                @click="previousLabHistoryPage"
              >
                Sebelumnya
              </UButton>
              <div class="flex items-center gap-1">
                <span class="text-sm font-medium text-gray-900 dark:text-white px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  {{ labHistoryPagination.currentPage }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400">dari {{ labHistoryPagination.totalPages }}</span>
              </div>
              <UButton
                icon="i-tabler-chevron-right"
                size="sm"
                color="gray"
                variant="outline"
                :disabled="!labHistoryPagination.hasNextPage || loadingLabHistory"
                @click="nextLabHistoryPage"
              >
                Berikutnya
              </UButton>
            </div>
          </div>
        </div>
        <!-- Add bottom padding to prevent cutoff -->
        <div class="h-8"></div>
      </UCard>
    </UModal>

    </UCard>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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

// ERM BPJS Status composable
const { checkErmBpjsStatus, checkMultipleErmStatus, isLoading, clearCache } = useErmBpjsStatus()

// Manual refresh function for single SEP
const refreshErmStatus = async (noSep: string) => {
  if (!noSep) return

  console.log('🔄 Manual refresh ERM BPJS status for SEP:', noSep)

  // Clear cache for specific SEP
  clearCache(noSep)

  // Check status again
  try {
    const status = await checkErmBpjsStatus(noSep)
    ermBpjsStatus.value[noSep] = status

    // Update reactive state
    ermBpjsStatus.value = { ...ermBpjsStatus.value }

    console.log(`✅ Manual refresh result for ${noSep}:`, status)

    // Show toast
    toast.add({
      icon: status ? 'i-tabler-check' : 'i-tabler-x',
      title: status ? 'ERM BPJS Status: Terkirim' : 'ERM BPJS Status: Belum Terkirim',
      description: `Status untuk SEP ${noSep} telah diperbarui`,
      color: status ? 'green' : 'orange',
      timeout: 3000
    })
  } catch (error) {
    console.error('❌ Failed to refresh ERM status:', error)
    toast.add({
      icon: 'i-tabler-alert-triangle',
      title: 'Error',
      description: 'Gagal memperbarui status ERM BPJS',
      color: 'red',
      timeout: 3000
    })
  }
}

// Refresh all ERM status function
const refreshAllErmStatus = async () => {
  console.log('🔄 Refreshing all ERM BPJS status...')

  if (!props.data?.data || !Array.isArray(props.data.data)) {
    toast.add({
      icon: 'i-tabler-alert-triangle',
      title: 'No Data',
      description: 'Tidak ada data SEP untuk di-refresh',
      color: 'orange',
      timeout: 3000
    })
    return
  }

  // Get all SEPs
  const sepList = props.data.data
    .map((row: any) => row.no_sep)
    .filter(Boolean)

  if (sepList.length === 0) {
    toast.add({
      icon: 'i-tabler-alert-triangle',
      title: 'No SEP Found',
      description: 'Tidak ada SEP yang valid untuk di-refresh',
      color: 'orange',
      timeout: 3000
    })
    return
  }

  // Clear all cache
  sepList.forEach(sep => clearCache(sep))

  // Check all status
  try {
    const results = await checkMultipleErmStatus(sepList)
    const newStatus: Record<string, boolean> = {}
    results.forEach((status, noSep) => {
      newStatus[noSep] = status
    })

    ermBpjsStatus.value = { ...ermBpjsStatus.value, ...newStatus }

    const successCount = Object.values(newStatus).filter(Boolean).length
    console.log('✅ Refresh all ERM BPJS status results:', newStatus)

    toast.add({
      icon: 'i-tabler-refresh',
      title: 'Status Refreshed',
      description: `${successCount}/${sepList.length} SEP memiliki status ERM BPJS`,
      color: successCount > 0 ? 'green' : 'blue',
      timeout: 3000
    })
  } catch (error) {
    console.error('❌ Failed to refresh all ERM status:', error)
    toast.add({
      icon: 'i-tabler-alert-triangle',
      title: 'Error',
      description: 'Gagal memperbarui semua status ERM BPJS',
      color: 'red',
      timeout: 3000
    })
  }
}

// Reactive untuk menyimpan status ERM BPJS per SEP
const ermBpjsStatus = ref<Record<string, boolean>>({})

// Watch untuk changes in data dan check ERM status
watch(() => props.data, async (newData) => {
  if (newData?.data && Array.isArray(newData.data)) {
    const sepList = newData.data
      .map((row: any) => row.no_sep)
      .filter(Boolean) // Remove null/undefined

    if (sepList.length > 0) {
      const results = await checkMultipleErmStatus(sepList)
      const newStatus: Record<string, boolean> = {}
      results.forEach((status, noSep) => {
        newStatus[noSep] = status
      })
      ermBpjsStatus.value = { ...newStatus }
    }
  }
}, { immediate: true, deep: true })

// Enhanced Toast Functions dengan posisi tengah dan styling menarik
const showSuccessToast = (title: string, description?: string, options?: any) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-green-900/30 shadow-2xl rounded-2xl border border-green-200 dark:border-green-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-md mx-4 animate-bounce-in'
  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-pulse-once mx-auto sm:mx-0">
        <i class="i-tabler-circle-check text-white text-lg sm:text-xl"></i>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">${title}</h4>
        ${description ? `<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium break-words">${description}</p>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  // Auto remove after timeout
  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, options?.timeout || 3000)
}

const showErrorToast = (title: string, description?: string, options?: any) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-red-900/30 shadow-2xl rounded-2xl border border-red-200 dark:border-red-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-md mx-4 animate-shake-once'
  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-pulse mx-auto sm:mx-0">
        <i class="i-tabler-alert-circle text-white text-lg sm:text-xl"></i>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-lg font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">${title}</h4>
        ${description ? `<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium break-words">${description}</p>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  // Auto remove after timeout
  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, options?.timeout || 4000)
}

const showInfoToast = (title: string, description?: string, options?: any) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-blue-900/30 shadow-2xl rounded-2xl border border-blue-200 dark:border-blue-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-md mx-4 animate-bounce-in'
  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-spin-slow mx-auto sm:mx-0">
        <i class="i-tabler-info-circle text-white text-lg sm:text-xl"></i>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">${title}</h4>
        ${description ? `<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium break-words">${description}</p>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, options?.timeout || 3000)
}

const showWarningToast = (title: string, description?: string, options?: any) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-orange-900/30 shadow-2xl rounded-2xl border border-orange-200 dark:border-orange-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-md mx-4 animate-bounce-in'
  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-bounce mx-auto sm:mx-0">
        <i class="i-tabler-alert-triangle text-white text-lg sm:text-xl"></i>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">${title}</h4>
        ${description ? `<p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium break-words">${description}</p>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, options?.timeout || 3500)
}

const showBpjsSuccessToast = (description: string) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-gray-800 dark:via-green-900/30 dark:to-teal-900/30 shadow-2xl rounded-2xl border border-emerald-200 dark:border-emerald-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] max-w-md mx-4 animate-bounce-in'
  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-pulse mx-auto sm:mx-0">
        <span class="text-white text-lg sm:text-2xl">🎉</span>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">Sukses Kirim ke BPJS!</h4>
        <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium break-words">${description}</p>
        <div class="flex flex-col sm:flex-row gap-2 mt-3">
          <button onclick="document.getElementById('toast-${toastId}').remove(); console.log('BPJS success detail viewed')" class="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-105">
            Lihat Detail
          </button>
          <button onclick="document.getElementById('toast-${toastId}').remove()"
                  class="px-3 py-2 sm:px-4 sm:py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
            Tutup
          </button>
        </div>
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  // Auto remove after longer timeout for BPJS
  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, 8000) // Longer timeout for BPJS toast
}

const showBpjsErrorToast = (title: string, description: string, options?: any) => {
  const toastId = Date.now()
  const toastEl = document.createElement('div')
  toastEl.id = `toast-${toastId}`
  toastEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-gray-800 dark:via-red-900/30 dark:to-rose-900/30 shadow-2xl rounded-2xl border border-red-200 dark:border-red-700 backdrop-blur-md p-4 sm:p-6 w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw] max-w-2xl mx-4 animate-shake-once'

  // Format BPJS response JSON for display
  const formatBpjsResponse = (bpjsResponse: string) => {
    try {
      const parsed = JSON.parse(bpjsResponse)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return bpjsResponse
    }
  }

  const formattedResponse = options?.bpjs_response ? formatBpjsResponse(options.bpjs_response) : ''

  toastEl.innerHTML = `
    <div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
      <div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 drop-shadow-lg animate-pulse mx-auto sm:mx-0">
        <span class="text-white text-lg sm:text-2xl">❌</span>
      </div>
      <div class="flex-1 w-full text-center sm:text-left">
        <h4 class="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">${title}</h4>
        <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium whitespace-pre-line break-words">${description}</p>

        ${formattedResponse ? `
          <div class="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p class="text-xs font-mono text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">BPJS Response:</p>
            <pre class="text-xs font-mono text-gray-800 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto max-h-32 sm:max-h-40 overflow-y-auto break-all">${formattedResponse}</pre>
          </div>
        ` : ''}

        ${options?.error_code ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Error Code: ${options.error_code}</p>` : ''}
        ${options?.error_type ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Error Type: ${options.error_type}</p>` : ''}
      </div>
      <button onclick="document.getElementById('toast-${toastId}').remove()"
              class="absolute top-2 right-2 sm:relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
              title="Tutup notifikasi"
              aria-label="Tutup notifikasi">
        <i class="i-tabler-x text-base sm:text-lg"></i>
      </button>
    </div>
  `
  document.body.appendChild(toastEl)

  setTimeout(() => {
    const el = document.getElementById(`toast-${toastId}`)
    if (el) {
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -50%) scale(0.8)'
      setTimeout(() => el.remove(), 300)
    }
  }, options?.timeout || 8000) // Longer timeout for errors
}

// ========================================
// Loading state management for gambar radiologi
const gambarLoadingStates = ref({} as Record<string, boolean>)

const handleImageLoad = (event: Event) => {
  const target = event.target as HTMLImageElement
  const imageName = target.getAttribute('src') || ''

  // Add or update loading state for this specific image
  if (imageName) {
    gambarLoadingStates.value[imageName] = true
  }
}

const isGambarLoading = (imageName: string) => {
  return gambarLoadingStates.value[imageName] || false
}

const ermrDetails = ref<any>(null)
const isLoadingDetails = ref(false)
const ermDetails = ref<any>(null)
const visitDetails = ref<any>(null)
const selectedRowData = ref(null)
const selectedVisitData = ref(null)

const loadingVisitDetails = ref(false)

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
const billingSummary = ref<any>({
  total_procedures: 0,
  total_biaya: 0,
  by_jenis_petugas: [],
  by_status_rawat: [],
  by_status_bayar: []
})
const topProcedures = ref([] as any[])
const loadingBilling = ref(false)

// Resep Obat state
const loadingResep = ref(false)
const resepObat = ref([])
const resepSummary = ref({
  totalResep: 0,
  totalObat: 0,
  totalBiaya: 0,
  ralanCount: 0,
  ranapCount: 0
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

// Lab History refs
const showLabHistoryModal = ref(false)
const labHistoryData = ref<any[]>([])
const loadingLabHistory = ref(false)

// Navigation state for floating navigation
const activeSection = ref('diagnosis')
const floatingNav = ref<HTMLElement | null>(null)

// Handle scroll logic for floating navigation
function handleScroll() {
  if (!floatingNav.value) return

  const riwayatSection = document.getElementById('section-riwayat-pemeriksaan')
  if (!riwayatSection) return

  // Calculate the bottom position of the riwayat section
  const riwayatSectionBottom = riwayatSection.offsetTop + riwayatSection.offsetHeight
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop

  // Show floating navigation only when scrolled past the riwayat section
  if (scrollTop >= riwayatSectionBottom - 100) {
    // Make floating navigation visible with fixed positioning so it scrolls with content
    floatingNav.value.style.opacity = '1'
    floatingNav.value.style.visibility = 'visible'
    floatingNav.value.style.pointerEvents = 'auto'
    floatingNav.value.style.position = 'fixed' // Use fixed so it follows scroll
    floatingNav.value.style.top = '150px' // Position from top of viewport
    floatingNav.value.style.left = '16px' // Position on the far left of the page
    floatingNav.value.style.transform = 'translateY(0)' // No Y transform needed for fixed
  } else {
    // Hide floating navigation when scrolling back up to or before riwayat section
    floatingNav.value.style.opacity = '0'
    floatingNav.value.style.visibility = 'hidden'
    floatingNav.value.style.pointerEvents = 'none'
  }
}

// Scroll to section function
function scrollToSection(sectionId: string) {
  activeSection.value = sectionId

  // Scroll to section after a small delay for animation
  setTimeout(() => {
    let elementId = sectionId === 'detail-pemeriksaan' ? 'section-detail-pemeriksaan' : `section-${sectionId}`
    const element = document.getElementById(elementId)
    if (element) {
      // Find the section header within the element (h3, h2, or any title element)
      const headerElement = element.querySelector('h3, h2, .text-lg, .text-xl, .text-2xl, [class*="font-semibold"]')
      if (headerElement) {
        // Calculate position for the header with some offset for better visibility
        const headerPosition = headerElement.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = headerPosition - 80 // 80px offset for better visibility

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      } else {
        // Fallback to original behavior if no header found
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      // Trigger scroll listener to update floating navigation position
      handleScroll()
    }
  }, 100)
}
const labHistoryPagination = ref({
  currentPage: 1,
  totalPages: 0,
  totalRecords: 0,
  hasNextPage: false,
  hasPrevPage: false,
  perPage: 20
})
const labHistoryFilters = ref({
  tanggalDari: '',
  tanggalSampai: ''
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
  { key: 'jenis', label: 'Jenis' },
  { key: 'poliklinik', label: 'Poliklinik' },
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
  { key: 'actions', label: 'Aksi' }
]

const combinedColumns = [
  { key: 'no_sep', label: 'No. SEP' },
  { key: 'no_rawat', label: 'No. Rawat' },
  { key: 'jenis', label: 'Jenis' },
  { key: 'poliklinik', label: 'Poliklinik' },
  { key: 'dokter', label: 'Dokter' },
  { key: 'status_klaim', label: 'Status Klaim' },
  { key: 'actions', label: 'Aksi' }
]

const billingColumns = [
  { key: 'nm_perawatan', label: 'Tindakan' },
  { key: 'nama_petugas', label: 'Petugas' },
  { key: 'biaya_rawat', label: 'Biaya' },
  { key: 'waktu', label: 'Waktu' }
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

// Process prescription data to group racikan components
const processedResepObat = computed(() => {
  if (!resepObat.value) return []

  const result: any[] = []
  const racikanComponents = new Set<string>()

  // First pass: collect all racikan components and identify racikan headers
  const racikanHeaders = resepObat.value.filter((obat: any) =>
    obat.tipe_rawatan === 'Rawat Jalan' &&
    obat.status_resep === 'Racik' &&
    obat.racikan_detail &&
    obat.racikan_detail.length > 0
  )

  // Collect all component codes from racikan details for Rawat Jalan
  racikanHeaders.forEach((racikan: any) => {
    racikan.racikan_detail.forEach((detail: any) => {
      if (detail.kode_brng) {
        racikanComponents.add(detail.kode_brng)
      }
    })
  })

  // Second pass: process medications
  resepObat.value.forEach((obat: any) => {
    // If it's a racikan header, create display with detailed components
    if (obat.status_resep === 'Racik' && obat.racikan_detail && obat.racikan_detail.length > 0) {
      // Format racikan display with detailed component information
      const racikanName = obat.nama_brng
      const componentDetails = obat.racikan_detail.map((detail: any) => {
        // Extract dosage from kandungan field (e.g., "1 mg", "150 mg", etc.)
        let dosage = detail.kandungan || '-'
        // If kandungan contains multiple parts, extract the dosage part
        if (detail.kandungan && typeof detail.kandungan === 'string') {
          // Extract numeric values and units
          const dosageMatch = detail.kandungan.match(/(\d+\.?\d*)\s*(mg|mcg|g|ml|iu|unit)/i)
          if (dosageMatch) {
            dosage = `${dosageMatch[1]} ${dosageMatch[2]}`
          }
        }

        return `- ${detail.nama_brng || 'Tidak diketahui'} dosis ${dosage}, jml: ${detail.jml || 0}`
      }).filter(Boolean)

      const displayName = `Puyer ${racikanName}, isian:\n${componentDetails.join('\n   ')}`

      result.push({
        ...obat,
        display_nama_brng: displayName,
        is_racikan: true,
        // Store original quantity for racikan header
        original_jml: obat.jml
      })
    }
    // Skip individual components that are part of racikan for Rawat Jalan
    else if (obat.tipe_rawatan === 'Rawat Jalan' && racikanComponents.has(obat.kode_brng)) {
      // Skip this item - it's a component that will be shown as part of racikan header
      console.log(`🚫 Skipping racikan component: ${obat.nama_brng} (${obat.kode_brng})`)
    }
    // Non-racikan medication or Rawat Inap (keep individual components for Rawat Inap)
    else {
      result.push({
        ...obat,
        display_nama_brng: obat.nama_brng,
        is_racikan: false
      })
    }
  })

  return result
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
    showSuccessToast('✅ Tersalin!', 'Text berhasil disalin ke clipboard', {
      timeout: 2000
    })
  }
})

// Auto-load coding queue when component mounts and patient data is available
watch(() => currentPatient.value?.no_rkm_medis, (noRkmMedis) => {
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
 * Download bundle as JSON file
 */
function downloadBundleAsJson() {
  if (!currentBundle.value) {
    return
  }

  try {
    // Get patient information for filename
    const patientName = selectedVisitData.value?.nm_pasien || 'Unknown'
    const noSep = selectedVisitData.value?.no_sep || 'NoSEP'
    const noRawat = selectedVisitData.value?.no_rawat || 'NoRawat'

    // Create filename with timestamp (using noSep instead of patient name)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
    const filename = `FHIR-Bundle-${noSep}-${timestamp}.json`

    // Convert bundle to pretty JSON
    const bundleJson = JSON.stringify(currentBundle.value, null, 2)

    // Create blob
    const blob = new Blob([bundleJson], { type: 'application/json' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up URL
    URL.revokeObjectURL(url)

    // Show success toast
    useToast().add({
      title: 'Bundle Downloaded',
      description: `FHIR Bundle saved as ${filename}`,
      color: 'green'
    })
  } catch (error) {
    console.error('Error downloading bundle:', error)
    useToast().add({
      title: 'Download Error',
      description: 'Failed to download bundle as JSON',
      color: 'red'
    })
  }
}

/**
 * Fetch coding queue untuk pasien ini saja
 */
async function fetchCodingQueue() {
  if (!currentPatient.value?.no_rkm_medis) {
    return
  }

  loadingCodingQueue.value = true
  try {
    const { data: queueData, error } = await useFetch(
      `${config.public.API_V2_URL}/casemix/queue-by-patient`,
      {
        method: 'GET',
        params: {
          no_rkm_medis: currentPatient.value?.no_rkm_medis,
          status: codingStatusFilter.value
        },
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        },
        server: false // Force client-side to avoid SSR issues
      }
    )

    if (error.value) {
      console.error('Error fetching coding queue:', error.value)
      codingQueue.value = []
    } else {
      codingQueue.value = queueData.value?.data || []
    }
  } catch (err: any) {
    console.error('Error fetching coding queue:', err)
    codingQueue.value = []
    // Don't throw to prevent cascading errors
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

// SIDEBAR FUNCTIONS REMOVED

async function handleRowClick(row: any) {
  // Set selected visit data regardless of klaim status
  selectedVisitData.value = row
  selectedRowData.value = row
  sep.value = row.no_sep || ''
  noRawat.value = row.no_rawat || ''

  // Reset to diagnosis section for floating navigation
  activeSection.value = 'diagnosis'

  // Always fetch visit details and SNOMED data
  await fetchVisitDetails(row.no_sep)

  // Check klaim status and fetch ERM details if available
  const kemkesStatus = await getKlaimStatus(row)

  if (kemkesStatus === 'sent' && sep.value) {
    await fetchErmDetails(sep.value)
  } else {
    // Clear ERM details if klaim not sent
    ermDetails.value = null
  }

  // Check if this is rawat inap and fetch pemeriksaan ranap data
  const isRawatInap = row.jnspelayanan === '1' || row.jnspelayanan === 'Ranap' ||
                      (row.jnspelayanan && row.jnspelayanan.includes('Ranap'))

  console.log('🏥 Rawat Inap detection:', {
    'row.jnspelayanan': row.jnspelayanan,
    'row.no_sep': row.no_sep,
    'isRawatInap': isRawatInap
  })

  // Use SEP directly from row if available, fallback to visitDetails
  const sepNumber = row.no_sep || visitDetails.value?.sep?.no_sep || selectedVisitData.value?.no_sep

  if (isRawatInap && sepNumber) {
    console.log('🏥 Rawat Inap detected - pemeriksaan ranap data will be loaded from main API')
    console.log(`🔗 Using SEP number: ${sepNumber}`)

    // Data pemeriksaan ranap sudah di-load dari fetchVisitDetails() via API /erm/details/{no_sep}
    // Tidak perlu memanggil fetchPemeriksaanRanap() lagi
  } else {
    console.log('ℹ️ Not a rawat inap or no SEP available')
    console.log(`🔍 Details - isRawatInap: ${isRawatInap}, sepNumber: ${sepNumber}`)
  }

  // Show info about klaim status if not sent
  if (kemkesStatus !== 'sent') {
    showInfoToast('ℹ️ Status Klaim', kemkesStatus ? `Status klaim: ${kemkesStatus}` : 'Status klaim tidak tersedia. Detail ERM hanya tersedia jika status klaim sudah "sent".', {
      timeout: 5000
    })
  }

  // Auto scroll to detail section after a short delay to ensure content is rendered
  nextTick(() => {
    setTimeout(() => {
      const detailSection = document.getElementById('section-detail-pemeriksaan')
      if (detailSection) {
        detailSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 300)
  })
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

      // Console log untuk pemeriksaan radiologi dari backend
      if (visitDetails.value?.radiologi) {
        console.log('🏥 DATA RADIOLOGI DARI BACKEND:', visitDetails.value.radiologi)
        console.log('📋 Jumlah data radiologi:', Array.isArray(visitDetails.value.radiologi) ? visitDetails.value.radiologi.length : 'Bukan array')
        console.log('📊 Tipe data radiologi:', typeof visitDetails.value.radiologi)

        // Jika array, log detail setiap item
        if (Array.isArray(visitDetails.value.radiologi)) {
          visitDetails.value.radiologi.forEach((item: any, index: number) => {
            console.log(`📌 Radiologi item ${index + 1}:`, {
              jenis_perawatan: item.jenis_perawatan,
              tgl_periksa: item.tgl_periksa,
              hasil: item.hasil,
              kesan: item.kesan,
              dokter: item.dokter
            })
          })
        }
      } else {
        console.log('❌ Tidak ada data radiologi ditemukan')
      }

      // Load SNOMED suggestions and mappings
      await loadSNOMEDData(no_sep)
      console.log('About to call loadLabMappings...')
      // Load existing lab mappings
      await loadLabMappings()
      console.log('loadLabMappings completed')
      // Load procedure billing data (now includes SNOMED mappings)
      await loadProcedureBilling()

      // Map cppt_pemeriksaan to pemeriksaan_ranap for frontend compatibility
      if (visitDetails.value?.cppt_pemeriksaan) {
        visitDetails.value.pemeriksaan_ranap = visitDetails.value.cppt_pemeriksaan
        console.log('🔄 Mapped cppt_pemeriksaan to pemeriksaan_ranap:', {
          count: visitDetails.value.cppt_pemeriksaan.length,
          data: visitDetails.value.cppt_pemeriksaan.map((item: any) => ({
            ...item,
            doctor_name: item.petugas?.nama || item.petugas?.nm_petugas || item.nm_dokter || item.kd_dokter,
            petugas_data: item.petugas
          }))
        })
      }

      // Set resepObat directly from API response
      if (visitDetails.value?.obat) {
        resepObat.value = visitDetails.value.obat
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
 * Fetch pemeriksaan ranap data from sikrsia.pemeriksaan_ranap table
 * @deprecated - Data now loaded from main API /erm/details/{no_sep} via fetchVisitDetails()
 */
/*
async function fetchPemeriksaanRanap(sepNumber?: string) {
  console.log('🚀 fetchPemeriksaanRanap called with SEP:', sepNumber)
  
  // Try to get SEP number from multiple sources
  const actualSepNumber = sepNumber ||
                        visitDetails.value?.sep?.no_sep ||
                        selectedVisitData.value?.no_sep ||
                        visitDetails.value?.registrasi?.no_sep ||
                        sep.value

  console.log('🎯 Final SEP number to use:', actualSepNumber)

  if (!actualSepNumber) {
    console.log('❌ No SEP available for fetchPemeriksaanRanap')
    return
  }

  console.log(`🌐 Fetching from: ${config.public.API_V2_URL}/pemeriksaan/ranap/${actualSepNumber}`)

  try {
    const { data: pemeriksaanRanapData, error } = await $fetch(
      `${config.public.API_V2_URL}/pemeriksaan/ranap/${actualSepNumber}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStore.accessToken}`
        }
      }
    )

    if (error.value) {
      console.error("❌ Error fetching pemeriksaan ranap:", error.value)
      toast.add({
        icon: 'i-tabler-circle-x',
        title: 'Error',
        description: 'Gagal memuat detail pemeriksaan rawat inap. Hubungi administrator.',
        color: 'red',
        timeout: 5000
      })
      return
    }

    // Store pemeriksaan ranap data for FHIR integration
    console.log('📄 Raw API response:', pemeriksaanRanapData.value)
    const ranapData = (pemeriksaanRanapData.value as any)?.data || pemeriksaanRanapData.value
    console.log('✅ Loaded pemeriksaan ranap data:', ranapData)
    console.log('📊 Data type:', typeof ranapData)
    console.log('🔢 Data length:', ranapData?.length || 'N/A')

    // Add to visitDetails for easy access
    if (visitDetails.value) {
      // Force reactivity update
      visitDetails.value.pemeriksaan_ranap = ranapData

      // Force Vue to detect the change
      visitDetails.value = {...visitDetails.value}

      console.log('💾 Added to visitDetails.pemeriksaan_ranap:', visitDetails.value.pemeriksaan_ranap)
      console.log('🎯 Should show in UI?:', !!visitDetails.value.pemeriksaan_ranap)
      console.log('🎯 Array check:', Array.isArray(visitDetails.value.pemeriksaan_ranap))
      console.log('🎯 Length check:', visitDetails.value.pemeriksaan_ranap?.length || 0)

      // Force Vue update after a brief delay to ensure reactivity
      nextTick(() => {
        console.log('🔄 After nextTick - pemeriksaan_ranap:', visitDetails.value?.pemeriksaan_ranap)
      })
    } else {
      console.log('❌ visitDetails.value is null, cannot store pemeriksaan_ranap')
    }

  } catch (err) {
    console.error("Exception fetching pemeriksaan ranap:", err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Terjadi kesalahan saat memuat detail pemeriksaan rawat inap.',
      color: 'red',
      timeout: 5000
    })
  }
}
*/

/**
 * Fetch pemeriksaan ranap data for FHIR Bundle integration
 */
async function fetchPemeriksaanRanapFhir() {
  if (!visitDetails.value?.pemeriksaan_ranap) {
    console.log('No pemeriksaan ranap data available for FHIR integration')
    return
  }

  try {
    const ranapData = visitDetails.value.pemeriksaan_ranap as any[]
    console.log('🔄 Processing pemeriksaan ranap for FHIR Bundle:', ranapData)

    // Create FHIR resources for ranap SOAP notes
    const ranapSoapEntries = []

    if (ranapData && ranapData.length > 0) {
      for (const [index, soapData] of ranapData.entries()) {
        const soapResourceId = `${organizationId}-${index}-soap-${generateUUID()}`

        const ranapSoapResource = {
          resourceType: 'Composition',
          id: soapResourceId,
          status: 'final',
          type: {
            coding: [{
              system: "http://loinc.org",
              code: "11488-4",
              display: "Discharge summary (unstructured)"
            }]
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: patientName,
            noSep: visitDetails.value?.sep?.no_sep
          },
          date: soapData.tgl_perawatan || new Date().toISOString(),
          author: [{
            reference: `Practitioner/${practitionerId}`,
            display: practitionerName
          }],
          title: 'Resume Rawat Inap',
          confidentiality: 'N',
          section: {
            '0': {
              title: "Anamnesis",
              code: {
                coding: [{
                  system: "http://loinc.org",
                  code: "10164-2",
                  display: "History of Present Illness"
                }]
              },
              text: {
                status: "additional",
                div: soapData.suhu_tubuh || 'Tidak ada keluhan suhu'
              },
              entry: null
            },
            '1': {
              title: "Pemeriksaan Fisik",
              code: {
                coding: [{
                  system: "http://loinc.org",
                  code: "29545-1",
                  display: "Physical findings"
                }]
              },
              text: {
                status: "additional",
                div: soapData.pemeriksaan_fisik || 'Tidak ada pemeriksaan fisik'
              },
              entry: null
            },
            '2': {
              title: "Diagnosis",
              code: {
                coding: [{
                  system: "http://loinc.org",
                  code: "29548-5",
                  display: "Diagnostic results"
                }]
              },
              text: {
                status: "additional",
                div: soapData.diagnosa_utama || 'Tidak ada diagnosa'
              },
              entry: null
            },
            '3': {
              title: "Terapi",
              code: {
                coding: [{
                  system: "http://loinc.org",
                  code: "62303-7",
                  display: "Medication administration"
                }]
              },
              text: {
                status: "additional",
                div: soapData.rencana_terapi || 'Tidak ada rencana terapi'
              },
              entry: null
            },
            '4': {
              title: "Catatan Penting",
              code: {
                coding: [{
                  system: "http://loinc.org",
                  code: "55109-3",
                  display: "Reason for visit"
                }]
              },
              text: {
                status: "additional",
                div: soapData.catatan_dokter || 'Tidak ada catatan'
              },
              entry: null
            }
          }
        }

        ranapSoapEntries.push({
          resource: ranapSoapResource
        })

        console.log(`✅ Created Ranap SOAP Composition: ${soapResourceId}`)
      }
    }

    // Add ranap SOAP entries to finalEntries
    finalEntries.push(...ranapSoapEntries)

  } catch (err) {
    console.error("Error processing pemeriksaan ranap for FHIR:", err)
    toast.add({
      icon: 'i-tabler-circle-x',
      title: 'Error',
      description: 'Gagal memproses pemeriksaan rawat inap untuk FHIR.',
      color: 'red',
      timeout: 5000
    })
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

// ========================================
// LAB RESULTS HELPER FUNCTIONS
// ========================================

/**
 * Check if this is a grouped lab test (like blood count with multiple parameters)
 */
function isGroupedLabTest(details: any[]): boolean {
  if (!details || details.length <= 1) return false

  // Check if all items have the same template or are part of a comprehensive test
  const hasTemplateNames = details.some(d => d.Pemeriksaan || d.template_laboratorium?.Pemeriksaan)
  const hasIndividualNames = details.some(d => d.pemeriksaan || d.nama_pemeriksaan)

  // Grouped test typically has template names but individual parameter names
  return hasTemplateNames && hasIndividualNames && details.length > 3
}

/**
 * Get the proper parameter name from various possible fields
 */
function getParameterName(detail: any): string {
  // Simple: Use the same logic as labDetailColumns - template.Pemeriksaan
  return detail.template?.Pemeriksaan || 'Pemeriksaan'
}

/**
 * Get parameter name by index/sequence if no name is available
 */
function getParameterNameByIndex(detail: any): string | null {
  // Try to determine the parameter based on reference ranges or values
  const nilai = parseFloat(detail.nilai)
  const refRange = detail.nilai_rujukan || ''


}

/**
 * Get parameter status (H/L/N for high/low/normal)
 */
function getParameterStatus(detail: any): string | null {
  // Try different field names for status
  return detail.status ||
         detail.flag ||
         detail.indikator ||
         detail.keterangan_status ||
         null
}

/**
 * Get color for parameter status
 */
function getParameterStatusColor(detail: any): string {
  const status = getParameterStatus(detail)

  if (status) {
    const upperStatus = status.toString().toUpperCase()
    if (upperStatus === 'H' || upperStatus === 'HIGH') return 'red'
    if (upperStatus === 'L' || upperStatus === 'LOW') return 'blue'
    if (upperStatus === 'N' || upperStatus === 'NORMAL') return 'green'
  }

  return 'gray'
}

/**
 * Get color class for lab result value based on H/L indicators
 */
function getResultColorClass(detail: any): string {
  const nilai = (detail.nilai || '').toString().trim()
  const keterangan = (detail.keterangan || '').toString().trim()

  // Check for status/flag fields first
  const status = getParameterStatus(detail)
  if (status) {
    const upperStatus = status.toString().toUpperCase()
    if (upperStatus === 'H' || upperStatus === 'HIGH') {
      return 'text-red-600 dark:text-red-400 font-bold'
    }
    if (upperStatus === 'L' || upperStatus === 'LOW') {
      return 'text-blue-600 dark:text-blue-400 font-bold'
    }
  }

  // Check if nilai contains H or L (case insensitive)
  const upperNilai = nilai.toUpperCase()
  const upperKeterangan = keterangan.toUpperCase()

  // Check for H indicators
  if (upperNilai.includes('H') ||
      upperKeterangan.includes('H') ||
      upperNilai.includes('HIGH') ||
      upperKeterangan.includes('HIGH') ||
      upperNilai.includes('TINGGI')) {
    return 'text-red-600 dark:text-red-400 font-bold'
  }

  // Check for L indicators
  if (upperNilai.includes('L') ||
      upperKeterangan.includes('L') ||
      upperNilai.includes('LOW') ||
      upperKeterangan.includes('LOW') ||
      upperNilai.includes('RENDAH')) {
    return 'text-blue-600 dark:text-blue-400 font-bold'
  }

  return 'text-gray-900 dark:text-white'
}

/**
 * Get size class for lab result value
 */
function getResultSizeClass(isSingle: boolean = false): string {
  return isSingle ? 'text-2xl' : 'text-lg'
}

/**
 * Open lab history modal
 */
async function openLabHistoryModal() {
  // Coba dapatkan no_rkm_medis dari berbagai sumber
  const noRkmMedis = selectedVisitData.value?.no_rkm_medis ||
                     selectedVisitData.value?.regPeriksa?.no_rkm_medis ||
                     selectedVisitData.value?.pasien?.no_rkm_medis ||
                     selectedVisitData.value?.nomr

  console.log('🔍 DEBUG: Lab History Modal Data Source:', {
    noRkmMedis,
    selectedVisitData: selectedVisitData.value,
    fullDataStructure: JSON.stringify(selectedVisitData.value, null, 2)
  })

  if (!noRkmMedis) {
    toast.add({
      title: 'Error',
      description: 'Data pasien tidak ditemukan',
      color: 'red'
    })
    return
  }

  try {
    loadingLabHistory.value = true
    labHistoryPagination.value.currentPage = 1

    console.log('🌐 DEBUG: Making API request for lab history:', {
      url: `${config.public.API_V2_URL}/erm/riwayat-lab`,
      no_rkm_medis: noRkmMedis,
      limit: labHistoryPagination.value.perPage,
      page: labHistoryPagination.value.currentPage,
      filters: labHistoryFilters.value
    })

    const response = await $fetch(`${config.public.API_V2_URL}/erm/riwayat-lab`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      query: {
        no_rkm_medis: noRkmMedis,
        limit: labHistoryPagination.value.perPage,
        page: labHistoryPagination.value.currentPage,
        ...(labHistoryFilters.value.tanggalDari && { tanggal_dari: labHistoryFilters.value.tanggalDari }),
        ...(labHistoryFilters.value.tanggalSampai && { tanggal_sampai: labHistoryFilters.value.tanggalSampai })
      }
    })

    console.log('📊 DEBUG: Lab History API Response:', {
      success: response?.success,
      data: response?.data,
      pagination: response?.pagination,
      fullResponse: JSON.stringify(response, null, 2)
    })

    if (response.success) {
      labHistoryData.value = response.data
      labHistoryPagination.value = {
        ...labHistoryPagination.value,
        ...response.pagination
      }

      // Log structure of lab history data
      if (response.data && response.data.length > 0) {
        console.log('🔬 DEBUG: Lab History Data Structure:', {
          totalItems: response.data.length,
          firstItemKeys: Object.keys(response.data[0] || {}),
          firstItemSample: response.data[0],
          detailKeys: response.data[0]?.detail_periksa_lab ? Object.keys(response.data[0].detail_periksa_lab[0] || {}) : 'No detail_periksa_lab',
          sampleDetail: response.data[0]?.detail_periksa_lab?.[0] || 'No detail sample'
        })
      }

      showLabHistoryModal.value = true
    } else {
      toast.add({
        title: 'Error',
        description: response.message || 'Gagal mengambil data riwayat lab',
        color: 'red'
      })
    }
  } catch (error) {
    console.error('Error fetching lab history:', error)
    toast.add({
      title: 'Error',
      description: 'Terjadi kesalahan saat mengambil data riwayat lab',
      color: 'red'
    })
  } finally {
    loadingLabHistory.value = false
  }
}

/**
 * Search lab history with filters
 */
async function searchLabHistory() {
  // Coba dapatkan no_rkm_medis dari berbagai sumber
  const noRkmMedis = selectedVisitData.value?.no_rkm_medis ||
                     selectedVisitData.value?.regPeriksa?.no_rkm_medis ||
                     selectedVisitData.value?.pasien?.no_rkm_medis

  if (!noRkmMedis) {
    toast.add({
      title: 'Error',
      description: 'Data pasien tidak ditemukan',
      color: 'red'
    })
    return
  }

  try {
    loadingLabHistory.value = true
    labHistoryPagination.value.currentPage = 1

    const response = await $fetch(`${config.public.API_V2_URL}/erm/riwayat-lab`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      query: {
        no_rkm_medis: noRkmMedis,
        limit: labHistoryPagination.value.perPage,
        page: 1,
        ...(labHistoryFilters.value.tanggalDari && { tanggal_dari: labHistoryFilters.value.tanggalDari }),
        ...(labHistoryFilters.value.tanggalSampai && { tanggal_sampai: labHistoryFilters.value.tanggalSampai })
      }
    })

    if (response.success) {
      labHistoryData.value = response.data
      labHistoryPagination.value = {
        ...labHistoryPagination.value,
        ...response.pagination
      }
    } else {
      toast.add({
        title: 'Error',
        description: response.message || 'Gagal mengambil data riwayat lab',
        color: 'red'
      })
    }
  } catch (error) {
    console.error('Error searching lab history:', error)
    toast.add({
      title: 'Error',
      description: 'Terjadi kesalahan saat mengambil data riwayat lab',
      color: 'red'
    })
  } finally {
    loadingLabHistory.value = false
  }
}

/**
 * Go to next page of lab history
 */
async function nextLabHistoryPage() {
  if (!labHistoryPagination.value.hasNextPage || loadingLabHistory.value) return

  // Coba dapatkan no_rkm_medis dari berbagai sumber
  const noRkmMedis = selectedVisitData.value?.no_rkm_medis ||
                     selectedVisitData.value?.regPeriksa?.no_rkm_medis ||
                     selectedVisitData.value?.pasien?.no_rkm_medis ||
                     selectedVisitData.value?.nomr

  if (!noRkmMedis) {
    toast.add({
      title: 'Error',
      description: 'Data pasien tidak ditemukan',
      color: 'red'
    })
    return
  }

  try {
    loadingLabHistory.value = true
    const nextPage = labHistoryPagination.value.currentPage + 1

    const response = await $fetch(`${config.public.API_V2_URL}/erm/riwayat-lab`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      query: {
        no_rkm_medis: noRkmMedis,
        limit: labHistoryPagination.value.perPage,
        page: nextPage,
        ...(labHistoryFilters.value.tanggalDari && { tanggal_dari: labHistoryFilters.value.tanggalDari }),
        ...(labHistoryFilters.value.tanggalSampai && { tanggal_sampai: labHistoryFilters.value.tanggalSampai })
      }
    })

    if (response.success) {
      labHistoryData.value = response.data
      labHistoryPagination.value = {
        ...labHistoryPagination.value,
        currentPage: nextPage,
        ...response.pagination
      }
    }
  } catch (error) {
    console.error('Error loading next page:', error)
    toast.add({
      title: 'Error',
      description: 'Gagal memuat halaman selanjutnya',
      color: 'red'
    })
  } finally {
    loadingLabHistory.value = false
  }
}

/**
 * Go to previous page of lab history
 */
async function previousLabHistoryPage() {
  if (!labHistoryPagination.value.hasPrevPage || loadingLabHistory.value) return

  // Coba dapatkan no_rkm_medis dari berbagai sumber
  const noRkmMedis = selectedVisitData.value?.no_rkm_medis ||
                     selectedVisitData.value?.regPeriksa?.no_rkm_medis ||
                     selectedVisitData.value?.pasien?.no_rkm_medis ||
                     selectedVisitData.value?.nomr

  if (!noRkmMedis) {
    toast.add({
      title: 'Error',
      description: 'Data pasien tidak ditemukan',
      color: 'red'
    })
    return
  }

  try {
    loadingLabHistory.value = true
    const prevPage = labHistoryPagination.value.currentPage - 1

    const response = await $fetch(`${config.public.API_V2_URL}/erm/riwayat-lab`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      query: {
        no_rkm_medis: noRkmMedis,
        limit: labHistoryPagination.value.perPage,
        page: prevPage,
        ...(labHistoryFilters.value.tanggalDari && { tanggal_dari: labHistoryFilters.value.tanggalDari }),
        ...(labHistoryFilters.value.tanggalSampai && { tanggal_sampai: labHistoryFilters.value.tanggalSampai })
      }
    })

    if (response.success) {
      labHistoryData.value = response.data
      labHistoryPagination.value = {
        ...labHistoryPagination.value,
        currentPage: prevPage,
        ...response.pagination
      }
    }
  } catch (error) {
    console.error('Error loading previous page:', error)
    toast.add({
      title: 'Error',
      description: 'Gagal memuat halaman sebelumnya',
      color: 'red'
    })
  } finally {
    loadingLabHistory.value = false
  }
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
  const status = getKlaimStatusSync(row)
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
  const status = getKlaimStatusSync(row)
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

function getKlaimStatusSync(row: any): string {
  const sep = row.no_sep

  // If we've already processed this SEP, return cached result
  if (klaimStatusMap[sep]) {
    return klaimStatusMap[sep]
  }

  // Start async fetch in background if not already cached
  if (!klaimStatusMap[sep] && !klaimStatusMap[`${sep}_fetching`]) {
    klaimStatusMap[`${sep}_fetching`] = true
    getKlaimStatus(row)
  }

  // Return initial status based on available data (sync)
  let status = 'unsent'

  // Try to get status from send_klaim_res field in rsia_klaim_idrg table
  if (row?.rsia_klaim_idrg?.send_klaim_res) {
    try {
      // Parse the JSON response from send_klaim_res
      const klaimResponse = typeof row.rsia_klaim_idrg.send_klaim_res === 'string'
        ? JSON.parse(row.rsia_klaim_idrg.send_klaim_res)
        : row.rsia_klaim_idrg.send_klaim_res

      // Prioritize kemkes_dc_status first, then bpjs_dc_status
      if (klaimResponse?.kemkes_dc_status === 'sent') {
        status = 'sent'
      } else if (klaimResponse?.bpjs_dc_status === 'sent') {
        status = 'sent'
      } else if (klaimResponse?.kemkes_dc_status === 'pending' || klaimResponse?.bpjs_dc_status === 'pending') {
        status = 'pending'
      }
    } catch (error) {
      // Fallback to checking if send_klaim_res exists
      status = row.rsia_klaim_idrg.send_klaim_res ? 'sent' : 'unsent'
    }
  } else {
    // Last fallback: check if SEP exists in inacbg_data_terkirim table
    status = row?.inacbgDataTerkirim ? 'sent' : 'unsent'
  }

  return status
}

async function getKlaimStatus(row: any): Promise<string> {
  const sep = row.no_sep

  // If we've already processed this SEP, return cached result
  if (klaimStatusMap[sep] && klaimStatusMap[sep] !== 'loading') {
    return klaimStatusMap[sep]
  }

  // Set loading state
  klaimStatusMap[sep] = 'loading'

  
  let status = 'unsent'

  // First try to get status from API that provides kemkes_dc_status
  try {
    const config = useRuntimeConfig()
    const tokenStore = useAccessTokenStore()

    const response = await $fetch(`${config.public.API_V2_URL}/klaim/status/${sep}`, {
      headers: {
        Authorization: `Bearer ${tokenStore.accessToken}`
      }
    })

    if (response?.metadata?.code === 200 && response?.response?.data?.length > 0) {
      const klaimData = response.response.data[0]

      // Prioritize kemkes_dc_status first, then bpjs_dc_status
      if (klaimData?.kemkes_dc_status === 'sent') {
        status = 'sent'
      } else if (klaimData?.bpjs_dc_status === 'sent') {
        status = 'sent'
      } else if (klaimData?.kemkes_dc_status === 'pending' || klaimData?.bpjs_dc_status === 'pending') {
        status = 'pending'
      }
    }
  } catch (error) {
    // API failed, will use fallback methods
  }

  // If API fails, try to get status from rsia_klaim_idrg table
  if (status === 'unsent' && row?.rsia_klaim_idrg) {
    // Try send_klaim_res first (if it exists in future)
    if (row.rsia_klaim_idrg.send_klaim_res) {
      try {
        const klaimResponse = typeof row.rsia_klaim_idrg.send_klaim_res === 'string'
          ? JSON.parse(row.rsia_klaim_idrg.send_klaim_res)
          : row.rsia_klaim_idrg.send_klaim_res

        if (klaimResponse?.kemkes_dc_status === 'sent') {
          status = 'sent'
        } else if (klaimResponse?.bpjs_dc_status === 'sent') {
          status = 'sent'
        } else if (klaimResponse?.kemkes_dc_status === 'pending' || klaimResponse?.bpjs_dc_status === 'pending') {
          status = 'pending'
        }
      } catch (error) {
        // Error parsing send_klaim_res, continue to fallback
      }
    }

    // If still unsent, check final_res for success indication
    if (status === 'unsent' && row.rsia_klaim_idrg.final_res) {
      try {
        const finalResponse = typeof row.rsia_klaim_idrg.final_res === 'string'
          ? JSON.parse(row.rsia_klaim_idrg.final_res)
          : row.rsia_klaim_idrg.final_res

        // If final_res shows success, assume sent
        if (finalResponse?.metadata?.code === 200) {
          status = 'sent'
        }
      } catch (error) {
        // If final_res exists but can't parse, assume sent
        status = row.rsia_klaim_idrg.final_res ? 'sent' : 'unsent'
      }
    }

    // If still unsent, check set_claim_res for success indication
    if (status === 'unsent' && row.rsia_klaim_idrg.set_claim_res) {
      try {
        const setResponse = typeof row.rsia_klaim_idrg.set_claim_res === 'string'
          ? JSON.parse(row.rsia_klaim_idrg.set_claim_res)
          : row.rsia_klaim_idrg.set_claim_res

        // If set_claim_res shows success, assume sent
        if (setResponse?.metadata?.code === 200) {
          status = 'sent'
        }
      } catch (error) {
        // If set_claim_res exists but can't parse, assume sent
        status = row.rsia_klaim_idrg.set_claim_res ? 'sent' : 'unsent'
      }
    }
  }

  // Last fallback: check if SEP exists in inacbg_data_terkirim table
  if (status === 'unsent') {
    status = row?.inacbgDataTerkirim ? 'sent' : 'unsent'
  }

  // Cache the result
  klaimStatusMap[sep] = status
  delete klaimStatusMap[`${sep}_fetching`]
  return status
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

// Helper functions for radiology section
function parseRadiologyFindings(findings: string | any) {
  if (!findings) return []

  // Handle both string and object types
  let content = ''
  if (typeof findings === 'string') {
    content = findings
  } else if (findings && typeof findings === 'object') {
    content = findings.hasil || findings.toString()
  } else {
    content = String(findings)
  }

  // Split by lines and filter out empty lines
  const lines = content.split('\n').filter(line => line.trim())

  return lines.map((line, index) => {
    let type = 'normal'
    let text = line.trim()

    // Classify findings based on keywords
    if (text.toLowerCase().includes('infiltrat') ||
        text.toLowerCase().includes('opasitas') ||
        text.toLowerCase().includes('pemadatan')) {
      type = 'abnormal'
    } else if (text.toLowerCase().includes('tak tampak') ||
               text.toLowerCase().includes('normal') ||
               text.toLowerCase().includes('intact')) {
      type = 'normal'
    } else if (text.toLowerCase().includes('tampak')) {
      type = 'finding'
    } else if (text.includes('-')) {
      type = 'observation'
    }

    return { type, text, index }
  })
}

function getFindingColor(type: string): string {
  switch (type) {
    case 'abnormal':
      return 'bg-red-500'
    case 'finding':
      return 'bg-yellow-500'
    case 'observation':
      return 'bg-blue-500'
    case 'normal':
    default:
      return 'bg-green-500'
  }
}

function formatRadiologyText(text: string | any) {
  if (!text) return ''

  // Handle both string and object types
  let content = ''
  if (typeof text === 'string') {
    content = text
  } else if (text && typeof text === 'object') {
    content = text.hasil || text.toString()
  } else {
    content = String(text)
  }

  // Convert plain text to formatted HTML with medical styling
  let formatted = content
    // Replace bullet points with styled bullets
    .replace(/^- (.+)/g, '<li class="ml-4 mb-2">• $1</li>')
    // Replace keywords with highlights
    .replace(/\b(infiltrat|opasitas|pemadatan|air bronchogram|limfonodi|pneumonia|thymus)\b/gi,
      '<span class="font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1 rounded">$1</span>')
    // Replace anatomical terms
    .replace(/\b(suprahillar|parahillar|hilus|diafragma|cor|thorax|pulmo|bilateral)\b/gi,
      '<span class="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 rounded">$1</span>')
    // Format kesan section
    .replace(/(Kesan:)/g, '<span class="font-bold text-orange-600 dark:text-orange-400">$1</span>')
    // Replace line breaks
    .replace(/\n/g, '<br>')

  // Wrap in list if bullet points detected
  if (formatted.includes('<li')) {
    formatted = '<ul class="list-disc space-y-1">' + formatted + '</ul>'
  }

  return formatted
}

function extractImpression(text: string | any) {
  if (!text) return ''

  // Handle array of radiology objects
  let content = ''
  if (Array.isArray(text)) {
    // Get the first item's hasil_radiologi or concatenate all
    if (text.length > 0 && text[0]?.hasil_radiologi?.hasil) {
      content = text[0].hasil_radiologi.hasil
    } else if (text.length > 0 && text[0]?.hasil) {
      content = text[0].hasil
    } else {
      return 'Tidak ada kesan radiologi'
    }
  } else if (typeof text === 'string') {
    content = text
  } else if (text && typeof text === 'object') {
    content = text.hasil || text.toString()
  } else {
    content = String(text)
  }

  // Extract "Kesan:" section from radiology text
  const kesanMatch = content.match(/Kesan:\s*([\s\S]*?)(?=\n\n|$)/)
  if (kesanMatch) {
    return kesanMatch[1].trim()
  }

  // Alternative: look for conclusion patterns
  const conclusionPatterns = [
    /kesan[:\s]*([\s\S]*?)(?=\n\n|$)/i,
    /kesimpulan[:\s]*([\s\S]*?)(?=\n\n|$)/i,
    /conclusion[:\s]*([\s\S]*?)(?=\n\n|$)/i,
  ]

  for (const pattern of conclusionPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return content.split('\n').slice(-3).join(' ').trim() // Last few lines as fallback
}

function extractConclusionFromText(textArray: string[]): string {
  if (!textArray || textArray.length === 0) return ''

  // Join the array into a single string for processing
  const fullText = textArray.join('\n')

  // Use the same logic as extractImpression but work with the joined text
  let content = fullText

  // Extract "Kesan:" section from radiology text
  const kesanMatch = content.match(/Kesan:\s*([\s\S]*?)(?=\n\n|$)/)
  if (kesanMatch) {
    return kesanMatch[1].trim()
  }

  // Alternative: look for conclusion patterns
  const conclusionPatterns = [
    /kesan[:\s]*([\s\S]*?)(?=\n\n|$)/i,
    /kesimpulan[:\s]*([\s\S]*?)(?=\n\n|$)/i,
    /conclusion[:\s]*([\s\S]*?)(?=\n\n|$)/i,
  ]

  for (const pattern of conclusionPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  // Fallback: return the first line or a short excerpt
  return content.split('\n')[0].trim() || 'Impressi radiologi'
}

function getLineType(line: string): string {
  if (!line) return 'normal'

  const lowerLine = line.toLowerCase().trim()

  // Classify findings based on keywords
  if (lowerLine.includes('infiltrat') ||
      lowerLine.includes('opasitas') ||
      lowerLine.includes('pemadatan')) {
    return 'abnormal'
  } else if (lowerLine.includes('tak tampak') ||
             lowerLine.includes('normal') ||
             lowerLine.includes('intact') ||
             lowerLine.includes('tidak tampak')) {
    return 'normal'
  } else if (lowerLine.includes('tampak') ||
             lowerLine.includes('terlihat') ||
             lowerLine.includes('terlihat')) {
    return 'finding'
  } else if (lowerLine.includes('-')) {
    return 'observation'
  }

  return 'finding'
}

function getRadiologyText(text: string | any): string[] {
  if (!text) return []

  let content = ''

  // Handle array of radiology objects
  if (Array.isArray(text)) {
    // Get the first item's hasil_radiologi or concatenate all
    if (text.length > 0 && text[0]?.hasil_radiologi?.hasil) {
      content = text[0].hasil_radiologi.hasil
    } else if (text.length > 0 && text[0]?.hasil) {
      content = text[0].hasil
    } else {
      return ['Data radiologi tidak tersedia']
    }
  } else if (typeof text === 'string') {
    content = text
  } else if (text && typeof text === 'object') {
    content = text.hasil || text.toString()
  } else {
    content = String(text)
  }

  // Split by lines and filter out empty lines
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

function copyRadiologyResults() {
  try {
    const text = visitDetails.value?.radiologi || ''
    if (typeof text === 'object' && text.hasil) {
      navigator.clipboard.writeText(text.hasil)
    } else if (typeof text === 'string') {
      navigator.clipboard.writeText(text)
    }
    // You could show a toast notification here
    console.log('Radiology results copied to clipboard')
  } catch (error) {
    console.error('Failed to copy radiology results:', error)
  }
}

function printRadiologyResults() {
  try {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const text = visitDetails.value?.radiologi || ''
    let content = ''

    if (typeof text === 'object' && text.hasil) {
      content = text.hasil
    } else if (typeof text === 'string') {
      content = text
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Hasil Radiologi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Hasil Pemeriksaan Radiologi</h1>
          <p><strong>Tanggal:</strong> ${formatDate(visitDetails.value?.tgl_kunjungan || '')}</p>
          <p><strong>Pasien:</strong> ${visitDetails.value?.nm_pasien || 'N/A'}</p>
          <p><strong>No. RM:</strong> ${visitDetails.value?.no_rkm_medis || 'N/A'}</p>
          <hr>
          <pre>${content}</pre>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  } catch (error) {
    console.error('Failed to print radiology results:', error)
  }
}

function openImagePreview(imageUrl: string, title: string = 'Gambar Radiologi') {
  try {
    // Create modal overlay
    const modal = document.createElement('div')
    modal.id = 'image-preview-modal'
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in'

    // Create modal content with better initial size
    const modalContent = document.createElement('div')
    modalContent.className = 'relative w-[90vw] h-[85vh] max-w-6xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col'

    // Create header with zoom controls
    const header = document.createElement('div')
    header.className = 'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0'
    header.innerHTML = `
      <div class="flex items-center gap-4">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${title}</h3>
        <div class="flex items-center gap-2">
          <button id="open-new-tab" class="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 hover:bg-green-600 active:scale-95" title="Buka gambar asli di tab baru (Ctrl+O)">
            <i class="i-tabler-external-link"></i>
            <span class="hidden sm:inline">Buka Asli</span>
          </button>
          <button id="zoom-in" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors" title="Zoom in (+)">
            <i class="i-tabler-zoom-in"></i>
          </button>
          <button id="zoom-out" class="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors" title="Zoom out (-)">
            <i class="i-tabler-zoom-out"></i>
          </button>
          <button id="zoom-reset" class="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors" title="Reset zoom (0)">
            <i class="i-tabler-zoom-reset"></i>
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400" id="zoom-level">100%</span>
        </div>
      </div>
      <button onclick="document.getElementById('image-preview-modal')?.remove()"
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
        <i class="i-tabler-x text-gray-600 dark:text-gray-400"></i>
      </button>
    `

    // Create image container with proper scrolling for original size
    const imageContainer = document.createElement('div')
    imageContainer.className = 'flex-1 overflow-auto relative bg-gray-100 dark:bg-gray-900 p-4'

    // Create container for original size image (no auto-scaling)
    const imageWrapper = document.createElement('div')
    imageWrapper.className = 'inline-block relative'
    imageWrapper.style.minWidth = 'min-content'
    imageWrapper.style.minHeight = 'min-content'
    imageWrapper.style.transformOrigin = 'center center'
    imageWrapper.style.transition = 'transform 0.2s ease-out'

    // Create image with original size
    const img = document.createElement('img')
    img.src = imageUrl
    img.alt = title
    img.className = 'block'  // Remove size constraints to show original size
    img.style.cursor = 'grab'
    img.style.userSelect = 'none'
    img.draggable = false
    img.style.width = 'auto'    // Use original width
    img.style.height = 'auto'   // Use original height

    // Zoom state
    let zoomLevel = 1
    let isDragging = false
    let startX = 0
    let startY = 0
    let scrollLeft = 0
    let scrollTop = 0

    // Zoom functions
    const updateZoom = () => {
      const zoomPercent = Math.round(zoomLevel * 100)
      document.getElementById('zoom-level').textContent = `${zoomPercent}%`
      imageWrapper.style.transform = `scale(${zoomLevel})`
      imageWrapper.style.transformOrigin = 'top left'
    }

    const zoomIn = () => {
      if (zoomLevel < 3) {
        zoomLevel = Math.min(zoomLevel + 0.25, 3)
        updateZoom()
      }
    }

    const zoomOut = () => {
      if (zoomLevel > 0.5) {
        zoomLevel = Math.max(zoomLevel - 0.25, 0.5)
        updateZoom()
      }
    }

    const resetZoom = () => {
      zoomLevel = 1
      imageWrapper.style.transform = `scale(1)`
      imageContainer.scrollLeft = 0
      imageContainer.scrollTop = 0
      updateZoom()
    }

    // Add image load and error handlers
    img.onload = () => {
      // Hide loading indicator
      const loadingEl = imageContainer.querySelector('.loading-indicator')
      if (loadingEl) {
        loadingEl.remove()
      }

      // Reset zoom to 1 and ensure proper fit on load
      zoomLevel = 1
      imageWrapper.style.transform = `scale(1)`
      imageContainer.scrollLeft = 0
      imageContainer.scrollTop = 0
      updateZoom()
    }

    img.onerror = () => {
      imageContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div class="text-center">
            <i class="i-tabler-photo-off text-6xl mb-4"></i>
            <p class="text-lg font-medium mb-2">Gambar tidak dapat dimuat</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 break-all">${imageUrl}</p>
          </div>
        </div>
      `
    }

    // Mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        zoomIn()
      } else {
        zoomOut()
      }
    }

    // Drag to pan
    const startDrag = (e: MouseEvent) => {
      isDragging = true
      startX = e.pageX - imageContainer.scrollLeft
      startY = e.pageY - imageContainer.scrollTop
      img.style.cursor = 'grabbing'
    }

    const drag = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      const x = e.pageX - startX
      const y = e.pageY - startY
      imageContainer.scrollLeft = scrollLeft - x
      imageContainer.scrollTop = scrollTop - y
    }

    const endDrag = () => {
      isDragging = false
      img.style.cursor = 'grab'
      scrollLeft = imageContainer.scrollLeft
      scrollTop = imageContainer.scrollTop
    }

    // Add loading indicator
    imageContainer.innerHTML = `
      <div class="loading-indicator flex items-center justify-center">
        <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    `

    // Assemble modal
    imageWrapper.appendChild(img)

    // Add keyboard shortcuts helper
    const shortcutsInfo = document.createElement('div')
    shortcutsInfo.className = 'text-xs text-gray-500 dark:text-gray-400 mt-3 text-center border-t border-gray-200 dark:border-gray-700 pt-2'
    shortcutsInfo.innerHTML = `
      <span class="font-medium">Keyboard Shortcuts:</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+O</kbd> Buka Asli</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">+/-</kbd> Zoom</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">0</kbd> Reset</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> Tutup</span>
    `

    imageContainer.appendChild(imageWrapper)
    imageContainer.appendChild(shortcutsInfo)
    modalContent.appendChild(header)
    modalContent.appendChild(imageContainer)
    modal.appendChild(modalContent)

    // Add to DOM first
    document.body.appendChild(modal)

    // Add event listeners after DOM is ready
    setTimeout(() => {
      imageContainer.addEventListener('wheel', handleWheel, { passive: false })
      img.addEventListener('mousedown', startDrag)
      document.addEventListener('mousemove', drag)
      document.addEventListener('mouseup', endDrag)
      document.addEventListener('mouseleave', endDrag)

      // Button event listeners
      const zoomInBtn = document.getElementById('zoom-in')
      const zoomOutBtn = document.getElementById('zoom-out')
      const resetBtn = document.getElementById('zoom-reset')
      const openNewTabBtn = document.getElementById('open-new-tab')

      if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn)
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut)
      if (resetBtn) resetBtn.addEventListener('click', resetZoom)

      // Open image in new tab
      if (openNewTabBtn) {
        openNewTabBtn.addEventListener('click', () => {
          window.open(imageUrl, '_blank')
        })
      }
    }, 100)

    // Add loading indicator
    imageContainer.innerHTML = `
      <div class="loading-indicator flex items-center justify-center">
        <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    `

    // Assemble modal
    imageWrapper.appendChild(img)

    // Add keyboard shortcuts helper
   
    shortcutsInfo.className = 'text-xs text-gray-500 dark:text-gray-400 mt-3 text-center border-t border-gray-200 dark:border-gray-700 pt-2'
    shortcutsInfo.innerHTML = `
      <span class="font-medium">Keyboard Shortcuts:</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+O</kbd> Buka Asli</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">+/-</kbd> Zoom</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">0</kbd> Reset</span>
      <span class="mx-2">•</span>
      <span><kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> Tutup</span>
    `

    imageContainer.appendChild(imageWrapper)
    imageContainer.appendChild(shortcutsInfo)
    modalContent.appendChild(header)
    modalContent.appendChild(imageContainer)
    modal.appendChild(modalContent)

    // Add to DOM
    document.body.appendChild(modal)

    // Close on escape key and handle shortcuts
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cleanup event listeners
        imageContainer.removeEventListener('wheel', handleWheel)
        img.removeEventListener('mousedown', startDrag)
        document.removeEventListener('mousemove', drag)
        document.removeEventListener('mouseup', endDrag)
        document.removeEventListener('mouseleave', endDrag)
        modal.remove()
        document.removeEventListener('keydown', handleEscape)
      } else if (e.ctrlKey && e.key === 'o') {
        // Ctrl+O to open original image
        e.preventDefault()
        window.open(imageUrl, '_blank')
      } else if (e.key === '+' || e.key === '=') {
        // Plus key to zoom in
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-' || e.key === '_') {
        // Minus key to zoom out
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0') {
        // Zero key to reset zoom
        e.preventDefault()
        resetZoom()
      }
    }
    document.addEventListener('keydown', handleEscape)

    // Close on background click
    modal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modal) {
        modal.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    })

    console.log(`Opening image preview: ${title}`)
  } catch (error) {
    console.error('Failed to open image preview:', error)
  }
}

// ========================================
// BILLING METHODS
// ========================================
async function loadProcedureBillingInternal() {
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

    topProcedures.value = topProceduresResponse.data?.data || []

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
  if (!procedureBilling.value || procedureBilling.value.length === 0) {
    console.log('⚠️ loadProcedureMappings: No procedure billing data available')
    return
  }

  console.log('🔍 loadProcedureMappings: Starting to load SNOMED mappings')
  console.log('📊 Available procedures:', procedureBilling.value.length)

  // Check if current patient is rawat inap
  const isRawatInap = selectedVisitData.value?.jnspelayanan === '1' ||
                      selectedVisitData.value?.jnspelayanan === 'Ranap' ||
                      (selectedVisitData.value?.jnspelayanan && selectedVisitData.value.jnspelayanan.includes('Ranap'))

  try {
    const kdJenisPrws = procedureBilling.value.map((p: any) => p.kd_jenis_prw)
    console.log('🔑 Procedure codes to fetch mappings for:', kdJenisPrws)
    console.log('🏥 Is Rawat Inap:', isRawatInap)

    // Get existing mappings - use different endpoint for rawat inap
    const mappingPromises = kdJenisPrws.map(async (kdJenisPrw: string) => {
      try {
        console.log(`🔎 Fetching mapping for procedure: ${kdJenisPrw}`)

        // Use different endpoint for rawat inap vs rawat jalan
        const endpoint = isRawatInap
          ? `${config.public.API_V2_URL}/procedure-mapping/${kdJenisPrw}?type=inap`
          : `${config.public.API_V2_URL}/procedure-mapping/${kdJenisPrw}`

        console.log(`🌐 Using endpoint: ${endpoint}`)

        const response = await $fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${tokenStore.accessToken}`,
            'Accept': 'application/json'
          }
        })

        console.log(`📡 Raw response for ${kdJenisPrw}:`, response)

        // $fetch returns data directly, not a Response object
        if (response && typeof response === 'object' && 'data' in response) {
          console.log(`✅ Found mapping for ${kdJenisPrw}:`, response.data)
          return { kdJenisPrw, mapping: response.data }
        } else if (response === null || response === undefined) {
          console.log(`❌ No mapping found for ${kdJenisPrw}`)
          return { kdJenisPrw, mapping: null }
        } else {
          console.log(`✅ Found mapping for ${kdJenisPrw}:`, response)
          return { kdJenisPrw, mapping: response }
        }
      } catch (error: any) {
        // Handle 404 errors (mapping not found) and other errors gracefully
        console.log(`❌ No mapping found for procedure ${kdJenisPrw}:`, error?.data?.message || error?.message || 'Not found')
        return { kdJenisPrw, mapping: null }
      }
    })

    const mappings = await Promise.all(mappingPromises)
    console.log('📋 All mappings loaded:', mappings)

    // Merge mapping data into procedure billing
    const updatedBilling = procedureBilling.value.map((procedure: any) => {
      const mappingData = mappings.find(m => m.kdJenisPrw === procedure.kd_jenis_prw)
      const updated = {
        ...procedure,
        snomed_mapping: mappingData?.mapping || null
      }

      // Enhanced debugging for RI00122 (Nebulizer)
      if (procedure.kd_jenis_prw === 'RI00122') {
        console.log(`🔍 DEBUG for RI00122:`, {
          procedure: procedure,
          mappingData: mappingData,
          mappingData_mapping: mappingData?.mapping,
          hasSnomedMapping_result: hasSnomedMapping(updated),
          snomed_mapping_field: updated.snomed_mapping,
          updated_procedure: updated
        })
      }

      console.log(`🔄 Updating procedure ${procedure.kd_jenis_prw} with mapping:`, updated.snomed_mapping)
      return updated
    })

    procedureBilling.value = updatedBilling
    console.log('✅ Procedure billing updated with SNOMED mappings:', procedureBilling.value)

  } catch (error) {
    console.error('💥 Error loading procedure mappings:', error)
  }
}

// Create the public loadProcedureBilling function that includes mappings
async function loadProcedureBilling() {
  console.log('🔄 loadProcedureBilling called - will load billing + SNOMED mappings')
  await loadProcedureBillingInternal()
  console.log('📊 Billing data loaded, now loading SNOMED mappings...')
  await loadProcedureMappings()
  console.log('✅ loadProcedureBilling completed with SNOMED mappings')
}

// ========================================
// BPJS SUBMISSION METHODS
// ========================================

async function sendToBpjs() {
  // Get the actual SEP number from visit data
  const validSep = selectedVisitData.value?.no_sep || visitDetails.value?.sep?.noSep || ''

  // Validasi no rawat
  if (!selectedVisitData.value?.no_rawat || selectedVisitData.value?.no_rawat.trim() === '') {
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

      // Skip null resources
      if (!resource) {
        console.log(`Resource ${index}: null resource (skipped)`)
        return
      }

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

    // Use SEP date for month and year calculation
    const sepDate = selectedVisitData.value?.tglsep ? new Date(selectedVisitData.value.tglsep) : currentDate

    const payload = {
      request: {
        noSep: validSep,
        jnsPelayanan: (selectedVisitData.value?.jnspelayanan === 'Ralan' || selectedVisitData.value?.jnspelayanan === '2' || visitDetails.value?.reg_periksa?.jnspelayanan === 'Ralan' || visitDetails.value?.reg_periksa?.jnspelayanan === '2' || visitDetails.value?.sep?.jnsPelayanan === '2') ? '2' : '1', // 1=Rawat Inap, 2=Rawat Jalan
        bulan: String(sepDate.getMonth() + 1).padStart(2, '0'),
        tahun: String(sepDate.getFullYear()),
        dataMR: medicalRecordBundle  // Send as object (backend will handle encryption/compression)
      }
    }

    // DEBUG: Final check before API call
    console.log('=== FINAL PRE-API DEBUG ===');
    const compositionEntry = medicalRecordBundle.entry?.find(entry => entry.resource?.resourceType === 'Composition');
    if (compositionEntry) {
      console.log('Composition entry found in medicalRecordBundle!');
      console.log('Composition section type:', typeof compositionEntry.resource.section);
      console.log('Composition section isArray:', Array.isArray(compositionEntry.resource.section));
      console.log('Composition section keys:', Object.keys(compositionEntry.resource.section));
      console.log('Composition section structure:', JSON.stringify(compositionEntry.resource.section, null, 2));
    } else {
      console.log('❌ No composition entry found in medicalRecordBundle!');
    }

    console.log('📡 Sending payload to BPJS API:', JSON.stringify(payload, null, 2))

    // Tampilkan dataMR asli sebelum dikirim
    console.log('🔍 Original dataMR (Bundle):', JSON.stringify(medicalRecordBundle, null, 2))

    // Simulasi proses yang mungkin dilakukan backend:
    const dataMRString = JSON.stringify(medicalRecordBundle) // For logging purposes
    const dataMRCompressed = dataMRString // Backend mungkin mengkompres ini
    console.log('💾 dataMR string length:', dataMRString.length)
    console.log('📦 dataMR string (minified):', dataMRString.substring(0, 500) + '...')

    // Jika Anda ingin melihat yang akan dikompres:
    try {
      // Coba gzip simulation jika ada library
      if (typeof pako !== 'undefined') {
        const compressed = pako.gzip(dataMRString)
        const compressedBase64 = btoa(String.fromCharCode(...compressed))
        console.log('🗜️ Gzipped dataMR length:', compressed.length)
        console.log('🗜️ Gzipped dataMR (base64):', compressedBase64)
        console.log('📋 FOR POSTMAN - Use this as dataMR value:')
        console.log('dataMR:', compressedBase64)
      } else {
        // Manual base64 encoding jika tidak ada pako
        const base64Encoded = btoa(dataMRString)
        console.log('🔗 Base64 encoded dataMR:', base64Encoded.substring(0, 100) + '...')
        console.log('📋 FOR POSTMAN - Use this as dataMR (if backend expects base64):')
        console.log('dataMR:', base64Encoded)
      }
    } catch (e) {
      console.log('⚠️ pako library not available for gzip simulation')
      // Fallback: tampilkan string asli
      console.log('📋 FOR POSTMAN - Use raw dataMR (if backend processes encryption):')
      console.log('dataMR:', dataMRString)
    }

    // DEBUG: Check payload before stringify
    console.log('=== PAYLOAD BEFORE STRINGIFY ===')
    console.log('Payload structure:', JSON.stringify(payload, null, 2))

    // Check specifically for Procedure note text values
    if (payload.dataMR && payload.dataMR.entry) {
      payload.dataMR.entry.forEach((entry, entryIndex) => {
        if (entry.resource && Array.isArray(entry.resource)) {
          entry.resource.forEach((resource, resourceIndex) => {
            if (resource.resourceType === 'Procedure' && resource.note) {
              resource.note.forEach((note, noteIndex) => {
                console.log(`PROCEDURE NOTE CHECK - Entry ${entryIndex}, Resource ${resourceIndex}, Note ${noteIndex}:`)
                console.log('  - text value:', note.text)
                console.log('  - text type:', typeof note.text)
                console.log('  - is null:', note.text === null)
                console.log('  - is empty string:', note.text === '')
              })
            }
          })
        }
      })
    }

    const payloadString = JSON.stringify(payload)
    console.log('=== PAYLOAD AFTER STRINGIFY ===')
    console.log('Stringified payload:', payloadString)

    // Check again after stringify
    const parsedBack = JSON.parse(payloadString)
    if (parsedBack.dataMR && parsedBack.dataMR.entry) {
      parsedBack.dataMR.entry.forEach((entry, entryIndex) => {
        if (entry.resource && Array.isArray(entry.resource)) {
          entry.resource.forEach((resource, resourceIndex) => {
            if (resource.resourceType === 'Procedure' && resource.note) {
              resource.note.forEach((note, noteIndex) => {
                console.log(`PROCEDURE NOTE CHECK AFTER STRINGIFY - Entry ${entryIndex}, Resource ${resourceIndex}, Note ${noteIndex}:`)
                console.log('  - text value:', note.text)
                console.log('  - text type:', typeof note.text)
                console.log('  - is null:', note.text === null)
                console.log('  - is empty string:', note.text === '')
              })
            }
          })
        }
      })
    }

    const response = await $fetch(`${config.public.API_V2_URL}/bpjs/rekammedis/insert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenStore.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: payloadString
    })

    console.log('BPJS Response:', response)

    if (response && response.message) {
      // Check BPJS response for actual status
      const bpjsMetadata = response.bpjs_response?.metadata;
      const isActuallySuccess = bpjsMetadata?.code === '200';

      console.log('BPJS Metadata:', bpjsMetadata);
      console.log('BPJS Code:', bpjsMetadata?.code);
      console.log('Is Actually Success:', isActuallySuccess);

      if (isActuallySuccess) {
        // Real success case
        showBpjsSuccessToast('Data berhasil dikirim ke BPJS')
        bpjsSubmissionStatus.value = 'success'

        // Auto-refresh ERM BPJS status after successful submission
        const currentSep = selectedVisitData.value?.no_sep || visitDetails.value?.sep?.noSep || ''
        if (currentSep) {
          console.log('🔄 Auto-refreshing ERM BPJS status for SEP:', currentSep)

          // Clear cache for current SEP to force refresh
          clearCache(currentSep)

          // Optional: Re-check all SEPs in current data to ensure status is up-to-date
          if (props.data?.data && Array.isArray(props.data.data)) {
            const sepList = props.data.data
              .map((row: any) => row.no_sep)
              .filter(Boolean)

            // Clear cache for all SEPs to ensure fresh data
            sepList.forEach(sep => clearCache(sep))

            if (sepList.length > 0) {
              // Re-check ERM status for all SEPs after a short delay to allow backend to update
              setTimeout(async () => {
                try {
                  console.log('🔄 Checking ERM BPJS status for SEPs:', sepList)
                  const results = await checkMultipleErmStatus(sepList)
                  const newStatus: Record<string, boolean> = {}
                  results.forEach((status, noSep) => {
                    newStatus[noSep] = status
                  })
                  ermBpjsStatus.value = { ...ermBpjsStatus.value, ...newStatus }
                  console.log('✅ ERM BPJS status refreshed for all SEPs:', newStatus)

                  // Show success message if current SEP status is true
                  if (newStatus[currentSep]) {
                    console.log('🎉 ERM BPJS badge should now be visible for SEP:', currentSep)
                  }
                } catch (error) {
                  console.error('❌ Failed to refresh ERM BPJS status:', error)
                }
              }, 1500) // Wait 1.5 seconds for backend to update
            }
          }
        }
      } else {
        // Show BPJS error response with full details
        const bpjsResponseText = response?.bpjs_response
          ? JSON.stringify(response.bpjs_response, null, 2)
          : JSON.stringify({ metadata: bpjsMetadata, response: null }, null, 2);

        showBpjsErrorToast(
          'BPJS API Error',
          `Code: ${bpjsMetadata?.code || 'Unknown'}\nMessage: ${bpjsMetadata?.message || 'Unknown error'}`,
          {
            timeout: 8000,
            show_details: true,
            bpjs_response: bpjsResponseText
          }
        )
        bpjsSubmissionStatus.value = 'error'
      }
      // Reset status after 3 seconds
      setTimeout(() => { bpjsSubmissionStatus.value = 'idle' }, 3000)
    } else {
      throw new Error('Invalid response from BPJS API')
    }

  } catch (error) {
    console.error('Error sending to BPJS:', error)
    console.error('Error details:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?._data || error?.response?.data,
      url: error?.config?.url
    })

    // Check if error is from BPJS API response
    const bpjsErrorData = error?.response?._data || error?.response?.data
    if (bpjsErrorData && bpjsErrorData.bpjs_response) {
      // Show BPJS error response with full details
      showBpjsErrorToast(
        'BPJS API Error',
        `Status: ${error?.response?.status || 'Unknown'}\nMessage: ${bpjsErrorData.message || 'Unknown error'}`,
        {
          timeout: 8000,
          show_details: true,
          bpjs_response: JSON.stringify(bpjsErrorData.bpjs_response, null, 2)
        }
      )
    } else {
      // Show general error with details
      const errorDetails = error?.response?._data || error?.response?.data || {}
      showErrorToast('❌ Gagal Mengirim', `Gagal mengirim data ke BPJS.\nStatus: ${error?.response?.status || 'Unknown'}\nMessage: ${errorDetails.message || error?.message || 'Unknown error'}`, {
        timeout: 8000
      })
    }

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
            }],
            "text": organizationName
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
                "div": `<div xmlns="http://www.w3.org/1999/xhtml">${reasonForAdmission || (codingDetail.value?.existing_coding?.clinical_notes_snomed?.[0]?.source_text || 'Tidak ada keluhan khusus')}</div>`
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
            }],
            "text": organizationName
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


// Helper function to check if a procedure row has SNOMED mapping
function hasSnomedMapping(row: any): boolean {
  if (!row || !row.snomed_mapping) return false

  // Check if snomed_mapping exists and has required fields
  return !!(
    row.snomed_mapping?.snomed_concept_id ||
    row.snomed_mapping?.code ||
    row.snomed_mapping?.snomed_term ||
    row.snomed_mapping?.display ||
    (row.snomed_mapping?.snomed && row.snomed_mapping.snomed.code)
  )
}

// Helper function to get SNOMED code from mapping
function getSnomedCode(row: any): string {
  return row.snomed_mapping?.snomed_concept_id ||
         row.snomed_mapping?.code ||
         row.snomed_mapping?.snomed?.code ||
         'N/A'
}

// Helper function to get SNOMED display term from mapping
function getSnomedDisplay(row: any): string {
  return row.snomed_mapping?.snomed_term ||
         row.snomed_mapping?.display ||
         row.snomed_mapping?.snomed_fsn ||
         row.snomed_mapping?.snomed?.display ||
         'N/A'
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

async function generateBPJSMedicalRecordBundle() {
  try {
    // ==========================================================================
    // 1. PERSIAPAN DATA
    // ==========================================================================
    
    const patientData = visitDetails.value?.registrasi?.pasien || visitDetails.value?.pasien
    const regPeriksaData = visitDetails.value?.registrasi || visitDetails.value?.reg_periksa

    // Data laboratorium
    const lab = visitDetails.value?.lab || []

    // === AKSES DATA DOKTER & PEGAWAI SECARA LANGSUNG ===
    // Mengambil object dokter dari structure yang tersedia
    const dokter = visitDetails.value?.registrasi?.dokter || visitDetails.value?.dokter || {};
    // Mengambil object pegawai dari relasi dokter
    const pegawai = dokter.pegawai || {};

    // Debug data dokter
    console.log('Data Dokter:', JSON.stringify(dokter, null, 2));
    console.log('Data Pegawai:', JSON.stringify(pegawai, null, 2));

    // 1. Ambil SIP langsung dari dokter.no_ijn_praktek
    const sipValue = visitDetails.value?.dokter?.no_ijn_praktek || dokter.no_ijn_praktek || '-';

    // 2. Ambil nomor KTP asli (pegawai.no_ktp) berdasarkan kd_dokter = pegawai.nik
    let nomorKTP = '-';
    try {
      if (dokter.kd_dokter) {
        console.log('Mengambil nomor KTP untuk kd_dokter (NIP):', dokter.kd_dokter);

        // Coba akses no_ktp dari data pegawai yang sudah ada (tanpa API call baru)
        // Kadang field ada tapi tidak visible di console log
        console.log('Available pegawai fields:', Object.keys(pegawai));

        // Cek semua possible field names untuk no_ktp
        const possibleKtpFields = ['no_ktp', 'noKtp', 'ktp', 'nomor_ktp', 'nik_ktp'];
        let foundKTP = false;

        for (const field of possibleKtpFields) {
          if (pegawai[field] && pegawai[field] !== '') {
            nomorKTP = pegawai[field];
            console.log(`✅ Berhasil dapat ${field}:`, nomorKTP);
            foundKTP = true;
            break;
          }
        }

        if (!foundKTP) {
          console.log('⚠️ Tidak ada field KTP yang ditemukan, gunakan kd_dokter sementara');
          console.log('Data pegawai lengkap untuk debugging:', pegawai);
        }
      } else {
        console.warn('⚠️ dokter.kd_dokter tidak ditemukan');
      }
    } catch (error) {
      console.error('❌ General error getting KTP:', error);
    }

    const nikDokterValue = nomorKTP !== '-' ? nomorKTP : dokter.kd_dokter;
    console.log('Final NIK (KTP) value:', nikDokterValue,
      nomorKTP !== '-' ? '(dari no_ktp database)' : '(fallback ke kd_dokter)');

    const practitionerName = dokter.nm_dokter || selectedVisitData.value?.nm_dokter || 'Dokter Pemeriksa';

    // Gabungkan data pasien
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
      nm_prop: regPeriksaData?.pasien?.propinsi?.nm_prop || patientData?.propinsi?.nm_prop || 'Propinsi',
      kd_pos: regPeriksaData?.pasien?.kd_pos || patientData?.kd_pos || '51161',
      tgl_lahir: regPeriksaData?.pasien?.tgl_lahir || patientData?.tgl_lahir || '1900-01-01',
      nm_pasien: regPeriksaData?.pasien?.nm_pasien || patientData?.nm_pasien || 'Pasien',
      jk: regPeriksaData?.pasien?.jk || patientData?.jk || 'L',
      stts_nikah: regPeriksaData?.pasien?.stts_nikah || patientData?.stts_nikah || 'MENIKAH',
      tgl_registrasi: regPeriksaData?.tgl_registrasi || selectedVisitData.value?.tgl_registrasi,
      jam_reg: regPeriksaData?.jam_reg || selectedVisitData.value?.jam_reg,
      no_sep: selectedVisitData.value?.no_sep || 'SEP0000000000000'
    }

    const patientName = data.nm_pasien || data.nama_pasien || 'Unknown Patient';

    const hospitalSetting = await loadHospitalSetting()
    const kodeFaskesBpjs = hospitalSetting.kode_faskes_bpjs || '0166R001'
    const kodeKemenkes = hospitalSetting.kode_kemenkes || '3326051'
    const namaRumahSakit = hospitalSetting.nama_instansi || 'RSIA AISYIYAH PEKAJANGAN'
    
    const alamatOrg = (hospitalSetting.alamat_instansi && hospitalSetting.alamat_instansi.trim() !== '') 
        ? hospitalSetting.alamat_instansi 
        : 'Jl. Raya Pekajangan No. 123';

    let jnsPelayanan = '2'; 
    if (data.jnspelayanan && (data.jnspelayanan === '1' || data.jnspelayanan.toLowerCase().includes('inap'))) {
        jnsPelayanan = '1';
    }

    const now = new Date();
    let startDate = now;
    if (data.tgl_registrasi && data.jam_reg) {
        try {
            const parts = data.tgl_registrasi.split('-');
            const timeParts = data.jam_reg.split(':');
            startDate = new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1], timeParts[2]);
        } catch (e) {}
    }
    const startTime = formatBpjsDateTime(startDate);
    const endTime = formatBpjsDateTime(now);

    // ==========================================================================
    // 2. GENERATE IDs & ARRAYS
    // ==========================================================================
    const bundleId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const compositionId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const patientId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const practitionerId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const organizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`
    const encounterId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`

    const diagnosisRefs = [];
    const medicationRefs = [];
    const procedureRefs = [];
    const medicationsList = []; 
    const proceduresList = []; 
    const finalEntries = [];

    // ==========================================================================
    // 3. CREATE INDIVIDUAL RESOURCES
    // ==========================================================================

    // --- 1. PATIENT ---
    const patientResource = {
      resourceType: 'Patient',
      id: patientId,
      identifier: [
        {
            use: 'usual',
            type: {
              coding: [
                { "system": "http://hl7.org/fhir/v2/0203", "code": "MR" }
              ]
            },
            value: data.no_rkm_medis,
            assigner: { "display": namaRumahSakit }
        },
        {
            use: 'official',
            type: {
              coding: [
                { "system": "http://hl7.org/fhir/v2/0203", "code": "MB" }
              ]
            },
            value: data.no_peserta,
            assigner: { "display": "BPJS KESEHATAN" }
        },
        {
            use: 'official',
            type: {
              coding: [
                { "system": "http://hl7.org/fhir/v2/0203", "code": "NNIDN" }
              ]
            },
            value: data.no_ktp,
            assigner: { "display": "KEMENDAGRI" }
        }
      ],
      active: true,
      name: [{ use: 'official', text: data.nm_pasien }],
      telecom: [
        { "system": "phone", "value": data.no_tlp || "", "use": "mobile" },
        { "system": "phone", "value": "", "use": "work" },
        { "system": "phone", "value": "TDK ADA", "use": "home" }
      ],
      gender: data.jk === 'L' ? 'male' : 'female',
      birthDate: data.tgl_lahir,
      deceasedBoolean: false,
      address: [{ 
          use: 'home', 
          type: 'both', 
          text: data.alamat, 
          line: [data.alamat], 
          city: data.nm_kab, 
          district: data.nm_kec, 
          state: data.nm_prop, 
          postalCode: data.kd_pos, 
          country: 'Indonesia'
      }],
      maritalStatus: { 
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", code: data.stts_nikah?.toUpperCase().includes('NIKAH') ? "M" : "U", display: data.stts_nikah }],
          text: data.stts_nikah || null
      },
      managingOrganization: {
        reference: `Organization/${organizationId}`,
        display: namaRumahSakit
      }
    };
    finalEntries.push({ resource: patientResource });

    // --- 2. ORGANIZATIONS ---
    const organizations = [
      {
        name: namaRumahSakit,
        id: organizationId
      }
    ];

      organizations.forEach(org => {
      const organizationResource = {
        resourceType: 'Organization',
        id: org.id,
        identifier: [
          {
            use: "official",
            type: { coding: [], text: null },
            system: "urn:oid:bpjs",
            value: kodeFaskesBpjs,
            assigner: { display: null }
          },
          {
            use: "official",
            type: { coding: [], text: null },
            system: "urn:oid:KEMKES",
            value: kodeKemenkes,
            assigner: { display: null }
          }
        ],
        type: [
          {
            coding: [
              {
                system: "http://hl7.org/fhir/organization-type",
                code: "prov",
                display: "Healthcare Provider"
              }
            ],
            text: org.name
          }
        ],
        name: org.name,
        alias: [namaRumahSakit],
        telecom: [
          {
            system: "phone",
            value: hospitalSetting.kontak || '0285-000000',
            use: "work"
          }
        ],
        address: [
          {
            use: "work",
            type: "physical",
            text: alamatOrg,
            line: [alamatOrg],
            city: hospitalSetting.kabupaten || 'KABUPATEN PEKALONGAN',
            district: hospitalSetting.kecamatan || 'KEDUNGWUNI',
            state: hospitalSetting.propinsi || 'JAWA TENGAH',
            postalCode: '51161',
            country: "IDN"
          }
        ],
        contact: [
          {
            purpose: {
              coding: [
                {
                  system: "https://www.hl7.org/fhir/codesystem-contactentity-type.html",
                  code: "PATINF",
                  display: null
                }
              ],
              text: "Operator"
            },
            telecom: [
              {
                system: "phone",
                value: hospitalSetting.kontak || '0285-000000',
                use: null
              }
            ]
          }
        ]
      };
      finalEntries.push({ resource: organizationResource });
    });

    // --- 3. PRACTITIONER (FIXED: Dynamic from dokter.no_ijin_praktek & pegawai.no_ktp) ---
    const practitionerResource = {
      resourceType: 'Practitioner',
      id: practitionerId,
      identifier: [
        {
          use: "official",
          type: {
            coding: [],
            text: null
          },
          system: "urn:oid:nomor_sip",
          value: sipValue, // <-- Diambil dari dokter.no_ijin_praktek
          assigner: {
            display: null
          }
        },
        {
          use: "official",
          type: {
            coding: [
              {
                system: "http://hl7.org/fhir/v2/0203",
                code: "NNIDN",
                display: null
              }
            ],
            text: null
          },
          system: null,
          value: nikDokterValue, // <-- Diambil dari pegawai.no_ktp
          assigner: {
            display: "KEMENDAGRI"
          }
        }
      ],
      name: [{ use: 'official', text: practitionerName }],
      birthDate: dokter.tgl_lahir ? `${dokter.tgl_lahir} 00:00:00` : "2022-08-02 00:00:00",
      telecom: [
        { system: 'phone', value: '(0296) 531624', use: 'work' },
        { system: 'email', value: '', use: 'work' },
        { system: 'fax', value: '', use: 'work' }
      ],
      address: [{
        use: 'home',
        type: 'physical',
        text: pegawai.petugas?.alamat || '-',
        line: [pegawai.petugas?.alamat || '-'],
        city: hospitalSetting.kota || 'Purwokerto',
        district: hospitalSetting.kecamatan || 'Nusa',
        state: hospitalSetting.propinsi || 'JAWA TENGAH',
        postalCode: hospitalSetting.kode_pos || '53146',
        country: 'IDN'
      }],
      gender: dokter.jk === 'P' ? 'female' : 'male'
    };
    finalEntries.push({ resource: practitionerResource });

    // --- 4. CONDITION (Diagnosa) ---
    if (visitDetails.value?.diagnosa && Array.isArray(visitDetails.value.diagnosa)) {
      visitDetails.value.diagnosa.forEach((diag) => {
        if (!diag.kode) return;
        const condId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;

        const condition = {
          resourceType: 'Condition',
          id: condId,
          clinicalStatus: 'active',
          verificationStatus: 'confirmed',
          category: [
            {
              "coding": [
                {
                  "system": "http://hl7.org/fhir/condition-category",
                  "code": "encounter-diagnosis",
                  "display": "Encounter Diagnosis"
                }
              ],
              "text": null
            }
          ],
          code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: diag.kode, display: diag.deskripsi }], text: diag.deskripsi },
          subject: { reference: `Patient/${patientId}` },
          onsetDateTime: startTime
        };
        finalEntries.push({ resource: condition });
        diagnosisRefs.push({ reference: `Condition/${condId}` });
      });
    }

    // --- 4.1. CONDITION (Prosedur ICD-9) ---
    if (visitDetails.value?.prosedur && Array.isArray(visitDetails.value.prosedur)) {
      visitDetails.value.prosedur.forEach((proc) => {
        if (!proc.kode) return;
        const procCondId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;

        const procCondition = {
          resourceType: 'Condition',
          id: procCondId,
          clinicalStatus: 'active',
          verificationStatus: 'confirmed',
          category: [
            {
              "coding": [
                {
                  "system": "http://hl7.org/fhir/condition-category",
                  "code": "procedure",
                  "display": "Procedure"
                }
              ],
              "text": "Prosedur"
            }
          ],
          code: {
            coding: [
              { system: 'http://hl7.org/fhir/sid/icd-9-cm', code: proc.kode, display: proc.deskripsi }
            ],
            text: proc.deskripsi
          },
          subject: { reference: `Patient/${patientId}` },
          onsetDateTime: startTime
        };
        finalEntries.push({ resource: procCondition });
        diagnosisRefs.push({ reference: `Condition/${procCondId}` });
      });
    }

    // --- 5. MEDICATION REQUEST (Obat) ---
    // Use processedResepObat to get the processed racikan data with is_racikan flags
    const obatList = processedResepObat.value || resepObat.value || visitDetails.value?.obat || [];

    // Process medications for both rawat jalan and rawat inap
    if (obatList.length > 0) {
      // Group medications by prescription for better organization
      const medicationGroups = new Map();

      obatList.forEach(obat => {
        const groupKey = obat.tipe_rawatan === 'Rawat Inap'
          ? `${obat.tgl_peresepan}-${obat.jam_peresepan}` // Group by date/time for discharge meds
          : `${obat.no_resep || 'unknown'}-${obat.tgl_peresepan}`; // Group by prescription number

        if (!medicationGroups.has(groupKey)) {
          medicationGroups.set(groupKey, {
            medications: [],
            tipe_rawatan: obat.tipe_rawatan,
            no_resep: obat.no_resep,
            tgl_peresepan: obat.tgl_peresepan,
            jam_peresepan: obat.jam_peresepan,
            dokter_nama: obat.dokter_nama || 'Dokter',
            status_resep: obat.status_resep
          });
        }
        medicationGroups.get(groupKey).medications.push(obat);
      });

      // Create one MedicationRequest for each medication in each prescription group
      medicationGroups.forEach((group, groupKey) => {
        const isRawatInap = group.tipe_rawatan === 'Rawat Inap';

        group.medications.forEach((obat, index) => {
          const medId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;

          // For racikan, create special formatted name; for non-racikan, use nama_brng
          let medName = obat.nama_brng || 'Obat';

          // Process racikan medications
          if (obat.status_resep === 'Racik' && obat.is_racikan) {
            const racikanName = obat.nama_brng;
            const componentLines = obat.display_nama_brng.split('\n').slice(1);
            const componentInfo = componentLines.map(line => {
              const match = line.match(/^\s*-\s*(.+?)\s+dosis\s+(.+?),\s*jml:\s*(.+)$/);
              if (match) {
                return `${match[1]} (${match[2]})`;
              }
              return line.trim();
            }).filter(Boolean);
            const componentsText = componentInfo.join(', ');
            medName = `${racikanName} - ${componentsText}`;
          } else if (obat.status_resep === 'Racik' && !obat.is_racikan && obat.racikan_detail && obat.racikan_detail.length > 0) {
            const racikanName = obat.nama_brng;
            const componentInfo = obat.racikan_detail.map((detail: any) => {
              const name = detail.nama_brng || 'Tidak diketahui';
              let dosage = detail.kandungan || '-';
              if (detail.kandungan && typeof detail.kandungan === 'string') {
                const dosageMatch = detail.kandungan.match(/(\d+\.?\d*)\s*(mg|mcg|g|ml|iu|unit)/i);
                if (dosageMatch) {
                  dosage = `${dosageMatch[1]} ${dosageMatch[2]}`;
                }
              }
              return `${name} (${dosage})`;
            }).filter(Boolean);
            const componentsText = componentInfo.join(', ');
            medName = `${racikanName} - ${componentsText}`;
          }

          // For racikan, use RACIKAN-X format; for non-racikan, use kode_brng
          const medCode = (obat.status_resep === 'Racik' && obat.kode_brng && obat.kode_brng.startsWith('RACIKAN-')) ?
            obat.kode_brng :
            (obat.kode_brng || '000');
          const jumlah = obat.jml || 1;
          const satuan = obat.kode_sat || 'TAB';
          const intent = 'final';
          const prescriptionType = group.tipe_rawatan === 'Rawat Inap' ? 'Resep Pulang' : 'Resep Rawat Jalan';

          const medRequest = {
            resourceType: 'MedicationRequest',
            id: medId,
            text: {
              "div": `${medName} (${prescriptionType})`
            },
            intent: intent,
            identifier: {
              "system": isRawatInap ? "id_resep_pulang" : "id_resep_obat",
              "value": group.no_resep || `${groupKey}-${index + 1}`
            },
            subject: {
              "display": data.nm_pasien,
              "reference": `Patient/${patientId}`
            },
            medicationCodeableConcept: {
              "coding": [
                {
                  "system": "https://rsiaaisyiyah.com/drug",
                  "code": medCode
                }
              ],
              "text": medName
            },
            dosageInstruction: [{
              "doseQuantity": {
                "code": satuan,
                "system": "http://unitsofmeasure.org",
                "unit": satuan,
                "value": jumlah
              },
              "route": {
                "coding": [
                  {
                    "system": "http://snomed.info/sct",
                    "code": getRouteCode(medName),
                    "display": getRouteDisplay(medName)
                  }
                ]
              },
              "timing": {
                "repeat": {
                  "frequency": "1",
                  "period": "1",
                  "periodUnit": "d"
                }
              },
              "additionalInstruction": [
                {
                  "text": getAdditionalInstruction(obat)
                }
              ]
            }],
            reasonCode: [
              {
                "coding": [{
                  "system": "",
                  "code": "",
                  "display": ""
                }],
                "text": ""
              }
            ],
            requester: {
              agent: {
                display: group.dokter_nama || practitionerName,
                reference: `Practitioner/${practitionerId}`
              },
              onBehalfOf: {
                reference: `Organization/${organizationId}`
              }
            },
            "meta": { "lastUpdated": endTime }
          };
          medicationsList.push(medRequest);
          medicationRefs.push({ reference: `MedicationRequest/${medId}` });
        });
      });
    } else {
      // Jika tidak ada data obat, buat MedicationRequest default dengan placeholder
      const defaultMedId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;

      const defaultMedRequest = {
        resourceType: 'MedicationRequest',
        id: defaultMedId,
        text: {
          "div": "Tidak Ada Obat"
        },
        identifier: {
          "system": "id_resep_pulang",
          "value": defaultMedId
        },
        subject: {
          "display": data.nm_pasien,
          "reference": `Patient/${patientId}`
        },
        intent: "final",
        status: "completed",
        medicationCodeableConcept: {
          "coding": [
            {
              "system": "https://rsiaaisyiyah.com/drug",
              "code": "000",
              "display": "Tidak Ada Obat"
            }
          ],
          "text": "Tidak Ada Obat"
        },
        dosageInstruction: [{
          "doseQuantity": {
            "code": "",
            "system": "",
            "unit": "",
            "value": 0
          },
          "route": {
            "coding": [
              {
                "system": "",
                "code": "",
                "display": ""
              }
            ],
            "text": ""
          },
          "timing": {
              "repeat": {
                "frequency": "0",
                "period": "1",
                "periodUnit": "d"
              }
          },
          "additionalInstruction": [
            {
              "text": "Tidak Ada Obat Diresepkan"
            }
          ]
        }],
        reasonCode: [
          {
            "coding": [{
              "system": "",
              "code": "",
              "display": ""
            }],
            "text": "Tidak Ada Indikasi Khusus"
          }
        ],
        requester: {
          agent: {
            display: practitionerName,
            reference: `Practitioner/${practitionerId}`
          },
          onBehalfOf: {
            reference: `Organization/${organizationId}`
          }
        },
        "meta": {
          "lastUpdated": endTime
        },
        "note": [
          {
            "text": "Pasien tidak diresepkan obat pada kunjungan ini"
          }
        ]
      };

      medicationsList.push(defaultMedRequest);
      medicationRefs.push({ reference: `MedicationRequest/${defaultMedId}` });
    }

    // Selalu tambahkan MedicationRequest ke finalEntries
    if (medicationsList.length > 0) {
      finalEntries.push({ resource: medicationsList });
    }

    // --- 6. ENCOUNTER ---
    const encounterResource = {
      resourceType: 'Encounter',
      id: encounterId,
      identifier: [
        {
          "use": null,
          "type": {
            "coding": [],
            "text": null
          },
          "system": "http://api.bpjs-kesehatan.go.id:8080/Vclaim-rest/SEP/",
          "value": data.no_sep,
          "assigner": {
            "display": null
          }
        }
      ],
      status: 'Finished',
      text: {
        "div": `Admitted to ${jnsPelayanan === '1' ? 'Inpatient' : 'Outpatient'} - ${namaRumahSakit}`,
        "status": "generated"
      },
      class: {
        system: 'http://hl7.org/fhir/v3/ActCode',
        code: jnsPelayanan === '1' ? 'IMP' : 'AMB',
        display: jnsPelayanan === '1' ? 'inpatient encounter' : 'ambulatory'
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: data.nm_pasien,
        noSep: data.no_sep
      },
      incomingReferral: [
        {
          "identifier": [
            {
              "use": null,
              "type": { "coding": [], "text": null },
              "system": "nomor_rujukan_bpjs",
              "value": data.no_sep,
              "assigner": { "display": null }
            }
          ]
        }
      ],
      reason: [
        {
          "coding": [
            {
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": "Z00.0",
              "display": "Pemeriksaan umum"
            }
          ],
          "text": "Pemeriksaan umum"
        }
      ],
      hospitalization: {
        "dischargeDisposition": [
          {
            "coding": [
              {
                "system": "http://hl7.org/fhir/discharge-disposition",
                "code": "home",
                "display": "Home"
              }
            ],
            "text": null
          }
        ]
      },
      period: { start: startTime, end: startTime },
      diagnosis: diagnosisRefs.map((ref, index) => ({
          condition: {
            reference: ref.reference,
            role: {
              coding: [
                {
                  "system": "http://hl7.org/fhir/diagnosis-role",
                  "code": index === 0 ? "DD" : "AD",
                  "display": index === 0 ? "Discharge Diagnosis" : "Admission Diagnosis"
                }
              ],
              "text": null
            },
            rank: index + 1
          }
      })),
      reason: [
        {
          "coding": [
            {
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": "Z00.0",
              "display": "Pemeriksaan umum"
            }
          ],
          "text": "Pemeriksaan umum"
        }
      ],
      serviceProvider: {
        reference: `Organization/${organizationId}`,
        display: namaRumahSakit
      }
    };
    finalEntries.push({ resource: encounterResource });

    // --- 7. COMPOSITION ---
    const compositionSections: {[key: string]: any} = {};

    // Variable untuk mengambil data keluhan dari pemeriksaan_ranap terawal yang dilakukan oleh Dokter
    const initialDoctorAssessment = (() => {
      const pemeriksaanRanap = visitDetails.value?.pemeriksaan_ranap || [];

      if (pemeriksaanRanap.length === 0) return '';

      // Cari assessment oleh Dokter
      const doctorAssessments = pemeriksaanRanap.filter(p =>
        p.petugas && p.petugas.nama && p.petugas.nama.toLowerCase().includes('dr.')
      );

      if (doctorAssessments.length > 0) {
        // Jika ada assessment oleh dokter, cari yang terawal berdasarkan tgl+jam
        const sortedAssessments = doctorAssessments.sort((a, b) => {
          const dateA = new Date(`${a.tgl_perawatan} ${a.jam_rawat}`);
          const dateB = new Date(`${b.tgl_perawatan} ${b.jam_rawat}`);
          return dateA.getTime() - dateB.getTime();
        });
        return sortedAssessments[0]?.keluhan?.trim() || '';
      } else {
        // Jika tidak ada assessment oleh dokter, ambil indeks terbesar (terakhir)
        const lastIndex = pemeriksaanRanap.length - 1;
        return pemeriksaanRanap[lastIndex]?.keluhan?.trim() || '';
      }
    })();

    // Check if this is rawat inap or rawat jalan
    const isRawatInap = selectedVisitData.value?.jnspelayanan === '1' ||
                         selectedVisitData.value?.jnspelayanan === 'Ranap' ||
                         visitDetails.value?.reg_periksa?.jnspelayanan === '1' ||
                         visitDetails.value?.reg_periksa?.jnspelayanan === 'Ranap';

    // Variable untuk mengambil penilaian dari pemeriksaan_ranap terawal yang dilakukan oleh Dokter
    const initialDoctorPenilaian = (() => {
      const pemeriksaanRanap = visitDetails.value?.pemeriksaan_ranap || [];

      if (pemeriksaanRanap.length === 0) return '';

      // Filter hanya assessment oleh Dokter
      const doctorAssessments = pemeriksaanRanap.filter(p =>
        p.petugas && p.petugas.nama && p.petugas.nama.toLowerCase().includes('dr.')
      );

      if (doctorAssessments.length > 0) {
        // Jika ada assessment oleh dokter, cari yang terawal berdasarkan tgl+jam
        const sortedAssessments = doctorAssessments.sort((a, b) => {
          const dateA = new Date(`${a.tgl_perawatan} ${a.jam_rawat}`);
          const dateB = new Date(`${b.tgl_perawatan} ${b.jam_rawat}`);
          return dateA.getTime() - dateB.getTime();
        });
        return sortedAssessments[0]?.penilaian?.trim() || '';
      } else {
        // Jika tidak ada assessment oleh dokter, ambil indeks terbesar (terakhir)
        const lastIndex = pemeriksaanRanap.length - 1;
        return pemeriksaanRanap[lastIndex]?.penilaian?.trim() || '';
      }
    })();

    let reasonForAdmission;
    let admissionDiagnosis;
    let dischargeDiagnosis;

    if (isRawatInap) {
      // Rawat Inap: Reason for admission dari assessment dokter, Admission diagnosis dari administrasi
      reasonForAdmission = initialDoctorAssessment ||
                           visitDetails.value?.kamar_inap?.diagnosa_awal ||
                           (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.keluhan || 'Tidak ada keluhan').trim();
      admissionDiagnosis = visitDetails.value?.kamar_inap?.diagnosa_awal || 'Tidak ada diagnosa awal';
      dischargeDiagnosis = initialDoctorPenilaian || 'Tidak ada diagnosa saat keluar';
    } else {
      // Rawat Jalan: Reason for admission dan Admission diagnosis sama-sama dari pemeriksaan_ralan[0].keluhan
      reasonForAdmission = (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.keluhan || 'Tidak ada keluhan').trim();
      admissionDiagnosis = (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.keluhan || 'Tidak ada keluhan').trim();
      dischargeDiagnosis = (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.keluhan || 'Tidak ada diagnosa saat keluar').trim();
    }
    let sectionIndex = 0; // Use consecutive 0,1,2,3... indices

    // Helper function to create sparse keys to prevent automatic array conversion
    const getSparseKey = (index: number) => String((index + 1) * 10); // 10, 20, 30... to prevent array conversion

    // Use string keys to match successful bundle structure
    compositionSections[String(sectionIndex)] = {
      title: "Reason for admission",
      code: {
              "coding": [
                {
                  "system": "http://loinc.org",
                  "code": "29299-5",
                  "display": "Reason for visit Narrative"
                }
              ]
            },
      text: { status: "additional", div: reasonForAdmission },
      entry: null
    };

    if (diagnosisRefs.length > 0) {
      // Admission diagnosis - use different data based on patient type
      sectionIndex++;
      compositionSections[String(sectionIndex)] = {
        title: "Admission diagnosis",
        code: {
              "coding": [
                {
                  "system": "http://loinc.org",
                  "code": "42347-5",
                  "display": "Admission diagnosis Narrative"
                }
              ]
            },
        text: { status: "additional", div: admissionDiagnosis },
        entry: null
      };
      sectionIndex++;

      // Chief complaint
      compositionSections[String(sectionIndex)] = {
        title: "Chief complaint",
        code: {
              "coding": [
                {
                  "system": "http://loinc.org",
                  "code": "10154-3",
                  "display": "Chief complaint Narrative"
                }
              ]
            },
        text: { status: "additional", div: reasonForAdmission },
        entry: null
      };
      sectionIndex++;

  
          }

    if (medicationRefs.length > 0) {
      // Plan of care
      sectionIndex++;
      compositionSections[String(sectionIndex)] = {
        title: "Plan of care",
        code: {
              "coding": [
                {
                  "system": "http://loinc.org",
                  "code": "18776-5",
                  "display": "Plan of care"
                }
              ]
            },
        text: { status: "additional", div: "Rencana perawatan" },
        mode: "working",
        entry: null
      };
      sectionIndex++;

      // Known allergies
      const alergiText = (visitDetails.value?.cppt_pemeriksaan_ralan?.[0]?.alergi || data.alergi || 'Tidak ada alergi yang diketahui').trim();
      compositionSections[String(sectionIndex)] = {
        title: "Known allergies",
        code: {
              "coding": [
                {
                  "system": "http://loinc.org",
                  "code": "48765-2",
                  "display": "Allergies and adverse reactions"
                }
              ]
            },
        text: { status: "additional", div: alergiText },
        entry: null
      };
      sectionIndex++;
      sectionIndex++; // Skip index 6 to match successful Bundle structure (7 -> 8)

      // Medications on Discharge - Selalu tampilkan section meskipun tidak ada obat
      const medicationEntries = medicationRefs.map(ref => ({ reference: ref.reference }));

      // Tentukan teks berdasarkan apakah ada obat atau tidak
      const medicationText = medicationsList.length > 0
        ? `Resep Pulang untuk pasien ${data.nm_pasien}`
        : `Pasien ${data.nm_pasien} tidak diresepkan obat pada kunjungan ini`;

      compositionSections[String(sectionIndex)] = {
        title: "Medications on Discharge",
        code: {
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "75311-1",
              "display": "Hospital discharge medications Narrative"
            }
          ]
        },
        text: {
          "status": "additional",
          "div": medicationText
        },
        mode: "working",
        entry: medicationEntries.length > 0 ? medicationEntries : null
      };
    }

    const compositionResource = {
      resourceType: 'Composition',
      id: compositionId,
      status: 'final',
      type: {
        coding: [
          {
            "system": "http://loinc.org",
            "code": "81218-0"
          }
        ],
        "text": "Discharge Summary"
      },
      subject: {
        "reference": `Patient/${patientId}`,
        "display": data.nm_pasien
      },
      encounter: {
        "reference": `Encounter/${encounterId}`
      },
      date: endTime,
      author: [
        {
          "reference": `Practitioner/${practitionerId}`,
          "display": practitionerName
        }
      ],
      title: "Discharge Summary",
      confidentiality: "N",
      section: compositionSections
    };

    // DEBUG: Log compositionSections structure before adding to finalEntries
    console.log('=== COMPOSITION SECTIONS DEBUG ===');
    console.log('compositionSections type:', typeof compositionSections);
    console.log('compositionSections isArray:', Array.isArray(compositionSections));
    console.log('compositionSections keys:', Object.keys(compositionSections));
    console.log('compositionSections structure:', JSON.stringify(compositionSections, null, 2));

    // Test JSON stringify and parse to ensure object structure is preserved
    const jsonString = JSON.stringify(compositionSections);
    console.log('JSON string:', jsonString);
    const parsedBack = JSON.parse(jsonString);
    console.log('Parsed back type:', typeof parsedBack);
    console.log('Parsed back isArray:', Array.isArray(parsedBack));
    console.log('Parsed back keys:', Object.keys(parsedBack));

    finalEntries.push({ resource: compositionResource });

    // --- 8. DIAGNOSTIC REPORT (Laboratorium & Radiologi) ---
    console.log('=== CREATING DIAGNOSTIC REPORTS ===');
    console.log('Available lab data:', lab.length, 'items');

    // Array to collect all DiagnosticReports
    const allDiagnosticReports: any[] = [];

    // Laboratorium Diagnostic Reports
    if (lab && lab.length > 0) {
      lab.forEach((labItem: any, index: number) => {
        console.log(`Processing lab item ${index}:`, labItem.jenis_perawatan?.nm_perawatan);

        if (labItem.detail_periksa_lab && labItem.detail_periksa_lab.length > 0) {
          const diagnosticReportId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;
          const labOrganizationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;
        

          // Create Observations for lab details
          const observations = [];
          labItem.detail_periksa_lab.forEach((detail: any) => {
            const observationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;

            // Use SNOMED mapping for specific test if available, otherwise default
            let observationCode = {
              coding: {
                system: 'http://snomed.info/sct',
                code: detail.template?.satu_sehat_mapping_lab?.code || '258236005',
                display: detail.template?.satu_sehat_mapping_lab?.display || detail.template?.Pemeriksaan || 'Pemeriksaan'
              },
              text: detail.template?.Pemeriksaan || 'Pemeriksaan'
            };

            let observation: any = {
              resourceType: 'Observation',
              id: observationId,
              status: 'final',
              text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${detail.template?.Pemeriksaan || 'Pemeriksaan'}: ${detail.nilai || ''} ${detail.template?.satuan || ''}</div>`
              },
              issued: `${labItem.tgl_periksa} ${labItem.jam}`,
              effectiveDateTime: `${labItem.tgl_periksa} ${labItem.jam}`,
              code: observationCode,
              performer: {
                reference: `Practitioner/${practitionerId}`,
                display: practitionerName
              },
              subject: {
                reference: `Patient/${patientId}`,
                display: patientName,
                noSep: data.no_sep
              }
            };

            // Add valueQuantity if numeric
            if (detail.nilai && !isNaN(detail.nilai)) {
              observation.valueQuantity = {
                value: parseFloat(detail.nilai),
                unit: detail.template?.satuan || '',
                system: 'http://unitsofmeasure.org',
                code: detail.template?.satuan || ''
              };
            } else {
              observation.valueQuantity = {
                value: 1,
                unit: "",
                system: "http://unitsofmeasure.org",
                code: ""
              };
            }

            // Add intepretation - DEFAULT TO 'N' (Normal)

              observation.interpretation = {
                coding: {
                  system: 'http://hl7.org/fhir/v2/0078',
                  code: 'N',
                  display: 'Normal'
                }
              };
              
              // Add dynamic reference range if available
              if (detail.nilai_min_rujuk && detail.nilai_max_rujuk) {
                observation.referenceRange = {
                  low: {
                    value: parseFloat(detail.nilai_min_rujuk)
                  },
                  high: {
                    value: parseFloat(detail.nilai_max_rujuk)
                  }
                };
              } else if (detail.template?.nilai_min_rujuk && detail.template?.nilai_max_rujuk) {
                observation.referenceRange = {
                  low: {
                    value: parseFloat(detail.template.nilai_min_rujuk)
                  },
                  high: {
                    value: parseFloat(detail.template.nilai_max_rujuk)
                  }
                };
              } else if (detail.nilai_rujukan) {
                // Parse free text reference range like "11.5 - 14.5"
                const refRangeText = detail.nilai_rujukan.toString().trim();
                const rangeMatch = refRangeText.match(/^([-\d.]+)\s*-\s*([-\d.]+)$/);

                if (rangeMatch) {
                  const minValue = parseFloat(rangeMatch[1]);
                  const maxValue = parseFloat(rangeMatch[2]);

                  if (!isNaN(minValue) && !isNaN(maxValue)) {
                    observation.referenceRange = {
                      low: {
                        value: minValue
                      },
                      high: {
                        value: maxValue
                      }
                    };
                  } else {
                    // Fallback to text if parsing fails
                    observation.referenceRange = {
                      low: {
                        value: 0
                      },
                      high: {
                        value: 1
                      }
                    };
                  }
                } else {
                  // Use as text if doesn't match range format
                 observation.referenceRange = {
                      low: {
                        value: 0
                      },
                      high: {
                        value: 1
                      }
                    };
                }
              } else {
                 observation.referenceRange = {
                      low: {
                        value: 0
                      },
                      high: {
                        value: 1
                      }
                    };
              }

               // Set dynamic conclusion based on keterangan field
               if (detail.keterangan) {
                 const ket = detail.keterangan.toString().toLowerCase().trim();
                 if (ket === 'l' || ket.includes('low') || ket.includes('rendah') || ket.includes('kurang')) {
                   observation.conclusion = 'Rendah';
                   observation.interpretation = {
                     coding: {
                       system: 'http://hl7.org/fhir/v2/0078',
                       code: 'L',
                       display: 'Low'
                     }
                   };
                 } else if (ket === 'h' || ket.includes('high') || ket.includes('tinggi') || ket.includes('naik')) {
                   observation.conclusion = 'Tinggi';
                   observation.interpretation = {
                     coding: {
                       system: 'http://hl7.org/fhir/v2/0078',
                       code: 'H',
                       display: 'High'
                     }
                   };
                 } else if (ket === 'k' || ket.includes('kritis') || ket.includes('critical') || ket.includes('crit') || ket.includes('emergency') || ket.includes('gawat')) {
                   observation.conclusion = 'Kritis';
                   observation.interpretation = {
                     coding: {
                       system: 'http://hl7.org/fhir/v2/0078',
                       code: 'C',
                       display: 'Critical'
                     }
                   };
                 } else if (ket.includes('abnormal') || ket.includes('tidak normal') || ket.includes('anomali')) {
                   observation.conclusion = 'Abnormal';
                   observation.interpretation = {
                     coding: {
                       system: 'http://hl7.org/fhir/v2/0078',
                       code: 'A',
                       display: 'Abnormal'
                     }
                   };
                 } else {
                   // Default to normal for other descriptions
                   observation.conclusion = detail.keterangan;
                 }
               } else {
                 // No keterangan means normal result
                 observation.conclusion = 'Normal';
               }

            // Add reference range if available
            // if (detail.nilai_rujukan) {
            //   observation.referenceRange = [{
            //     text: detail.nilai_rujukan
            //   }];
            // }

            observations.push(observation);
          });

          // Create Diagnostic Report WITHOUT code field
          const diagnosticReport = {
            resourceType: 'DiagnosticReport',
            id: diagnosticReportId,
            status: 'final',
            category: {
              coding: {
                system: 'http://hl7.org/fhir/v2/0074',
                code: 'LAB',
                display: 'Laboratory'
              }
            },
            subject: {
              reference: `Patient/${patientId}`,
              display: patientName,
              noSep: data.no_sep
            },
            encounter: {
              reference: `Encounter/${encounterId}`
            },
            performer: [{
              reference: `Organization/${organizationId}`,
              display: namaRumahSakit
            }],
            result: observations
          };

          allDiagnosticReports.push(diagnosticReport);
          console.log('✅ Created lab DiagnosticReport:', labItem.jenis_perawatan?.nm_perawatan);
        }
      });
    }

    // Get poli name for organization name
    const kdPoli = visitDetails.value?.reg_periksa?.kd_poli || data.kd_poli
    const poliMapping: { [key: string]: string } = {
      'INT': 'Poli Penyakit Dalam',
      'ANA': 'Poli Anak',
      'OBG': 'Poli Kebidanan dan Kandungan',
      'MATA': 'Poli Mata',
      'THT': 'Poli Telinga Hidung Tenggorokan',
      'JANTUNG': 'Poli Jantung',
      'PARU': 'Poli Paru',
      'SARAF': 'Poli Saraf',
      'GIGI': 'Poli Gigi dan Mulut',
      'KULIT': 'Poli Kulit dan Kelamin',
      'UMUM': 'Poli Umum',
      'FISIO': 'Poli Fisioterapi'
    }

    const poliNameFromMapping = kdPoli ? (poliMapping[kdPoli] || '') : ''
    const poliName = visitDetails.value?.poli?.nm_poli ||
                    data.nm_poli ||
                    poliNameFromMapping ||
                    ''

    const organizationName = poliName ? `${poliName} - ${namaRumahSakit}` : namaRumahSakit

    // Check for radiologi data
    if (visitDetails.value?.radiologi && visitDetails.value.radiologi.length > 0) {
      console.log('Available radiologi data:', visitDetails.value.radiologi.length, 'items');

      visitDetails.value.radiologi.forEach((radioItem: any, index: number) => {
        const diagnosticReportId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;
        // Use main organization for radiology (BPJS only recognizes 1 organization)

        // Create Observation for radiology result
        const observationId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;
        const radiologyObservation = {
          resourceType: 'Observation',
          id: observationId,
          status: 'final',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${getRadiologyText([radioItem]).join('<br/>') || 'Hasil pemeriksaan radiologi'}</div>`
          },
          issued: radioItem.tgl_periksa || new Date().toISOString().split('T')[0],
          effectiveDateTime: radioItem.tgl_periksa || new Date().toISOString().split('T')[0],
          code: {
            coding: {
              system: 'http://snomed.info/sct',
              code: '394914006',
              display: radioItem.jenis_perawatan?.nm_perawatan || '-'
            },
            text: radioItem.jenis_perawatan?.nm_perawatan || '-'
          },
          performer: {
            reference: `Practitioner/${practitionerId}`,
            display: practitionerName
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: patientName,
            noSep: data.no_sep
          },
          valueQuantity: {
            value: 1,
            unit: "",
            system: "http://unitsofmeasure.org",
            code: ""
          },
          interpretation: {
            coding: {
              system: 'http://hl7.org/fhir/observation-interpretation',
              code: 'N',
              display: 'Normal'
            }
          },
          referenceRange: {
            low: {
              value: 0
            },
            high: {
              value: 1
            }
          },
          image: radioItem.gambarRadiologi && radioItem.gambarRadiologi.length > 0 ?
            radioItem.gambarRadiologi.map((gambar: any) => ({
              comment: gambar.deskripsi || "Gambar Radiologi",
              link: {
                reference: gambar.deskripsi || "Gambar Radiologi",
                display: gambar.lokasi_gambar || ""
              }
            })) : [{
              comment: "",
              link: {
                reference: "",
                display: ""
              }
            }],
          conclusion: extractConclusionFromText(getRadiologyText([radioItem])) || 'Impressi radiologi'
        };

  
        // Create Diagnostic Report for Radiology WITHOUT code field
        const radiologyDiagnosticReport = {
          resourceType: 'DiagnosticReport',
          id: diagnosticReportId,
          status: 'final',
          category: {
            coding: {
              system: 'http://hl7.org/fhir/v2/0074',
              code: 'RAD',
              display: 'Radiology'
            }
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: patientName,
            noSep: data.no_sep
          },
          encounter: {
            reference: `Encounter/${encounterId}`
          },
          effectiveDateTime: radioItem.tgl_periksa || new Date().toISOString().split('T')[0],
          issued: radioItem.tgl_periksa || new Date().toISOString().split('T')[0],
          performer: [{
            reference: `Organization/${organizationId}`,
            display: organizationName || 'Rumah Sakit'
          }],
          result: [radiologyObservation]
        };

        allDiagnosticReports.push(radiologyDiagnosticReport);
        console.log('✅ Created radiology DiagnosticReport:', radioItem.jenis_perawatan?.nm_perawatan);
      });
    }

    // Add all DiagnosticReports as single entry with resource array
    // TEMPORARILY DISABLED - Testing without DiagnosticReport
    
    if (allDiagnosticReports.length > 0) {
      finalEntries.push({ resource: allDiagnosticReports });
      console.log(`✅ Added ${allDiagnosticReports.length} DiagnosticReports in single entry`);
    }
    

    // --- 9. PROCEDURE (Tindakan) ---
    if (procedureBilling.value && procedureBilling.value.length > 0) {
      procedureBilling.value.forEach(proc => {
        const procId = `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`;
        const procName = proc.nm_perawatan;

        // Get procedure mapping from database tables (rsia_mapping_procedure or rsia_mapping_procedure_inap)
        let systemValue, codeValue, displayValue;

        if (proc.snomed_mapping && proc.snomed_mapping.mapping) {
          // Use mapped data from rsia_mapping_procedure or rsia_mapping_procedure_inap
          systemValue = proc.snomed_mapping.mapping.system || 'http://hl7.org/fhir/sid/icd-9-cm';
          codeValue = proc.snomed_mapping.mapping.code || proc.kd_jenis_prw;
          displayValue = proc.snomed_mapping.mapping.display || procName;
        } else if (proc.snomed_mapping && proc.snomed_mapping.code) {
          // Use SNOMED mapped data
          systemValue = 'http://snomed.info/sct';
          codeValue = proc.snomed_mapping.code;
          displayValue = proc.snomed_mapping.display || procName;
        } else {
          // Fallback to ICD-9-CM if no mapping available
          systemValue = 'http://hl7.org/fhir/sid/icd-9-cm';
          codeValue = proc.kd_jenis_prw;
          displayValue = procName;
        }

        const procedure = {
          resourceType: 'Procedure',
          id: procId,
          text: {
            "status": "completed",
            "div": "<div></div>"
          },
          status: 'completed',
          code: {
            coding: [{
              system: systemValue,
              code: codeValue,
              display: displayValue
            }]
          },
          subject: {
            "type": null,
            "identifier": {
              "use": null,
              "type": { "coding": [], "text": null },
              "system": null,
              "value": null,
              "assigner": { "display": null }
            },
            "display": data.nm_pasien,
            "reference": `Patient/${patientId}`
          },
          context: {
            "type": null,
            "identifier": {
              "use": null,
              "type": { "coding": [], "text": null },
              "system": null,
              "value": null,
              "assigner": { "display": null }
            },
            "display": `${data.nm_pasien} encounter on ${new Date(startTime).getDate()} ${new Date(startTime).toLocaleString('id-ID', { month: 'long' })} ${new Date(startTime).getFullYear()} ${new Date(startTime).getHours().toString().padStart(2, '0')}:${new Date(startTime).getMinutes().toString().padStart(2, '0')}`,
            "reference": `Encounter/${encounterId}`
          },
          performedPeriod: {
            start: startTime,
            end: startTime
          },
          performer: [
            {
              "role": {
                "coding": [
                  {
                    "system": systemValue,
                    "code": codeValue,
                    "display": displayValue
                  }
                ],
                "text": null
              },
              "actor": {
                "type": null,
                "identifier": {
                  "use": null,
                  "type": { "coding": [], "text": null },
                  "system": null,
                  "value": null,
                  "assigner": { "display": null }
                },
                "display": practitionerName,
                "reference": `Practitioner/${practitionerId}`
              }
            }
          ],
          reasonCode: [],
          bodySite: [],
          focalDevice: [],
          note: [
            {
              "text": ""
            }
          ]
        };
        proceduresList.push(procedure);
      });

      // Add all procedures as ONE entry (wrapped in array as per BPJS format)
      if (proceduresList.length > 0) {
        finalEntries.push({ resource: proceduresList }); // All procedures in one array
      }
      
      // Only add Procedures section if there are actual procedures with valid names
      const validProcedures = proceduresList.filter(p => p.code?.text && p.code?.text.trim() !== '');
      const procString = validProcedures.map(p => p.code?.text).join(', ');

      // Procedure section removed - individual Procedure resources are already included in the bundle
      // No need to add redundant "Procedures" section to Composition
    }

    
  
    // ==========================================================================
    // 4. BUNDLE ASSEMBLY - Reorder to match pkujogja.json
    // ==========================================================================

    // Urutan sesuai json_sukses_2.json:
    // 1. Patient
    // 2. Organization
    // 3. Practitioner
    // 4. MedicationRequest (array)
    // 5. Composition
    // 6. Condition
    // 7. Encounter
    // 8. Procedure (array)
    // 9. null, null

    const orderedEntries = [
      // 1. Patient
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Patient'),

      // 2. Organization
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Organization'),

      // 3. Practitioner
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Practitioner'),

      // 4. MedicationRequest (now with array structure)
      ...finalEntries.filter(entry => Array.isArray(entry.resource) && entry.resource[0]?.resourceType === 'MedicationRequest'),

      // 5. Observation (linked to DiagnosticReport)
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Observation'),

      // 6. Composition
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Composition'),

      // 7. Condition (ada beberapa Condition)
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Condition'),

      // 8. Encounter
      ...finalEntries.filter(entry => entry.resource?.resourceType === 'Encounter'),

      // 9. Procedure (now wrapped in arrays)
      ...finalEntries.filter(entry => Array.isArray(entry.resource) && entry.resource[0]?.resourceType === 'Procedure'),

      // 10. DiagnosticReport (Laboratory & Radiology) - moved to last position
      ...finalEntries.filter(entry => Array.isArray(entry.resource) && entry.resource[0]?.resourceType === 'DiagnosticReport')
    ];

    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: endTime
      },
      identifier: {
        use: null,
        type: { coding: [], text: null },
        system: 'SEP',
        value: data.no_sep,
        assigner: { display: null }
      },
      type: 'Document',
      entry: orderedEntries
    };

    // DEBUG: Final bundle composition section check
    console.log('=== FINAL BUNDLE COMPOSITION DEBUG ===');
    const compositionEntry = bundle.entry.find(entry => entry.resource?.resourceType === 'Composition');
    if (compositionEntry) {
      console.log('Composition entry found!');
      console.log('Composition section type:', typeof compositionEntry.resource.section);
      console.log('Composition section isArray:', Array.isArray(compositionEntry.resource.section));
      console.log('Composition section keys:', Object.keys(compositionEntry.resource.section));
      console.log('Composition section structure:', JSON.stringify(compositionEntry.resource.section, null, 2));
    } else {
      console.log('❌ No composition entry found in bundle!');
    }

    console.log('✅ Validated BPJS Bundle Generated (Dynamic SIP & NIK Practitioner):', bundle);
    return bundle;

  } catch (error) {
    console.error('Error generating bundle:', error);
    return null;
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
  // Get actual SEP number from visit data
  const validSep = selectedVisitData.value?.no_sep || visitDetails.value?.sep?.noSep || ''

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

    // Get poli name for organization name
    const kdPoli = visitDetails.value?.reg_periksa?.kd_poli || data.kd_poli
    const poliMapping: { [key: string]: string } = {
      'INT': 'Poli Penyakit Dalam',
      'ANA': 'Poli Anak',
      'OBG': 'Poli Kebidanan dan Kandungan',
      'MATA': 'Poli Mata',
      'THT': 'Poli Telinga Hidung Tenggorokan',
      'JANTUNG': 'Poli Jantung',
      'PARU': 'Poli Paru',
      'SARAF': 'Poli Saraf',
      'GIGI': 'Poli Gigi dan Mulut',
      'KULIT': 'Poli Kulit dan Kelamin',
      'UMUM': 'Poli Umum',
      'FISIO': 'Poli Fisioterapi'
    }

    const poliNameFromMapping = kdPoli ? (poliMapping[kdPoli] || '') : ''
    const poliName = visitDetails.value?.poli?.nm_poli ||
                    data.nm_poli ||
                    poliNameFromMapping ||
                    ''

    const organizationName = poliName ? `${poliName} - ${namaRumahSakit}` : namaRumahSakit

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
      "request": {
        "noSep": validSep,
        "jnsPelayanan": selectedVisitData.value.jnspelayanan || '1',
        "bulan": String(currentDate.getMonth() + 1).padStart(2, '0'),
        "tahun": String(currentDate.getFullYear()),
        "dataMR": patientResource  // Send as object (backend will handle encryption/compression)
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

// Custom Animations untuk Toast
// Custom Animations untuk Toast - moved to onMounted to fix SSR
let toastStylesAdded = false

const addToastStyles = () => {
  if (typeof window !== 'undefined' && document && !toastStylesAdded) {
    const style = document.createElement('style')
style.textContent = `
  @keyframes shake-once {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }

  @keyframes bounce-in {
    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.05); }
    70% { transform: translate(-50%, -50%) scale(0.9); }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  @keyframes shake-once {
    0%, 100% { transform: translate(-50%, -50%) translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-50%, -50%) translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translate(-50%, -50%) translateX(2px); }
  }

  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse-once {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .animate-shake-once { animation: shake-once 0.5s ease-in-out; }
  .animate-bounce-in { animation: bounce-in 0.6s ease-out; }
  .animate-spin-slow { animation: spin-slow 2s linear infinite; }
  .animate-pulse-once { animation: pulse-once 0.3s ease-in-out; }
  .animate-bounce { animation: bounce 1s ease-in-out infinite; }

  /* Ensure z-index works properly */
  .z-\[9999\] { z-index: 9999 !important; }

  /* Fix transition for removal */
  [id^="toast-"] {
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
`
  document.head.appendChild(style)
    toastStylesAdded = true
  }
}

// Helper functions for medication request processing
function getAdditionalInstruction(obat: any): string {
  console.log('🔍 getAdditionalInstruction called with obat:', JSON.stringify(obat, null, 2))

  if (!obat) {
    console.log('❌ No obat data provided')
    return "Tidak ada instruksi tambahan"
  }

  console.log('📋 Processing obat data:', {
    tipe_rawatan: obat.tipe_rawatan,
    kode_brng: obat.kode_brng,
    nama_brng: obat.nama_brng,
    aturan_pakai: obat.aturan_pakai,
    jenis_resep: obat.jenis_resep,
    status_resep: obat.status_resep
  })

  // Rawat Inap - use dosis field from resep_pulang table
  if (obat.tipe_rawatan === 'Rawat Inap') {
    const result = obat.dosis || "Tidak ada instruksi tambahan"
    console.log('🏥 Rawat Inap - returning:', result)
    return result
  }

  // Rawat Jalan - check different sources for aturan pakai
  if (obat.tipe_rawatan === 'Rawat Jalan') {
    // Check if it's compound medication (racikan)
    if (obat.jenis_resep === 'Racik') {
      console.log('🧪 Processing racikan medication')
      // For compound medications from resep_dokter_racikan
      if (obat.aturan_pakai && obat.aturan_pakai.aturan) {
        const result = obat.aturan_pakai.aturan
        console.log('✅ Racikan (object.aturan):', result)
        return result
      }
      if (obat.aturan_pakai && obat.keterangan_aturan) {
        const result = obat.keterangan_aturan
        console.log('✅ Racikan (keterangan_aturan):', result)
        return result
      }
      const result = "Dikonsumsi sesuai kebutuhan"
      console.log('⚠️ Racikan (default):', result)
      return result
    }

    // Non-compound medication from resep_dokter table
    if (obat.jenis_resep === 'Non Racik') {
      console.log('💊 Processing non-racikan medication')
      // Check if aturan_pakai is a string (from resep_dokter.aturan_pakai)
      if (obat.aturan_pakai) {
        if (typeof obat.aturan_pakai === 'string') {
          const result = obat.aturan_pakai
          console.log('✅ Non-racikan (string):', result)
          return result
        }
        // If it's an object, try to get aturan property
        if (typeof obat.aturan_pakai === 'object' && obat.aturan_pakai.aturan) {
          const result = obat.aturan_pakai.aturan
          console.log('✅ Non-racikan (object.aturan):', result)
          return result
        }
      }
      const result = "-"
      console.log('⚠️ Non-racikan (default):', result)
      return result
    }

    // Fallback for other structures (backward compatibility)
    console.log('🔄 Using fallback logic')
    // Priority 1: aturan_pakai from detail_pemberian_obat (compound medications)
    if (obat.aturan_pakai && obat.aturan_pakai.aturan) {
      const result = obat.aturan_pakai.aturan
      console.log('✅ Fallback (object.aturan):', result)
      return result
    }

    // Priority 2: aturan_pakai as string
    if (obat.aturan_pakai && typeof obat.aturan_pakai === 'string') {
      const result = obat.aturan_pakai
      console.log('✅ Fallback (string):', result)
      return result
    }

    // Priority 3: Check by status_resep
    if (obat.status_resep === 'Racik') {
      const result = obat.keterangan_aturan || obat.aturan_pakai?.aturan || "Dikonsumsi sesuai kebutuhan"
      console.log('✅ Fallback (status_resep=Racik):', result)
      return result
    }

    // Default fallback
    const result = "Dikonsumsi sesuai kebutuhan"
    console.log('⚠️ Default fallback:', result)
    return result
  }

  // Final fallback - this should never be reached but TypeScript requires it
  return "Tidak ada instruksi tambahan"
}

function getRouteCode(medicationName: string): string {
  if (!medicationName) return "26643006" // Default oral route

  const name = medicationName.toLowerCase()

  if (name.includes('injek') || name.includes('suntik') || name.includes('injeksi')) {
    return "47625008" // Intravenous route
  } else if (name.includes('tablet') || name.includes('kaplet') || name.includes('pil')) {
    return "26643006" // Oral route
  } else if (name.includes('kapsul') || name.includes('capsule')) {
    return "26643006" // Oral route
  } else if (name.includes('sirup') || name.includes('cair') || name.includes('liquid')) {
    return "26643006" // Oral route
  } else if (name.includes('salep') || name.includes('krim') || name.includes('cream') || name.includes('ointment')) {
    return "421021004" // Topical route
  } else if (name.includes('tetes') || name.includes('drop') || name.includes('eye') || name.includes('mata')) {
    return "54485007" // Ophthalmic route
  } else if (name.includes('suppositoria') || name.includes('suppo')) {
    return "37161004" // Rectal route
  }

  return "26643006" // Default to oral route
}

function getRouteDisplay(medicationName: string): string {
  if (!medicationName) return "Oral Route"

  const name = medicationName.toLowerCase()

  if (name.includes('injek') || name.includes('suntik') || name.includes('injeksi')) {
    return "Intravenous Route"
  } else if (name.includes('tablet') || name.includes('kaplet') || name.includes('pil')) {
    return "Oral Route"
  } else if (name.includes('kapsul') || name.includes('capsule')) {
    return "Oral Route"
  } else if (name.includes('sirup') || name.includes('cair') || name.includes('liquid')) {
    return "Oral Route"
  } else if (name.includes('salep') || name.includes('krim') || name.includes('cream') || name.includes('ointment')) {
    return "Topical Route"
  } else if (name.includes('tetes') || name.includes('drop') || name.includes('eye') || name.includes('mata')) {
    return "Ophthalmic Route"
  } else if (name.includes('suppositoria') || name.includes('suppo')) {
    return "Rectal Route"
  }

  return "Oral Route"
}

function getDosageFrequency(medicationName: string): number {
  if (!medicationName) return 1 // Default once daily

  const name = medicationName.toLowerCase()

  if (name.includes('1x1') || name.includes('sehari sekali')) {
    return 1
  } else if (name.includes('2x1') || name.includes('dua kali sehari')) {
    return 2
  } else if (name.includes('3x1') || name.includes('tiga kali sehari')) {
    return 3
  } else if (name.includes('4x1') || name.includes('empat kali sehari')) {
    return 4
  }

  return 1 // Default once daily
}

function getMedicationFormCode(medicationName: string): string {
  if (!medicationName) return "385055001" // Default tablet form

  const name = medicationName.toLowerCase()

  if (name.includes('tablet') || name.includes('kaplet') || name.includes('pil')) {
    return "385055001" // Tablet
  } else if (name.includes('kapsul') || name.includes('capsule')) {
    return "385056004" // Capsule
  } else if (name.includes('sirup') || name.includes('cair') || name.includes('liquid')) {
    return "385263001" // Liquid
  } else if (name.includes('salep') || name.includes('krim') || name.includes('cream') || name.includes('ointment')) {
    return "385049006" // Ointment
  } else if (name.includes('injek') || name.includes('suntik') || name.includes('injeksi')) {
    return "385219200" // Injection solution
  } else if (name.includes('tetes') || name.includes('drop')) {
    return "440145006" // Drops
  }

  return "385055001" // Default to tablet
}

function getMedicationFormDisplay(medicationName: string): string {
  if (!medicationName) return "Tablet"

  const name = medicationName.toLowerCase()

  if (name.includes('tablet') || name.includes('kaplet') || name.includes('pil')) {
    return "Tablet"
  } else if (name.includes('kapsul') || name.includes('capsule')) {
    return "Capsule"
  } else if (name.includes('sirup') || name.includes('cair') || name.includes('liquid')) {
    return "Liquid"
  } else if (name.includes('salep') || name.includes('krim') || name.includes('cream') || name.includes('ointment')) {
    return "Ointment"
  } else if (name.includes('injek') || name.includes('suntik') || name.includes('injeksi')) {
    return "Injection Solution"
  } else if (name.includes('tetes') || name.includes('drop')) {
    return "Drops"
  }

  return "Tablet"
}

// Add styles on client-side mount
onMounted(() => {
  addToastStyles()

  // Add scroll listener for floating navigation
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Initial check
  handleScroll()
})

</script>