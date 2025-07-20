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
              <div class="play-overlay" @click.stop="toggleMusic(song)">
                <div class="play-btn" :class="{ playing: currentPlayingSong?.id === song.id && !musicPaused }">
                  {{ currentPlayingSong?.id === song.id && !musicPaused ? '⏸️' : '▶️' }}
                </div>
              </div>
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
                'has-chart': chart,
                'downloading': downloadingSongs[`${song.id}-${difficulty}`]
              }" @click="chart && downloadSong(song, difficulty)">
                <div class="difficulty-label" :class="`difficulty-${difficulty.toLowerCase()}`">
                  {{ difficulty }}
                </div>
                <div v-if="chart" class="chart-info">
                  <span class="difficulty-number">{{ chart.difficulty || '-' }}</span>
                  <span class="charter" :title="chart.charter || '未知'">{{ chart.charter || '未知' }}</span>
                  <div v-if="downloadingSongs[`${song.id}-${difficulty}`]" class="download-indicator">
                    ⏳
                  </div>
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

    <!-- 音乐播放器 -->
    <div v-if="currentPlayingSong" class="music-player">
      <div class="player-content">
        <div class="player-info">
          <img :src="getIllustrationUrl(currentPlayingSong.id)" :alt="`${currentPlayingSong.name} 曲绘`"
            class="player-illustration" @error="handleImageError" />
          <div class="player-text">
            <div class="player-title">{{ currentPlayingSong.name }}</div>
            <div class="player-composer">{{ currentPlayingSong.composer }}</div>
          </div>
        </div>

        <div class="player-controls">
          <button @click="toggleMusic(currentPlayingSong)" class="control-btn play-pause">
            {{ musicPaused ? '▶️' : '⏸️' }}
          </button>
          <button @click="stopMusic" class="control-btn stop">⏹️</button>
        </div>

        <div class="player-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: musicProgress + '%' }"></div>
            <input type="range" min="0" max="100" v-model="musicProgress" @input="seekMusic" class="progress-slider" />
          </div>
          <div class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>
        </div>

        <div class="volume-control">
          <span class="volume-icon">🔊</span>
          <input type="range" min="0" max="100" v-model="volume" @input="setVolume" class="volume-slider" />
        </div>
      </div>
    </div>

    <!-- 音频元素 -->
    <audio ref="audioPlayer" @loadedmetadata="onAudioLoaded" @timeupdate="onTimeUpdate" @ended="onAudioEnded"
      @error="onAudioError" preload="none"></audio>

    <!-- 下载进度提示 -->
    <div v-if="Object.keys(downloadProgress).length > 0" class="download-toast">
      <div v-for="(progress, songKey) in downloadProgress" :key="songKey" class="download-item">
        <span>{{ progress.name }}</span>
        <span>{{ progress.percent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Phigros 全曲目浏览 | RKS',
  meta: [
    { name: 'description', content: '浏览 Phigros 全部曲目，查看歌曲信息、难度、谱面和下载资源。支持搜索和试听功能。' },
    { name: 'keywords', content: 'Phigros,曲目列表,歌曲下载,谱面预览,音游曲库' },
    { property: 'og:title', content: 'Phigros 全曲目浏览 | RKS' },
    { property: 'og:description', content: '浏览 Phigros 全部曲目，查看歌曲信息、难度、谱面和下载资源。支持搜索和试听功能。' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
})
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import ProxySettings from '~/components/ProxySettings.vue'

const searchTerm = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 下载相关状态
const downloadingSongs = ref({})
const downloadProgress = ref({})

// 代理设置状态
const showProxySettings = ref(false)
const proxySettingsRef = ref(null)

// 运行时配置
const config = useRuntimeConfig()
const githubApiToken = config.public.githubToken
const userAgentString = 'Dehou23333-awa/RKS'

// 音乐播放相关
const audioPlayer = ref(null)
const currentPlayingSong = ref(null)
const musicPaused = ref(true)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(50)
const musicProgress = computed({
  get: () => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
  set: (value) => {
    if (audioPlayer.value && duration.value > 0) {
      const time = (value / 100) * duration.value
      audioPlayer.value.currentTime = time
      currentTime.value = time
    }
  }
})

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

// 获取音乐URL
const getMusicUrl = (songId) => {
  const url = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/music/${songId}.ogg`
  return getProxiedUrl(url)
}

// 获取高清曲绘URL
const getIllustrationHDUrl = async (songId) => {
  const apiUrl = 'https://api.github.com/repos/7aGiven/Phigros_Resource/git/trees/illustration?recursive=1'
  const proxiedApiUrl = getProxiedUrl(apiUrl)

  try {
    const headers = { 'User-Agent': userAgentString }
    if (githubApiToken) {
      headers.Authorization = `Bearer ${githubApiToken}`
    }

    const response = await fetch(proxiedApiUrl, { headers })
    if (!response.ok) {
      console.error('Failed to fetch illustration tree:', response.status)
      return null
    }

    const data = await response.json()

    if (data.tree) {
      const foundItem = data.tree.find(item =>
        item.type === 'blob' &&
        item.path.startsWith(songId) &&
        item.path.toLowerCase().endsWith('.png')
      )
      if (foundItem) {
        const url = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/illustration/${foundItem.path}`
        return getProxiedUrl(url)
      }
    }
  } catch (error) {
    console.error('Error fetching illustration:', error)
  }
  return null
}

