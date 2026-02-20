<template>
  <div class="song-browser">
    <header class="header">
      <div class="header-top">
        <div class="title-section">
          <button @click="goHome" class="home-btn">返回首页</button>
          <h1 class="title">Phigros 全曲目</h1>
          <button @click="showProxySettings = true" class="settings-btn" title="代理设置">
            ⚙️
          </button>
        </div>
      </div>
      <div class="search-container">
        <input v-model="searchTerm" type="text" placeholder="搜索歌曲名或作曲家..." class="search-input" @input="handleSearch" />
        <div class="search-icon">🔍</div>
      </div>
    </header>

    <!-- 代理设置组件 -->
    <ProxySettings 
      :show="showProxySettings" 
      @close="showProxySettings = false" 
      @save="handleProxySave"
      ref="proxySettingsRef"
    />

    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="pending" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error">
        <p>❌ 加载失败: {{ error.message }}</p>
        <button @click="refresh()" class="retry-btn">重试</button>
      </div>

      <!-- 歌曲列表 -->
      <div v-else class="songs-container">
        <div v-if="data?.songs?.length === 0" class="no-results">
          <p>🔍 没有找到匹配的歌曲</p>
        </div>

        <div v-else class="songs-grid">
          <div v-for="song in data?.songs" :key="song.id" class="song-card">
            <div class="song-illustration">
              <img :src="getIllustrationUrl(song.id)" :alt="`${song.name} 曲绘`" class="illustration-img"
                @error="handleImageError" loading="lazy" />
            </div>

            <div class="song-header">
              <h3 class="song-title" :title="song.name">{{ song.name || '未知歌曲' }}</h3>
              <div class="song-meta">
                <span class="composer" :title="song.composer">🎵 {{ song.composer || '未知作曲家' }}</span>
                <span class="illustrator" :title="song.illustrator">🎨 {{ song.illustrator || '未知插画师' }}</span>
              </div>
            </div>

            <div class="charts-container">
              <div v-for="(chart, difficulty) in song.charts" :key="difficulty" class="chart-item" :class="{
                'has-chart': chart
              }" @click="chart && downloadSong(song.id, difficulty)">
                <div class="difficulty-label" :class="`difficulty-${difficulty.toLowerCase()}`">
                  {{ difficulty }}
                </div>
                <div v-if="chart" class="chart-info">
                  <span class="difficulty-number">{{ chart.difficulty || '-' }}</span>
                  <span class="charter" :title="chart.charter || '未知'">{{ chart.charter || '未知' }}</span>
                </div>
                <div v-else class="no-chart">-</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="data?.pagination" class="pagination">
          <button @click="goToPage(data.pagination.page - 1)" :disabled="data.pagination.page <= 1" class="page-btn">
            ‹ 上一页
          </button>

          <div class="page-numbers">
            <button v-for="pageNum in getPageNumbers()" :key="pageNum" @click="goToPage(pageNum)"
              :class="{ active: pageNum === data.pagination.page }" class="page-number">
              {{ pageNum }}
            </button>
          </div>

          <button @click="goToPage(data.pagination.page + 1)"
            :disabled="data.pagination.page >= data.pagination.totalPages" class="page-btn">
            下一页 ›
          </button>

          <div class="page-info">
            第 {{ data.pagination.page }} / {{ data.pagination.totalPages }} 页
            (共 {{ data.pagination.total }} 首歌曲)
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
useHead({
  title: 'Phigros 全曲目浏览 | RKS',
  meta: [
    { name: 'description', content: '浏览 Phigros 全部曲目，查看歌曲信息、难度、谱面和下载资源。' },
    { name: 'keywords', content: 'Phigros,曲目列表,歌曲下载,谱面预览,音游曲库' },
    { property: 'og:title', content: 'Phigros 全曲目浏览 | RKS' },
    { property: 'og:description', content: '浏览 Phigros 全部曲目，查看歌曲信息、难度、谱面和下载资源。' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
})
import ProxySettings from '~/components/ProxySettings.vue'

const searchTerm = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 代理设置状态
const showProxySettings = ref(false)
const proxySettingsRef = ref(null)

// 处理代理设置保存
const handleProxySave = (proxyConfig) => {
  showProxySettings.value = false
  refresh()
}

// 获取代理后的URL
const getProxiedUrl = (url) => {
  if (proxySettingsRef.value) {
    return proxySettingsRef.value.applyProxy(url)
  }
  return url
}

// 搜索防抖
const searchDebounced = ref('')
let searchTimeout = null

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchDebounced.value = searchTerm.value
    currentPage.value = 1
  }, 300)
}

const goHome = () => {
  navigateTo('/')
}

// API调用
const { data, pending, error, refresh } = await useFetch('/api/songs', {
  query: computed(() => ({
    page: currentPage.value,
    limit: pageSize.value,
    search: searchDebounced.value
  })),
  server: false
})

