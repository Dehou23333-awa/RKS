export function getProxiedUrl(originalUrl) {
  if (!originalUrl) return originalUrl

  const proxyType = localStorage.getItem('githubProxyType')
  const proxyUrl = localStorage.getItem('githubProxy')

  // 允许的主机名列表
  const allowedHosts = ['github.com', 'githubusercontent.com']

  // 检查主机名是否允许
  function isAllowedHost(url) {
    try {
      const { hostname } = new URL(url)
      return allowedHosts.some(host => hostname === host || hostname.endsWith('.' + host))
    } catch {
      return false
    }
  }

  // 检查是否要使用代理
  if ((proxyType === 'preset' || proxyType === 'custom') && proxyUrl) {
    if (isAllowedHost(originalUrl)) {
      return proxyUrl + originalUrl
    }
  }
  return originalUrl // 不使用代理
}