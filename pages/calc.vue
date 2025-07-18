<template>
  <div class="calculator-wrapper">
    <div class="header">
      <h1>RKS 计算器</h1>
      <div class="header-buttons">
        <button @click="goHome" class="btn-secondary">返回首页</button>
        <button @click="loadData" :disabled="isLoading" class="btn-primary">
          {{ isLoading ? '加载中...' : '重新加载数据' }}
        </button>
        <button @click="resetAll" class="btn-warning">重置所有修改</button>
      </div>
    </div>

    <!-- RKS 显示区域 -->
    <div class="rks-display" v-if="songs.length > 0">
      <div class="rks-card">
        <h2>当前 RKS</h2>
        <div class="rks-value">{{ currentRKS.toFixed(4) }}</div>
      </div>
      
      <div class="rks-change" v-if="hasModifications">
        <div :class="['change-indicator', rksDiff >= 0 ? 'positive' : 'negative']">
          {{ rksDiff >= 0 ? '+' : '' }}{{ rksDiff.toFixed(4) }}
        </div>
        <div class="original-rks">原始 RKS: {{ originalRKS.toFixed(4) }}</div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      正在加载数据...
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-state">
      {{ error }}
    </div>

    <!-- 歌曲列表 -->
    <div v-if="songs.length > 0" class="songs-container">
      <div class="list-header">
        <div class="header-info">
          <span>共 {{ songs.length }} 首歌曲</span>
          <span class="modified-count" v-if="modifiedCount > 0">
            已修改 {{ modifiedCount }} 首
          </span>
        </div>
      </div>

      <div class="songs-list">
        <div v-for="(song, index) in sortedSongs" :key="song.songId + song.level"
             :class="['song-item', { 
               'in-best27': index < 27,
               'is-phi': isPhi(song),
               'is-modified': song.isModified,
               'low-acc': song.acc < 70
             }]">
          
          <div class="song-rank">
            #{{ index + 1 }}
            <span v-if="index < 27" class="badge best">B27</span>
            <span v-if="isPhi(song)" class="badge phi">Phi</span>
          </div>

          <div class="song-info">
            <div class="song-title" :title="song.songName">{{ song.songName }}</div>
            <div class="song-meta">
              <span class="difficulty" :class="song.level.toLowerCase()">
                {{ song.level }} {{ song.difficulty }}
              </span>
              <span class="composer" :title="song.composer">{{ song.composer }}</span>
            </div>
          </div>

          <div class="song-scores">
            <div class="input-group acc-group">
              <label>ACC</label>
              <div class="acc-input-wrapper">
                <input type="number" 
                       v-model.number="song.acc" 
                       @input="updateSong(song)"
                       min="0" 
                       max="100"
                       step="0.01"
                       class="acc-input"
                       :title="`准确率: ${song.acc}%`">
              </div>
            </div>

            <div class="rks-display-mini">
              <label>RKS</label>
              <div class="rks-value-mini" :class="{ 'changed': song.isModified }">
                {{ song.rks.toFixed(3) }}
              </div>
              <div v-if="song.isModified" class="original-value">
                原: {{ song.originalRks.toFixed(3) }}
              </div>
            </div>

            <button @click="resetSong(song)" 
                    v-if="song.isModified" 
                    class="btn-reset"
                    title="重置此曲目">
              ↺
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchData } from '~/utils/phigrosUtils'

useHead({
  title: 'RKS 计算器 | Phigros',
  meta: [
    { name: 'description', content: '修改你的 Phigros 成绩并实时计算 RKS 变化' },
    { name: 'keywords', content: 'Phigros,RKS,计算器,成绩计算' }
  ]
})

// 状态管理
const songs = ref([])
const originalSongs = ref([])
const isLoading = ref(false)
const error = ref(null)

// 使用 RKS 计算公式
const calculateSongRKS = (acc, difficulty) => {
  // 根据用户要求：如果 ACC 低于 70%，RKS 一律为 1.0
  if (acc < 70) {
    return 1.0
  }
  
  // 如果 ACC 达到 100% (Phi)，RKS 等于定数
  if (acc >= 100) {
    return difficulty
  }
  
  // 对于 ACC 在 70% 到 100% 之间的歌曲，根据公式计算：rks = ((ACC-55)/45)² × difficulty
  const normalized = (acc - 55) / 45
  return Math.pow(normalized, 2) * difficulty
}