// 获取曲绘URL
const getIllustrationUrl = (songId) => {
  const url = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${songId}.png`
  return getProxiedUrl(url)
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNhMGFlYzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7mm7LntLXliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+'
}

// 下载功能 - 通过服务端打包
const downloadSong = (songId, difficulty) => {
  window.open(`/api/download-pez?songId=${encodeURIComponent(songId)}&difficulty=${encodeURIComponent(difficulty)}`, '_blank')
}

// 分页相关
const goToPage = (page) => {
  if (page >= 1 && page <= data.value?.pagination?.totalPages) {
    currentPage.value = page
  }
}

const getPageNumbers = () => {
  if (!data.value?.pagination) return []

  const { page, totalPages } = data.value.pagination
  const pages = []
  const maxVisible = 5

  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return pages
}
</script>

<style>
/* --- CSS Variables for Theming --- */
:root {
  --bg-primary: #12121c;         /* Deep space blue */
  --bg-secondary: #1a1a2e;       /* Slightly lighter blue for cards */
  --bg-tertiary: #2a2a4a;        /* Interactive elements bg */
  --accent-primary: #00e5ff;       /* Bright cyan accent */
  --accent-secondary: #e94560;     /* Contrasting pink/red accent */
  --text-primary: #f0f2f5;        /* Main text color */
  --text-secondary: #a0aec0;      /* Muted/secondary text */
  --border-color: #3a3a5a;
  --success-color: #4caf50;
  --error-color: #f44336;
  --font-family: 'Helvetica Neue', Arial, 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --border-radius: 8px;
  --box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  --transition-fast: all 0.2s ease-in-out;
}

/* --- Global & Base Styles --- */
.song-browser {
  font-family: var(--font-family);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  padding-bottom: 2rem;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font-family: inherit;
}

/* --- Header & Search --- */
.header {
  background-color: rgba(26, 26, 46, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-color);
}

.header-top {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
  text-shadow: 0 0 5px var(--accent-primary), 0 0 10px var(--accent-secondary);
  margin: 0;
  text-align: center;
  flex-grow: 1;
}

.home-btn, .settings-btn {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: var(--border-radius);
  transition: var(--transition-fast);
  color: var(--text-secondary);
}

.home-btn:hover, .settings-btn:hover {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.settings-btn {
  font-size: 1.5rem;
  padding: 0.25rem 0.5rem;
}

.search-container {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.search-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.3);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

/* --- Main Content Area --- */
.main-content {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.loading, .error, .no-results {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-secondary);
  font-size: 1.2rem;
}

.error {
  color: var(--error-color);
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--accent-secondary);
  color: var(--text-primary);
  border-radius: var(--border-radius);
  font-weight: 600;
  transition: var(--transition-fast);
}

.retry-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- Songs Grid & Cards --- */
.songs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.song-card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  border: 1px solid var(--border-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
}

.song-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 229, 255, 0.2);
}

.song-illustration {
  position: relative;
  aspect-ratio: 16 / 9;
}

.illustration-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background-color: var(--bg-tertiary); /* Placeholder bg */
}


.song-header {
  padding: 0.75rem 1rem;
}

.song-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.song-meta span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: auto; /* Push to bottom */
  border-top: 1px solid var(--border-color);
}

.chart-item {
  padding: 0.5rem;
  text-align: center;
  background-color: rgba(0,0,0,0.2);
  border-left: 1px solid var(--border-color);
  opacity: 0.5;
  transition: var(--transition-fast);
  position: relative;
}
.chart-item:first-child {
  border-left: none;
}

.chart-item.has-chart {
  opacity: 1;
  cursor: pointer;
}

.chart-item.has-chart:hover {
  background-color: var(--bg-tertiary);
}

.difficulty-label {
  font-weight: 700;
  font-size: 0.9rem;
}
.difficulty-ez { color: #81c784; }
.difficulty-hd { color: #4fc3f7; }
.difficulty-in { color: #ba68c8; }
.difficulty-at { color: #e57373; }
.difficulty-sp { color: #ffd54f; }


.chart-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.charter {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.no-chart {
  font-size: 1.2rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* --- Pagination --- */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 2.5rem;
}

.page-btn, .page-number {
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  background-color: var(--bg-tertiary);
  transition: var(--transition-fast);
}

.page-btn:hover:not(:disabled), .page-number:hover:not(.active) {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-number.active {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  font-weight: 700;
}

.page-info {
  margin-left: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
}

/* --- Responsive Adjustments --- */
@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }
  .main-content {
    padding: 1rem;
  }
  .title {
    font-size: 1.5rem;
  }
  .home-btn {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .songs-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .title-section {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .title {
    order: 1;
    width: 100%;
  }
  .home-btn { order: 2; }
  .settings-btn { order: 3; }
  
  .pagination {
    flex-direction: column;
    gap: 1rem;
  }
  .page-info {
    margin-left: 0;
  }
}
</style>