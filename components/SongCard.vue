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
            </div>

            <div class="difficulties">
                <DifficultyBadge v-for="(chart, type) in song.charts" :key="type" :type="type" :chart="chart" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    song: {
        type: Object,
        required: true
    }
})

defineEmits(['click'])

const imageLoading = ref(true)
const imageError = ref(false)

const imageUrl = computed(() => {
    return `https://raw.githubusercontent.com/7aGiven/Phigros_Resource/refs/heads/illustrationLowRes/${props.song.id}.png`
})

const handleImageError = () => {
    imageLoading.value = false
    imageError.value = true
}

const handleImageLoad = () => {
    imageLoading.value = false
    imageError.value = false
}
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