// 排序歌曲（按 RKS 降序）
const sortedSongs = computed(() => {
  return [...songs.value].sort((a, b) => b.rks - a.rks)
})

// 计算 Best27
const best27Songs = computed(() => {
  return sortedSongs.value.slice(0, 27)
})

// 计算 Best27 总和
const best27Sum = computed(() => {
  return best27Songs.value.reduce((sum, song) => sum + song.rks, 0)
})

// 计算 Phi3（定数最高的3首 ACC 100% 的谱面）
const phi3Songs = computed(() => {
  // 找出所有 ACC 100% 的谱面
  const phiSongs = songs.value.filter(song => song.acc >= 100)
  
  // 按定数降序排序，取前3首
  return phiSongs
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 3)
})

// 计算 Phi3 定数总和
const phi3Sum = computed(() => {
  return phi3Songs.value.reduce((sum, song) => sum + song.difficulty, 0)
})

// 当前 RKS
const currentRKS = computed(() => {
  if (songs.value.length === 0) return 0
  return (best27Sum.value + phi3Sum.value) / 30
})

// 原始 RKS
const originalRKS = computed(() => {
  if (originalSongs.value.length === 0) return 0
  
  const sortedOriginal = [...originalSongs.value].sort((a, b) => b.rks - a.rks)
  const originalBest27 = sortedOriginal.slice(0, 27)
  const originalBest27Sum = originalBest27.reduce((sum, song) => sum + song.rks, 0)
  
  const originalPhi3 = [...originalSongs.value]
    .filter(song => song.acc >= 100) // 根据 ACC 判断 Phi
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 3)
  const originalPhi3Sum = originalPhi3.reduce((sum, song) => sum + song.difficulty, 0)
  
  return (originalBest27Sum + originalPhi3Sum) / 30
})

// RKS 差值
const rksDiff = computed(() => currentRKS.value - originalRKS.value)

// 是否有修改
const hasModifications = computed(() => songs.value.some(song => song.isModified))

// 修改的歌曲数量
const modifiedCount = computed(() => songs.value.filter(song => song.isModified).length)

// 判断是否是 Phi 歌曲（在 Phi3 列表中）
const isPhi = (song) => {
  return phi3Songs.value.some(phi => phi.songId === song.songId && phi.level === song.level)
}

