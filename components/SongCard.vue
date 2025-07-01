<template>
    <div class="song-card" @click="$emit('click')">
        <div class="card-content">
            <!-- 曲绘图片 -->
            <div class="song-image-container">
                <img :src="imageUrl" :alt="song.name || '未知歌曲'" class="song-image" @error="handleImageError"
                    @load="handleImageLoad">
                <div v-if="imageError" class="image-fallback">
                    <svg class="fallback-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                </div>
                <div v-if="imageLoading && !imageError" class="image-loading">
                    <div class="loading-spinner"></div>
                </div>
                
                <!-- 播放按钮悬浮层 -->
                <div class="play-overlay" @click.stop="togglePlay">
                    <button class="play-button" :disabled="audioLoading">
                        <svg v-if="audioLoading" class="loading-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        <svg v-else-if="isPlaying" class="play-icon" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                        <svg v-else class="play-icon" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="song-info">
                <h3 class="song-title">{{ song.name || '未知歌曲' }}</h3>
                <div class="song-details">
                    <p class="composer">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        作曲: {{ song.composer || '未知' }}
                    </p>
                    <p class="illustrator">
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                        画师: {{ song.illustrator || '未知' }}
                    </p>
                </div>
                
                <!-- 音频播放控件 -->
                <div v-if="showAudioControls" class="audio-controls" @click.stop>
                    <div class="progress-container">
                        <div class="progress-bar" @click="seekAudio">
                            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                            <div class="progress-handle" :style="{ left: progressPercentage + '%' }"></div>
                        </div>
                        <div class="time-display">
                            <span class="current-time">{{ formatTime(currentTime) }}</span>
                            <span class="duration">{{ formatTime(duration) }}</span>
                        </div>
                    </div>
                    
                    <div class="volume-control">
                        <svg class="volume-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                        </svg>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            v-model="volume" 
                            @input="updateVolume"
                            class="volume-slider"
                        />
                    </div>
                </div>
            </div>

            <div class="difficulties">
                <DifficultyBadge v-for="(chart, type) in song.charts" :key="type" :type="type" :chart="chart" />
            </div>
        </div>
        
        <!-- 音频元素 -->
        <audio 
            ref="audioPlayer"
            @loadstart="handleAudioLoadStart"
            @loadeddata="handleAudioLoaded"
            @timeupdate="handleTimeUpdate"
            @ended="handleAudioEnded"
            @error="handleAudioError"
            preload="none"
        >
            <source :src="audioUrl" type="audio/ogg">
            您的浏览器不支持音频播放。
        </audio>
    </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
    song: {
        type: Object,
        required: true
    }
})

defineEmits(['click'])

// 图片相关状态
const imageLoading = ref(true)
const imageError = ref(false)

// 音频相关状态
const audioPlayer = ref(null)
const isPlaying = ref(false)
const audioLoading = ref(false)
const audioError = ref(false)
const showAudioControls = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(50)

// 计算属性
const imageUrl = computed(() => {
    return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${props.song.id}.png`
})

const audioUrl = computed(() => {
    return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/music/${props.song.id}.ogg`
})

const progressPercentage = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
})

// 图片处理函数
const handleImageError = () => {
    imageLoading.value = false
    imageError.value = true
}

const handleImageLoad = () => {
    imageLoading.value = false
    imageError.value = false
}

// 音频处理函数
const togglePlay = async () => {
    if (!audioPlayer.value) return
    
    try {
        if (isPlaying.value) {
            await audioPlayer.value.pause()
            isPlaying.value = false
        } else {
            audioLoading.value = true
            await audioPlayer.value.play()
            isPlaying.value = true
            showAudioControls.value = true
        }
    } catch (error) {
        console.error('播放错误:', error)
        handleAudioError()
    }
}

const handleAudioLoadStart = () => {
    audioLoading.value = true
    audioError.value = false
}

const handleAudioLoaded = () => {
    audioLoading.value = false
    if (audioPlayer.value) {
        duration.value = audioPlayer.value.duration || 0
        audioPlayer.value.volume = volume.value / 100
    }
}

const handleTimeUpdate = () => {
    if (audioPlayer.value) {
        currentTime.value = audioPlayer.value.currentTime || 0
    }
}

const handleAudioEnded = () => {
    isPlaying.value = false
    currentTime.value = 0
}

const handleAudioError = () => {
    audioLoading.value = false
    audioError.value = true
    isPlaying.value = false
    console.error('音频加载失败')
}

const seekAudio = (event) => {
    if (!audioPlayer.value || duration.value === 0) return
    
    const rect = event.target.getBoundingClientRect()
    const percentage = (event.clientX - rect.left) / rect.width
    const newTime = percentage * duration.value
    
    audioPlayer.value.currentTime = newTime
    currentTime.value = newTime
}

const updateVolume = () => {
    if (audioPlayer.value) {
        audioPlayer.value.volume = volume.value / 100
    }
}

const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00'
    
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// 组件卸载时停止音频
onUnmounted(() => {
    if (audioPlayer.value && isPlaying.value) {
        audioPlayer.value.pause()
    }
})
</script>

<style scoped>
.song-card {
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.song-card:hover {
    transform: scale(1.02);
}

.card-content {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border-radius: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 1.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.song-card:hover .card-content {
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.song-image-container {
    position: relative;
    width: 100%;
    height: 200px;
    border-radius: 1rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05);
}

.song-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.song-card:hover .song-image {
    transform: scale(1.05);
}

.image-fallback {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
}

.fallback-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(255, 255, 255, 0.4);
}

.image-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
}

.loading-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid transparent;
    border-top: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

/* 播放控件样式 */
.play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.song-image-container:hover .play-overlay {
    opacity: 1;
}

.play-button {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
}

.play-button:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
}

.play-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.play-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: #1f2937;
}

.loading-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: #1f2937;
    animation: spin 1s linear infinite;
}

/* 音频控件样式 */
.audio-controls {
    margin-top: 0.75rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-container {
    margin-bottom: 0.75rem;
}

.progress-bar {
    position: relative;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    cursor: pointer;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: #8b5cf6;
    border-radius: 2px;
    transition: width 0.1s ease;
}

.progress-handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: #8b5cf6;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.time-display {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
}

.volume-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.volume-icon {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
}

.volume-slider {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #8b5cf6;
    border-radius: 50%;
    cursor: pointer;
}

.volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #8b5cf6;
    border-radius: 50%;
    border: none;
    cursor: pointer;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.song-info {
    flex: 1;
}

.song-title {
    font-size: 1.25rem;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 0.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.song-card:hover .song-title {
    color: #c084fc;
}

.song-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
}

.composer {
    color: #c084fc;
}

.illustrator {
    color: #60a5fa;
}

.composer,
.illustrator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
}

.icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

.difficulties {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

@media (min-width: 768px) {
    .card-content {
        flex-direction: row;
        align-items: center;
        gap: 1.5rem;
    }

    .song-image-container {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
    }

    .song-details {
        flex-direction: row;
        gap: 1rem;
    }
}

@media (min-width: 1024px) {
    .song-image-container {
        width: 150px;
        height: 150px;
    }
}
</style>