// 获取谱面文件URL
const getChartUrl = async (songId, difficulty) => {
  const chartUrl = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/chart/${songId}.0/${difficulty}.json`
  const proxiedUrl = getProxiedUrl(chartUrl)

  try {
    const response = await fetch(proxiedUrl, { method: 'HEAD' })
    if (response.ok) {
      return proxiedUrl
    }
  } catch (error) {
    console.error('Chart file not found:', error)
  }

  return null
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNhMGFlYzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7mm7LntrvliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+'
}

// 音乐播放控制
const toggleMusic = async (song) => {
  if (currentPlayingSong.value?.id === song.id) {
    if (musicPaused.value) {
      await audioPlayer.value.play()
      musicPaused.value = false
    } else {
      audioPlayer.value.pause()
      musicPaused.value = true
    }
  } else {
    if (currentPlayingSong.value) {
      audioPlayer.value.pause()
    }

    currentPlayingSong.value = song
    audioPlayer.value.src = getMusicUrl(song.id)

    try {
      await audioPlayer.value.load()
      await audioPlayer.value.play()
      musicPaused.value = false
    } catch (error) {
      console.error('音乐播放失败:', error)
      alert('音乐文件加载失败，可能该歌曲暂未提供音频文件')
      currentPlayingSong.value = null
      musicPaused.value = true
    }
  }
}

const stopMusic = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.currentTime = 0
    currentTime.value = 0
  }
  currentPlayingSong.value = null
  musicPaused.value = true
}

const seekMusic = (event) => {
  const value = parseFloat(event.target.value)
  if (audioPlayer.value && duration.value > 0) {
    const time = (value / 100) * duration.value
    audioPlayer.value.currentTime = time
  }
}

const setVolume = () => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value / 100
  }
}

// 音频事件处理
const onAudioLoaded = () => {
  duration.value = audioPlayer.value.duration || 0
  setVolume()
}

const onTimeUpdate = () => {
  currentTime.value = audioPlayer.value.currentTime || 0
}

const onAudioEnded = () => {
  musicPaused.value = true
  currentTime.value = 0
}

const onAudioError = (error) => {
  console.error('音频加载错误:', error)
  currentPlayingSong.value = null
  musicPaused.value = true
}

// 时间格式化
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 下载功能
const fetchAndAddFileToZip = async (zipInstance, url, fileNameInZip, friendlyName, isOptional = false) => {
  if (!url) {
    if (!isOptional) {
      throw new Error(`${friendlyName} URL is not available.`)
    } else {
      console.log(`Optional file ${friendlyName} URL not found, skipping.`)
      return
    }
  }

  console.log(`Fetching ${friendlyName}: ${url}`)
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Status: ${response.status} ${response.statusText}`)
    }
    const blob = await response.blob()
    zipInstance.file(fileNameInZip, blob)
    console.log(`Added ${fileNameInZip} to zip.`)
  } catch (error) {
    if (!isOptional) {
      throw new Error(`Failed to fetch ${friendlyName}: ${error.message}`)
    } else {
      console.warn(`Warning: Could not fetch optional file ${friendlyName} (${url}): ${error.message}. Continuing without it.`)
    }
  }
}

