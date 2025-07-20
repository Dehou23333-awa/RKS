export function getProxiedUrl(originalUrl) {
  if (!originalUrl) return originalUrl

  const proxyType = localStorage.getItem('githubProxyType')
  const proxyUrl = localStorage.getItem('githubProxy')

  // 检查是否要使用代理
  if (proxyType === 'preset' || proxyType === 'custom') {
    if (proxyUrl && (originalUrl.includes('github.com') || originalUrl.includes('githubusercontent.com'))) {
      return proxyUrl + originalUrl
    }
  }
  return originalUrl // 不使用代理
}