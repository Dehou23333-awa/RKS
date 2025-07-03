<template>
  <div class="build-info" 
       :class="{ 'expanded': showDetails }"
       @click="openCommitPage">
    
    <div class="build-content">
      <div class="build-dot"></div>
      <span class="build-hash">{{ gitCommit }}</span>
      
      <div class="build-details" v-show="showDetails">
        <span class="build-separator">|</span>
        <span class="build-detail">{{ gitBranch }}</span>
        <span class="build-separator">|</span>
        <span class="build-detail">{{ formattedBuildTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const gitCommit = config.public.gitCommit
const gitBranch = config.public.gitBranch
const buildTime = config.public.buildTime
const showDetails = ref(false)

const formattedBuildTime = computed(() => {
  return new Date(buildTime).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const openCommitPage = () => {
  const commitUrl = `https://github.com/Dehou23333-awa/RKS/commit/${gitCommit}`
  window.open(commitUrl, '_blank')
}

onMounted(() => {
  const element = document.querySelector('.build-info')
  if (element) {
    element.addEventListener('mouseenter', () => {
      showDetails.value = true
    })
    element.addEventListener('mouseleave', () => {
      showDetails.value = false
    })
  }
})
</script>

<style scoped>
.build-info {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
  color: #fff;
}

.build-info:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.02);
}

.build-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 9px;
  font-family: 'SF Mono', Consolas, monospace;
  min-height: 20px;
  white-space: nowrap;
}

.build-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

.build-hash {
  font-weight: 500;
}

.build-details {
  display: flex;
  align-items: center;
  gap: 6px;
  animation: slideIn 0.3s ease;
  margin-left: 2px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(15px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.build-separator {
  color: rgba(255, 255, 255, 0.3);
  font-weight: 300;
}

.build-detail {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 8px;
}

.build-hint {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  font-size: 8px;
}

@media (max-width: 768px) {
  .build-content {
    padding: 6px 10px;
    min-height: 32px;
  }
  
  .build-details {
    display: none !important;
  }
}

@media (max-width: 480px) {
  .build-info {
    bottom: 12px;
    right: 12px;
  }
}

@media (min-width: 769px) {
  .build-info.expanded {
    max-width: none;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>