const downloadSong = async (song, difficulty) => {
  const downloadKey = `${song.id}-${difficulty}`;
  if (downloadingSongs.value[downloadKey]) return;

  downloadingSongs.value[downloadKey] = true;
  downloadProgress.value[downloadKey] = { name: `${song.name} (${difficulty})`, percent: 0 };

  const zip = new JSZip();

  try {
    const selectedChart = song.charts[difficulty];
    if (!selectedChart) throw new Error('Selected chart not found');

    // 生成info.txt
    const infoTxtContent = `#
Name: ${song.name}
Song: ${song.id}.ogg
Picture: ${song.id}.png
Chart: ${difficulty}.json
Level: ${difficulty} Lv.${selectedChart.difficulty}
Composer: ${song.composer}
Illustrator: ${song.illustrator}
Charter: ${selectedChart.charter}`;

    zip.file("info.txt", infoTxtContent);
    downloadProgress.value[downloadKey].percent = 20;

    // 下载音乐文件
    await fetchAndAddFileToZip(zip, getMusicUrl(song.id), `${song.id}.ogg`, 'music file');
    downloadProgress.value[downloadKey].percent = 40;

    // 尝试获取高清曲绘，如果失败则使用低清曲绘
    let illustrationUrl = await getIllustrationHDUrl(song.id);
    if (!illustrationUrl) {
      // 如果高清曲绘不存在，使用低清曲绘
      illustrationUrl = getIllustrationUrl(song.id);
    }

    // 添加曲绘文件
    await fetchAndAddFileToZip(zip, illustrationUrl, `${song.id}.png`, 'illustration file', true);
    downloadProgress.value[downloadKey].percent = 60;

    // 下载谱面文件
    const chartUrl = await getChartUrl(song.id, difficulty);
    await fetchAndAddFileToZip(zip, chartUrl, `${difficulty}.json`, 'chart file');
    downloadProgress.value[downloadKey].percent = 80;

    // 生成PEZ文件
    const zipFileName = `${song.id}.${difficulty}.pez`;
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    }, (metadata) => {
      downloadProgress.value[downloadKey].percent = 80 + Math.floor(metadata.percent / 5);
    });

    saveAs(zipBlob, zipFileName);
    downloadProgress.value[downloadKey].percent = 100;

    // 清理状态
    setTimeout(() => {
      delete downloadProgress.value[downloadKey];
    }, 3000);

  } catch (error) {
    console.error('Download error:', error);
    alert(`下载失败: ${error.message}`);
    delete downloadProgress.value[downloadKey];
  } finally {
    downloadingSongs.value[downloadKey] = false;
  }
};

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

// 初始化
onMounted(() => {
  setVolume()
})

// 清理音频
onUnmounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.src = ''
  }
})
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
  padding-bottom: 100px; /* Space for the fixed music player */
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

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: var(--transition-fast);
  cursor: pointer;
}

.song-card:hover .play-overlay {
  opacity: 1;
}

.play-btn {
  font-size: 2.5rem;
  color: white;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
  transition: transform 0.2s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.play-btn.playing {
  color: var(--accent-primary);
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

.chart-item.downloading {
  cursor: wait;
  background-color: var(--bg-tertiary);
}

.download-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  animation: spin 1s linear infinite;
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

/* --- Music Player --- */
.music-player {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgba(26, 26, 46, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  z-index: 20;
}

.player-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 250px;
}

.player-illustration {
  width: 50px;
  height: 50px;
  border-radius: var(--border-radius);
  object-fit: cover;
}

.player-text {
  overflow: hidden;
}

.player-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-composer {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  font-size: 1.5rem;
  padding: 0.5rem;
  line-height: 1;
}

.player-progress {
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent-primary);
  border-radius: 4px;
  pointer-events: none;
}

.progress-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  margin-top: -4px;
}
.progress-slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  border: none;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.time-display {
  font-size: 0.8rem;
  color: var(--text-secondary);
  width: 80px;
  text-align: right;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 150px;
}

.volume-icon {
  color: var(--text-secondary);
}

.volume-slider {
  width: 100%;
  -webkit-appearance: none;
  background: transparent;
}
.volume-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  margin-top: -4px;
}
.volume-slider::-moz-range-track {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
}
.volume-slider::-moz-range-thumb {
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  border: none;
}


/* --- Download Toast --- */
.download-toast {
    position: fixed;
    bottom: 120px; /* Above music player */
    right: 20px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.download-item {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 10px 15px;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 250px;
    font-size: 0.9rem;
    gap: 20px;
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

  .player-content {
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }
  .player-info {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  .player-progress {
    order: 3;
    width: 100%;
  }
  .player-controls {
    order: 2;
  }
  .volume-control {
    display: none; /* Hide volume on small screens */
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