// 加载数据
const loadData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const data = await fetchData('record')
    
    // 处理数据，添加必要的字段
    songs.value = data.map(song => ({
      ...song,
      originalAcc: song.acc,
      originalRks: song.rks, // 保持原始RKS，即便其可能与新规则不符，用于reset
      isModified: false
    }))
    
    // 立即根据新规则计算所有歌曲的初始 RKS
    songs.value.forEach(song => {
      song.rks = calculateSongRKS(song.acc, song.difficulty);
    });

    // 保存原始数据的深拷贝，注意这里原始数据也要经过一次RKS计算，以便后续比较
    originalSongs.value = JSON.parse(JSON.stringify(songs.value.map(song => ({
      ...song,
      rks: calculateSongRKS(song.originalAcc, song.difficulty) // 原始RKS也按新规则计算
    }))));
    
  } catch (err) {
    error.value = err.message || '加载数据失败'
    console.error('加载数据失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 更新歌曲
const updateSong = (song) => {
  // 限制 ACC 输入范围
  if (song.acc < 0) song.acc = 0
  if (song.acc > 100) song.acc = 100
  
  // 重新计算 RKS
  song.rks = calculateSongRKS(song.acc, song.difficulty) // 仅传递 ACC
  
  // 更新 FC 状态 (FC 即 ACC 100%)
  song.fc = song.acc === 100
  
  // 标记为已修改 (仅根据 ACC 变化判断)
  song.isModified = Math.abs(song.acc - song.originalAcc) > 0.001
}

// 重置单曲
const resetSong = (song) => {
  // 找到原始歌曲数据
  const originalSongData = originalSongs.value.find(
    orig => orig.songId === song.songId && orig.level === song.level
  );

  if (originalSongData) {
    song.acc = originalSongData.originalAcc; // 重置为原始 ACC
    song.rks = originalSongData.rks;       // 重置为原始 ACC 计算出的 RKS
    song.fc = originalSongData.originalAcc === 100;
    song.isModified = false;
  }
}

// 重置所有
const resetAll = () => {
  songs.value = JSON.parse(JSON.stringify(originalSongs.value));
}

const goHome = () => {
  navigateTo('/')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.calculator-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 2.5rem;
  white-space: nowrap; /* Prevent breaking on small screens */
}

.header-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* 按钮样式 */
.btn-primary, .btn-secondary, .btn-warning {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

.btn-warning {
  background-color: #e74c3c;
  color: white;
}

.btn-warning:hover {
  background-color: #c0392b;
}

/* RKS 显示区域 */
.rks-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.rks-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.rks-card h2 {
  margin: 0 0 1rem 0;
  color: #34495e;
  font-size: 1.5rem;
}

.rks-value {
  font-size: 3rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 1rem;
}

.rks-detail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #7f8c8d;
  font-size: 1rem;
}

.rks-change {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.change-indicator {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.change-indicator.positive {
  color: #27ae60;
}

.change-indicator.negative {
  color: #e74c3c;
}

.original-rks {
  color: #7f8c8d;
  font-size: 0.9rem;
}

/* 状态显示 */
.loading-state, .error-state {
  text-align: center;
  padding: 4rem;
  font-size: 1.2rem;
  color: #7f8c8d;
}

.error-state {
  color: #e74c3c;
}

/* 歌曲容器 */
.songs-container {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-info {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: #7f8c8d;
}

.modified-count {
  color: #e67e22;
  font-weight: 500;
}

/* 歌曲列表 */
.songs-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  transition: all 0.3s ease;
  gap: 1rem;
}

.song-item:hover {
  background-color: #f8f9fa;
  border-color: #dfe6e9;
}

.song-item.in-best27 {
  background-color: #ebf5fb;
  border-color: #aed6f1;
}

.song-item.is-phi {
  background-color: #f4ecf7;
  border-color: #d7bde2;
}

.song-item.is-modified {
  border-left: 4px solid #e67e22;
}

.song-item.low-acc {
  opacity: 0.9;
}

.song-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 60px;
  font-weight: bold;
  color: #34495e;
}

.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-weight: normal;
}

.badge.best {
  background-color: #3498db;
  color: white;
}

.badge.phi {
  background-color: #9b59b6;
  color: white;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.difficulty {
  font-weight: 500;
}

.difficulty.ez { color: #27ae60; }
.difficulty.hd { color: #3498db; }
.difficulty.in { color: #e74c3c; }
.difficulty.at { color: #8e44ad; }

.composer {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 输入区域 */
.song-scores {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.input-group { /* 通用输入组样式 */
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.8rem;
  color: #7f8c8d;
  font-weight: 500;
}

.acc-input { /* 仅保留 ACC 输入框的样式 */
  width: 100px;
  padding: 0.5rem;
  border: 1px solid #dfe6e9;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

/* ACC 输入特殊样式 */
.acc-group {
  min-width: 120px;
}

.acc-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.acc-input {
  width: 100px;
  padding-right: 30px; /* 为警告图标留出空间 */
}

.acc-warning {
  position: absolute;
  right: 5px;
  font-size: 1rem;
  cursor: help;
}

.acc-input:focus {
  outline: none;
  border-color: #3498db;
}

.rks-display-mini {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 80px;
}

.rks-value-mini {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1rem;
}

.rks-value-mini.changed {
  color: #e67e22;
}

.original-value {
  font-size: 0.75rem;
  color: #95a5a6;
}

.btn-reset {
  padding: 0.5rem;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  transition: background-color 0.3s ease;
}

.btn-reset:hover {
  background-color: #7f8c8d;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .calculator-wrapper {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .rks-display {
    grid-template-columns: 1fr;
  }
  
  .song-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .song-scores {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .input-group {
    flex: 1;
  }
  
  .composer {
    display: none;
  }
}

/* 输入框样式修复 */
input[type="number"] {
  -moz-appearance: textfield;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>