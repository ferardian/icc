// get value from cara_pulang.json on public with passing label 
export async function getCaraPulangByLabel(label: string | undefined) {
  const config = useRuntimeConfig()
  const baseURL = config.app.baseURL || '/'
  const fetchPath = `${baseURL}cara_pulang.json`.replace(/\/+/g, '/')

  const data = await fetch(fetchPath).then((res) => res.json());

  if (!Array.isArray(data)) {
    console.error('cara_pulang.json is not an array:', data)
    return { value: null, label: null }
  }

  const result = data.find((item: any) => item.label === label);
  return result ? result : { value: null, label: null };
} 