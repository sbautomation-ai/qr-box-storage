export function safeReturnTo(value: string | null) {
  const fallback = '/boxes'
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  const url = new URL(value, 'https://app.invalid')
  if (url.origin !== 'https://app.invalid') return fallback
  if (/^\/boxes(?:\/[\w-]+)?$/.test(url.pathname)
    || /^\/join\/[\w-]+$/.test(url.pathname)
    || ['/settings', '/setup-required', '/account/delete', '/account/withdraw'].includes(url.pathname)) {
    return url.pathname + url.search
  }
  return fallback
}

export function authLink(mode: 'login' | 'signup', returnTo: string) {
  return `/${mode}?${new URLSearchParams({ returnTo })}`
}
