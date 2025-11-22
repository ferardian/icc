// BPJS MINIMAL BUNDLE - Test untuk JObject to JArray Error
// Berdasarkan bundle.json reference yang berhasil

async function generateMinimalBPJSBundle() {
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
  const jnsPelayanan = data.jnspelayanan === 'Ralan' ? '2' : '1'

  const bundle = {
    resourceType: 'Bundle',
    id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
    meta: {
      lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 19)
    },
    identifier: {
      use: null,
      type: {
        coding: [],
        text: null
      },
      system: 'SEP',
      value: data.no_sep || 'SEP001',
      assigner: {
        display: null
      }
    },
    type: 'Document',
    entry: [
      {
        // HANYA SATU ENTRY dengan Patient resource untuk test
        resource: {
          resourceType: 'Patient',
          id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
          identifier: [
            {
              use: 'usual',
              type: {
                coding: [{
                  system: 'http://hl7.org/fhir/v2/0203',
                  code: 'MR',
                  display: null  // EXPLISIT null seperti bundle reference
                }],
                text: ''
              },
              system: null,  // EXPLISIT null seperti bundle reference
              value: data.no_rkm_medis || 'RM001',
              assigner: {
                display: namaRumahSakit
              }
            }
          ],
          active: true,
          name: [{
            use: 'official',
            text: data.nm_pasien || data.nama_pasien || 'Unknown Patient'
          }],
          gender: data.jk === 'L' ? 'male' : 'female',
          birthDate: data.tgl_lahir || null
        }
      }
    ]
  }

  console.log('=== MINIMAL BPJS Bundle Test ===')
  console.log('Minimal bundle:', JSON.stringify(bundle, null, 2))
  console.log('=== End Minimal Test ===')

  return bundle
}

// Test function
async function testMinimalBPJSBundle() {
  try {
    console.log('=== Testing MINIMAL BPJS Bundle ===')
    const bundle = await generateMinimalBPJSBundle()
    console.log('Minimal bundle generated successfully')
    return bundle
  } catch (error) {
    console.error('Error generating minimal bundle:', error)
    return null
  }
}