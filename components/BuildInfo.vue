<template>
  <div class="build-info-minimal" @click="showDetails = !showDetails">
    <div class="build-minimal-content">
      <div class="build-dot"></div>
      <span class="build-hash">{{ gitCommit }}</span>
    </div>
    
    <div class="build-tooltip" v-show="showDetails">
      <div class="build-tooltip-content">
        <p><strong>提交:</strong> {{ gitCommit }}</p>
        <p><strong>分支:</strong> {{ gitBranch }}</p>
        <p><strong>构建:</strong> {{ formattedBuildTime }}</p>
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
  return new Date(buildTime).toLocaleString('zh-CN')
})
</script>

<style scoped>
.build-info-minimal {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  cursor: pointer;
}

.build-minimal-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 16px;
  font-size: 11px;
  font-family: 'SF Mono', Consolas, monospace;
  transition: all 0.2s ease;
}

.build-minimal-content:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.05);
}

.build-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.build-hash {
  font-weight: 500;
}

.build-tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.build-tooltip-content {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-width: 200px;
  font-size: 12px;
  white-space: nowrap;
}

.build-tooltip-content p {
  margin: 4px 0;
  color: #374151;
}

.build-tooltip-content strong {
  color: #111827;
}
</style>