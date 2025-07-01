<template>
    <div class="main-container">
        <div class="container">
            <!-- 标题和搜索 -->
            <div class="header">
                <h1 class="title">Music Library</h1>
                <div class="search-container">
                    <div class="search-wrapper">
                        <input v-model="searchQuery" @input="handleSearchInput" type="text" placeholder="搜索歌曲或作曲家..."
                            class="search-input">
                        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="pending" class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">加载中...</p>
            </div>

            <!-- 错误状态 -->
            <div v-else-if="error" class="error-container">
                <p class="error-text">加载失败: {{ error.message }}</p>
            </div>

            <!-- 歌曲列表 -->
            <div v-else-if="data" class="content">
                <!-- 无结果 -->
                <div v-if="data.songs.length === 0" class="empty-state">
                    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p class="empty-text">没有找到相关歌曲</p>
                </div>

                <!-- 歌曲卡片 -->
                <div v-else class="songs-grid">
                    <SongCard v-for="song in data.songs" :key="song.id" :song="song" />
                </div>

                <!-- 分页 -->
                <Pagination v-if="data.pagination.totalPages > 1" :current-page="currentPage"
                    :total-pages="data.pagination.totalPages" :total="data.pagination.total"
                    @page-change="handlePageChange" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const searchQuery = ref('')
const currentPage = ref(1)
let debounceTimer = null

// 构建查询参数
const queryParams = computed(() => ({
    page: currentPage.value,
    limit: 20,
    ...(searchQuery.value && { search: searchQuery.value })
}))

const { data, pending, error, refresh } = await useFetch('/api/songs', {
    query: queryParams,
    key: 'songs-list'
})

const handleSearchInput = () => {
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
        currentPage.value = 1
        refresh()
    }, 500)
}

const handlePageChange = (page) => {
    currentPage.value = page
    refresh()
}


watch(searchQuery, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        currentPage.value = 1
    }
})

onBeforeUnmount(() => {
    if (debounceTimer) {
        clearTimeout(debounceTimer)
    }
})

// SEO
useHead({
    title: 'Music Library - 曲目库',
    meta: [
        { name: 'description', content: '浏览和搜索音乐游戏曲目库' }
    ]
})
</script>

<style scoped>
.main-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 50%, #312e81 100%);
    padding: 2rem 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

.header {
    text-align: center;
    margin-bottom: 2rem;
}

.title {
    font-size: clamp(2.5rem, 8vw, 4rem);
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #ec4899, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.search-container {
    max-width: 28rem;
    margin: 0 auto;
}

.search-wrapper {
    position: relative;
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    font-size: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
}

.search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.search-input:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.6);
}

.loading-container,
.error-container,
.empty-state {
    text-align: center;
    padding: 3rem 0;
}

.loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid transparent;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.5rem;
}

.error-text {
    color: #ef4444;
    font-size: 1.125rem;
}

.empty-icon {
    width: 4rem;
    height: 4rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 auto 1rem;
}

.empty-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.25rem;
}

.songs-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

@media (min-width: 768px) {
    .container {
        padding: 0 2rem;
    }

    .songs-grid {
        gap: 1.5rem;
    }
}
</style>