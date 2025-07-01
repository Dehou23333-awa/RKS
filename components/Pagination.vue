<template>
    <div class="pagination-container">
        <div class="pagination-info">
            共 {{ total }} 首歌曲
        </div>

        <div class="pagination-controls">
            <button :disabled="currentPage === 1" @click="$emit('page-change', currentPage - 1)"
                class="btn pagination-btn">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <template v-for="page in displayPages" :key="page">
                <button v-if="page !== '...'" :class="['btn', 'pagination-btn', { active: page === currentPage }]"
                    @click="$emit('page-change', page)">
                    {{ page }}
                </button>
                <span v-else class="pagination-ellipsis">...</span>
            </template>

            <button :disabled="currentPage === totalPages" @click="$emit('page-change', currentPage + 1)"
                class="btn pagination-btn">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    currentPage: {
        type: Number,
        required: true
    },
    totalPages: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
})

defineEmits(['page-change'])

const displayPages = computed(() => {
    const { currentPage, totalPages } = props
    const pages = []

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i)
        }
    } else {
        pages.push(1)

        if (currentPage > 4) {
            pages.push('...')
        }

        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        if (currentPage < totalPages - 3) {
            pages.push('...')
        }

        if (totalPages > 1) {
            pages.push(totalPages)
        }
    }

    return pages
})
</script>

<style scoped>
.pagination-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
}

.pagination-info {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
}

.pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    font-weight: 500;
}

.btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.pagination-btn {
    min-width: 2.5rem;
    height: 2.5rem;
    padding: 0.5rem;
}

.pagination-btn.active {
    background: #8b5cf6;
    border-color: #8b5cf6;
}

.pagination-ellipsis {
    color: rgba(255, 255, 255, 0.6);
    padding: 0 0.5rem;
}

.icon {
    width: 1rem;
    height: 1rem;
}

@media (min-width: 640px) {
    .pagination-container {
        flex-direction: row;
        justify-content: space-between;
    }
}
</style>