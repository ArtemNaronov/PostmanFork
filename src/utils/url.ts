/** Normalize base URL (no trailing slash) */
export function normalizeBaseUrl(base: string): string {
  const t = base.trim().replace(/\/+$/, '')
  return t
}

/** Разрешены только http/https (защита от javascript:, data:, file: и смешанных схем). */
export function assertHttpOrHttpsUrl(urlString: string): string {
  let u: URL
  try {
    u = new URL(urlString)
  } catch {
    throw new Error('Некорректный URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Разрешены только адреса с протоколом http:// или https://')
  }
  return u.href
}

/** Build final URL from optional base and path or full URL */
export function resolveRequestUrl(base: string | null, pathOrUrl: string): string {
  const raw = pathOrUrl.trim()
  if (!raw) throw new Error('Укажите адрес запроса')
  let resolved: string
  if (/^https?:\/\//i.test(raw)) {
    resolved = raw
  } else if (!base) {
    if (raw.startsWith('/')) {
      throw new Error(
        'Выберите сохранённый базовый URL в боковой панели (выпадающий список «Базовый URL») или введите полный адрес, начиная с https://',
      )
    }
    resolved = `https://${raw}`
  } else {
    const b = normalizeBaseUrl(base)
    const p = raw.startsWith('/') ? raw : `/${raw}`
    resolved = `${b}${p}`
  }
  return assertHttpOrHttpsUrl(resolved)
}

/** Базовый URL из формы: при отсутствии схемы подставляется https:// */
export function normalizeUserBaseUrl(input: string): string {
  const t = input.trim()
  if (!t) throw new Error('Укажите адрес базы')
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  return assertHttpOrHttpsUrl(withScheme)
}
