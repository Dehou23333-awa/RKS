<template>
  <div class="song-browser">
    <header class="header">
      <h1 class="title">Phigros 全曲目</h1>
      <div class="search-container">
        <input v-model="searchTerm" type="text" placeholder="搜索歌曲名或作曲家..." class="search-input" @input="handleSearch" />
        <div class="search-icon">🔍</div>
      </div>
    </header>

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
              <div v-for="(chart, difficulty) in song.charts" :key="difficulty" class="chart-item"
                :class="{ 'has-chart': chart }">
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

            <!-- 下载选择区域 -->
            <div class="download-section">
              <select v-model="selectedCharts[song.id]" class="chart-select" :disabled="downloadingSongs[song.id]">
                <option value="">选择难度下载</option>
                <template v-for="(chart, difficulty) in song.charts" :key="`${song.id}-${difficulty}`">
                  <option v-if="chart" :value="difficulty">
                    {{ difficulty }} Lv.{{ chart.difficulty }} - {{ chart.charter }}
                  </option>
                </template>
              </select>
              <button @click="downloadSong(song)" :disabled="!selectedCharts[song.id] || downloadingSongs[song.id]"
                class="download-btn">
                {{ downloadingSongs[song.id] ? '下载中...' : '下载' }}
              </button>
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
      <div v-for="(progress, songId) in downloadProgress" :key="songId" class="download-item">
        <span>{{ progress.name }}</span>
        <span>{{ progress.percent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const searchTerm = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 下载相关状态
const selectedCharts = ref({})
const downloadingSongs = ref({})
const downloadProgress = ref({})

// 运行时配置
const config = useRuntimeConfig()
const githubApiToken = config.public.githubToken
const userAgentString = 'PhiPezGenerator'

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
  return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${songId}.png`
}

// 获取音乐URL
const getMusicUrl = (songId) => {
  return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/music/${songId}.ogg`
}

// 获取高清曲绘URL
const getIllustrationHDUrl = async (songId) => {
  const apiUrl = 'https://api.github.com/repos/7aGiven/Phigros_Resource/git/trees/illustration?recursive=1'

  try {
    const headers = { 'User-Agent': userAgentString }
    if (githubApiToken) {
      headers.Authorization = `Bearer ${githubApiToken}`
    }

    const response = await fetch(apiUrl, { headers })
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
      return foundItem ? `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/illustration/${foundItem.path}` : null
    }
  } catch (error) {
    console.error('Error fetching illustration:', error)
  }
  return null
}

