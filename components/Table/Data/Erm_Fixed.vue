// BPJS FHIR Bundle Structure - PERBAIKI
// Ini adalah fungsi sementara untuk membuat structure yang benar

async function generateFhirBundleBPJS() {
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
      type: { coding: [], text: null },
      system: 'SEP',
      value: data.no_sep || 'SEP001',
      assigner: { display: null }
    },
    type: 'Document',
    entry: [
      {
        resource: [
          // Patient Resource
          {
            resourceType: 'Patient',
            id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
            identifier: [
              {
                use: 'usual',
                type: {
                  coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'MR', display: null }],
                  text: ''
                },
                system: null,
                value: data.no_rkm_medis || 'RM001',
                assigner: { display: namaRumahSakit }
              },
              {
                use: 'official',
                type: {
                  coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'MB', display: null }],
                  text: 'Nomor Peserta BPJS Kesehatan'
                },
                system: null,
                value: data.no_peserta || '',
                assigner: { display: 'BPJS Kesehatan' }
              },
              {
                use: 'official',
                type: {
                  coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'NNIDN', display: null }],
                  text: 'NIK'
                },
                system: null,
                value: data.no_ktp || '',
                assigner: { display: 'KEMENDAGRI' }
              }
            ],
            active: true,
            name: [{ use: 'official', text: data.nm_pasien || data.nama_pasien || 'Unknown Patient' }],
            maritalStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                  code: data.stts_nikah === 'M' ? 'M' : 'U',
                  display: data.stts_nikah === 'M' ? 'KAWIN' : 'BELUM KAWIN'
                }
              ],
              text: null
            },
            telecom: [{ system: 'phone', value: data.no_tlp || '', use: 'mobile' }],
            gender: data.jk === 'L' ? 'male' : 'female',
            birthDate: data.tgl_lahir || null,
            deceasedBoolean: false,
            address: [{
              line: [data.alamat || 'Alamat Pasien'],
              city: data.nm_kab || data.kabupatenpj || data.kabupaten || 'Kabupaten',
              district: data.nm_kec || data.kecamatanpj || data.kecamatan || 'Kecamatan',
              state: data.nm_prop || data.propinsipj || data.propinsi || 'Provinsi',
              postalCode: data.kd_pos || '00000',
              text: data.alamat || 'Alamat Pasien',
              use: 'home',
              type: 'both'
            }]
          },
          // Organization Resource
          {
            resourceType: 'Organization',
            id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
            identifier: [
              { use: 'official', type: { coding: [], text: null }, system: null, value: kodeFaskesBpjs, assigner: { display: null } },
              { use: 'official', type: { coding: [], text: null }, system: null, value: kodeKemenkes, assigner: { display: null } }
            ],
            type: [{
              coding: [{
                system: 'http://hl7.org/fhir/organization-type',
                code: 'prov',
                display: 'Healthcare Provider'
              }],
              text: namaRumahSakit
            }],
            name: namaRumahSakit,
            alias: [namaRumahSakit],
            telecom: hospitalSetting.kontak ? [{ system: 'phone', value: hospitalSetting.kontak, use: 'work' }] : [],
            address: [{
              use: 'work',
              type: 'physical',
              text: hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123',
              line: [hospitalSetting.alamat_instansi || 'Jl. Pekajangan No. 123'],
              city: hospitalSetting.kabupaten || 'Kabupaten Pekalongan',
              district: hospitalSetting.kecamatan || 'Kecamatan Kedungwuni',
              state: hospitalSetting.propinsi || 'Provinsi Jawa Tengah',
              postalCode: hospitalSetting.kode_pos || '51161',
              country: 'IDN'
            }]
          },
          // Practitioner Resource (if available)
          ...(data.dpjp ? [{
            resourceType: 'Practitioner',
            id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
            identifier: [
              { use: 'official', type: { coding: [], text: null }, system: null, value: data.no_sip || '', assigner: { display: null } },
              {
                use: 'official',
                type: {
                  coding: [{ system: 'http://hl7.org/fhir/v2/0203', code: 'NNIDN', display: null }],
                  text: null
                },
                system: null,
                value: data.no_nik_dokter || '',
                assigner: { display: 'KEMENDAGRI' }
              }
            ],
            name: [{ use: 'official', text: data.dpjp }],
            telecom: [
              { system: 'phone', value: data.telp_dokter || '', use: 'work' },
              { system: 'email', value: data.email_dokter || '', use: 'work' }
            ]
          }] : []),
          // Encounter Resource
          {
            resourceType: 'Encounter',
            id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
            identifier: [{ use: null, type: { coding: [], text: null }, system: null, value: data.no_sep, assigner: { display: null } }],
            subject: { reference: `Patient/${generateUUID()}`, display: data.nm_pasien, noSep: data.no_sep },
            class: {
              system: 'http://hl7.org/fhir/v3/ActCode',
              code: data.jnspelayanan === 'Ralan' ? 'AMB' : 'IMP',
              display: data.jnspelayanan === 'Ralan' ? 'ambulatory' : 'inpatient encounter'
            },
            period: {
              start: data.tgl_registrasi ? new Date(data.tgl_registrasi).toISOString() : new Date().toISOString(),
              end: new Date().toISOString()
            },
            status: 'finished'
          },
          // Composition Resource
          {
            resourceType: 'Composition',
            id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
            status: 'final',
            type: {
              coding: [{ system: 'http://loinc.org', code: '81218-0' }],
              text: 'Discharge Summary'
            },
            subject: { reference: `Patient/${generateUUID()}`, display: data.nm_pasien || 'Unknown Patient' },
            encounter: { reference: `Encounter/${generateUUID()}` },
            date: new Date().toISOString().replace('T', ' ').slice(0, 19),
            title: 'Discharge Summary',
            confidentiality: 'N',
            section: {
              '1': {
                title: 'Reason for admission',
                code: {
                  coding: [{
                    system: 'http://loinc.org',
                    code: '29299-5',
                    display: 'Reason for visit Narrative'
                  }],
                  text: null
                },
                text: { status: 'additional', div: data.keluhan || 'Tidak ada keluhan khusus' },
                mode: 'working',
                entry: { reference: `Encounter/${generateUUID()}` }
              },
              '2': {
                title: 'Discharge Diagnosis',
                code: {
                  coding: [{
                    system: 'http://loinc.org',
                    code: '11535-2',
                    display: 'Hospital Discharge Diagnosis'
                  }],
                  text: null
                },
                text: { status: 'additional', div: data.diagnosa || 'Tidak ada diagnosa' },
                mode: 'working',
                entry: { reference: `Encounter/${generateUUID()}` }
              }
            }
          },
          // Condition Resources (diagnoses)
          ...(data.diagnosa || data.penyakit ? (() => {
            const diagnosisText = data.diagnosa || data.penyakit || ''
            const diagnoses = diagnosisText.includes(',') ?
              diagnosisText.split(',').map(d => d.trim()) :
              [diagnosisText.trim()]

            return diagnoses.filter(Boolean).map((diagnosis: any) => ({
              resourceType: 'Condition',
              id: `${kodeFaskesBpjs}-${kodeKemenkes}-${jnsPelayanan}-${generateUUID()}`,
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
                  code: data.kd_penyakit || 'Z00.0',
                  display: diagnosis
                }],
                text: diagnosis
              },
              subject: { reference: `Patient/${generateUUID()}` },
              onsetDateTime: data.tgl_registrasi ? new Date(data.tgl_registrasi).toISOString() : new Date().toISOString()
            }))
          })() : [])
        ]
      }
    ]
  }

  return bundle
}