<template>
    <div v-if="chart" class="difficulty-badge" :class="difficultyClass">
        <div class="badge-content">
            <div class="difficulty-type">{{ type }}</div>
            <div class="difficulty-value">{{ chart.difficulty }}</div>
        </div>

        <div v-if="chart.charter" class="tooltip">
            谱师: {{ chart.charter }}
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    type: {
        type: String,
        required: true
    },
    chart: {
        type: Object,
        default: null
    }
})

const difficultyClass = computed(() => `difficulty-${props.type.toLowerCase()}`)
</script>

<style scoped>
.difficulty-badge {
    position: relative;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-weight: bold;
    font-size: 0.875rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid;
    backdrop-filter: blur(8px);
    cursor: default;
}

.badge-content {
    text-align: center;
}

.difficulty-type {
    font-size: 0.75rem;
    opacity: 0.8;
    margin-bottom: 0.125rem;
}

.difficulty-value {
    font-size: 1.125rem;
    line-height: 1;
}

.difficulty-ez {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    color: #10b981;
}

.difficulty-hd {
    background: rgba(245, 158, 11, 0.2);
    border-color: #f59e0b;
    color: #f59e0b;
}

.difficulty-in {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
    color: #ef4444;
}

.difficulty-at {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
    color: #8b5cf6;
}

.difficulty-badge:hover {
    transform: translateY(-2px);
}

.difficulty-ez:hover {
    background: rgba(16, 185, 129, 0.3);
}

.difficulty-hd:hover {
    background: rgba(245, 158, 11, 0.3);
}

.difficulty-in:hover {
    background: rgba(239, 68, 68, 0.3);
}

.difficulty-at:hover {
    background: rgba(139, 92, 246, 0.3);
}

.tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 0.75rem;
    border-radius: 0.375rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 10;
}

.tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.8);
}

.difficulty-badge:hover .tooltip {
    opacity: 1;
}
</style>