// 获取谱面文件URL
const getChartUrl = async (songId, difficulty) => {
  // 直接构建URL，不通过API查询
  const chartUrl = `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/chart/${songId}.0/${difficulty}.json`

  try {
    // 检查文件是否存在
    const response = await fetch(chartUrl, { method: 'HEAD' })
    if (response.ok) {
      return chartUrl
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

const downloadSong = async (song) => {
  const selectedDifficulty = selectedCharts.value[song.id]
  if (!selectedDifficulty || downloadingSongs.value[song.id]) return

  downloadingSongs.value[song.id] = true
  downloadProgress.value[song.id] = { name: song.name, percent: 0 }

  const zip = new JSZip()

  try {
    const selectedChart = song.charts[selectedDifficulty]
    if (!selectedChart) throw new Error('Selected chart not found')

    // 生成info.txt
    const infoTxtContent = `#
Name: ${song.name}
Song: ${song.id}.ogg
Picture: ${song.id}.png
Chart: ${selectedDifficulty}.json
Level: ${selectedDifficulty} Lv.${selectedChart.difficulty}
Composer: ${song.composer}
Illustrator: ${song.illustrator}
Charter: ${selectedChart.charter}`

    zip.file("info.txt", infoTxtContent)
    downloadProgress.value[song.id].percent = 20

    // 下载音乐文件
    await fetchAndAddFileToZip(zip, getMusicUrl(song.id), `${song.id}.ogg`, 'music file')
    downloadProgress.value[song.id].percent = 40

    // 下载曲绘文件（尝试高清版本）
    let illustrationUrl = await getIllustrationHDUrl(song.id)
    await fetchAndAddFileToZip(zip, illustrationUrl, `${song.id}.png`, 'illustration file', true)
    downloadProgress.value[song.id].percent = 60

    // 下载谱面文件
    const chartUrl = await getChartUrl(song.id, selectedDifficulty)
    await fetchAndAddFileToZip(zip, chartUrl, `${selectedDifficulty}.json`, 'chart file')
    downloadProgress.value[song.id].percent = 80

    // 生成PEZ文件
    const zipFileName = `${song.id}.${selectedDifficulty}.pez`
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    }, (metadata) => {
      downloadProgress.value[song.id].percent = 80 + Math.floor(metadata.percent / 5)
    })

    saveAs(zipBlob, zipFileName)
    downloadProgress.value[song.id].percent = 100

    // 清理状态
    setTimeout(() => {
      delete downloadProgress.value[song.id]
    }, 3000)

  } catch (error) {
    console.error('Download error:', error)
    alert(`下载失败: ${error.message}`)
    delete downloadProgress.value[song.id]
  } finally {
    downloadingSongs.value[song.id] = false
    selectedCharts.value[song.id] = '' // 重置选择
  }
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

// 初始化音量
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

<style scoped>
* {
  box-sizing: border-box;
}

.song-browser {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  padding-bottom: 80px;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-container {
  position: relative;
  max-width: 500px;
}

.search-input {
  width: 100%;
  padding: 1rem 3rem 1rem 1rem;
  font-size: 1rem;
  border: 2px solid #e1e5e9;
  border-radius: 50px;
  outline: none;
  transition: all 0.3s ease;
  background: white;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  color: #666;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  color: white;
  padding: 2rem;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.no-results {
  text-align: center;
  color: white;
  font-size: 1.2rem;
  padding: 3rem;
}

.songs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.song-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.song-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.song-illustration {
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 10px;
  overflow: hidden;
  background: #f7fafc;
}

.illustration-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.song-card:hover .illustration-img {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.song-illustration:hover .play-overlay {
  opacity: 1;
}

.play-btn {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn:hover {
  background: white;
  transform: scale(1.1);
}

.play-btn.playing {
  background: #667eea;
  color: white;
}

.song-header {
  margin-bottom: 1rem;
}

.song-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #2d3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.song-meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.composer,
.illustrator {
  font-size: 0.9rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.chart-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.8rem 0.4rem;
  border-radius: 8px;
  background: #f7fafc;
  min-height: 80px;
}

.chart-item.has-chart {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
}

.difficulty-label {
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  color: white;
  text-align: center;
  min-width: 30px;
}

.difficulty-ez {
  background: #48bb78;
}

.difficulty-hd {
  background: #ed8936;
}

.difficulty-in {
  background: #e53e3e;
}

.difficulty-at {
  background: #805ad5;
}

.chart-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  width: 100%;
}

.difficulty-number {
  font-weight: 700;
  font-size: 1.1rem;
  color: #2d3748;
}

.charter {
  font-size: 0.7rem;
  color: #666;
  text-align: center;
  width: 100%;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
  line-height: 1.2;
  min-height: 1em;
}

.no-chart {
  color: #a0aec0;
  font-size: 1.2rem;
  margin-top: 1rem;
}

/* 下载选择区域 */
.download-section {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.chart-select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.3s ease;
}

.chart-select:focus {
  border-color: #667eea;
}

.chart-select:disabled {
  background: #f7fafc;
  cursor: not-allowed;
}

.download-btn {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.download-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.download-btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 下载进度提示 */
.download-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-width: 300px;
}

.download-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.download-item:last-child {
  border-bottom: none;
}

.download-item span:first-child {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 1rem;
}

.download-item span:last-child {
  font-weight: 600;
  color: #667eea;
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.page-btn,
.page-number {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #4a5568;
}

.page-btn:hover:not(:disabled),
.page-number:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.page-numbers {
  display: flex;
  gap: 0.5rem;
}

.page-info {
  color: white;
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
  margin-top: 1rem;
}

/* 音乐播放器样式 */
.music-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding: 1rem 2rem;
  z-index: 300;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
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
  flex: 1;
  min-width: 0;
}

.player-illustration {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.player-text {
  min-width: 0;
  flex: 1;
}

.player-title {
  font-weight: 600;
  color: #2d3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-composer {
  font-size: 0.9rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-controls {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.control-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.control-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.play-pause.control-btn {
  background: #667eea;
  color: white;
}

.play-pause.control-btn:hover {
  background: #5a67d8;
}

.player-progress {
  flex: 2;
  min-width: 200px;
}

.progress-bar {
  position: relative;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #667eea;
  border-radius: 3px;
  transition: width 0.1s ease;
}

.progress-slider {
  position: absolute;
  top: -2px;
  left: 0;
  width: 100%;
  height: 10px;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.progress-bar:hover .progress-slider::-webkit-slider-thumb {
  opacity: 1;
}

.time-display {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.volume-icon {
  font-size: 1.2rem;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

@media (max-width: 768px) {
  .song-browser {
    flex-direction: column;
    padding-bottom: 120px;
  }

  .songs-grid {
    grid-template-columns: 1fr;
  }

  .main-content {
    padding: 1rem;
  }

  .header {
    padding: 1rem;
  }

  .title {
    font-size: 1.8rem;
  }

  .pagination {
    flex-direction: column;
    gap: 0.5rem;
  }

  .page-numbers {
    order: -1;
  }

  .charter {
    max-width: 60px;
    font-size: 0.6rem;
  }

  .player-content {
    flex-direction: column;
    gap: 1rem;
    padding: 0;
  }

  .player-info {
    width: 100%;
  }

  .player-controls {
    order: -1;
  }

  .volume-control {
    width: 100%;
    justify-content: center;
  }

  .download-section {
    flex-direction: column;
    width: 100%;
  }

  .chart-select,
  .download-btn {
    width: 100%;
  }

  .download-toast {
    left: 20px;
    right: 20px;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .charts-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
  }

  .chart-item {
    min-height: 90px;
  }

  .charter {
    max-width: 70px;
  }
}
</style>