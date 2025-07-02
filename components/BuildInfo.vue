<template>
  <div class="build-info-responsive" 
       :class="{ 'is-mobile': isMobile, 'show-details': showDetails }"
       @click="handleClick">
    
    <div class="build-minimal-content">
      <div class="build-dot"></div>
      <span class="build-hash">{{ gitCommit }}</span>
      <svg v-if="isMobile" class="build-chevron" :class="{ rotated: showDetails }" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.427 9.573a.75.75 0 001.146.956l3.427-4.11 3.427 4.11a.75.75 0 001.146-.956l-4-4.8a.75.75 0 00-1.146 0l-4 4.8z"/>
      </svg>
    </div>
    
    <!-- 移动端展开详情 -->
    <div v-if="isMobile" class="build-details-mobile" v-show="showDetails">
      <div class="build-detail-row">
        <span class="label">提交</span>
        <span class="value">{{ gitCommit }}</span>
      </div>
      <div class="build-detail-row">
        <span class="label">分支</span>
        <span class="value">{{ gitBranch }}</span>
      </div>
      <div class="build-detail-row">
        <span class="label">构建</span>
        <span class="value">{{ formattedBuildTime }}</span>
      </div>
      <button class="build-github-btn" @click.stop="openCommitPage">
        <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        查看提交
      </button>
    </div>
    
    <!-- 桌面端tooltip -->
    <div v-else class="build-tooltip" 
         v-show="showDetails"
         @mouseenter="showDetails = true" 
         @mouseleave="showDetails = false">
      <div class="build-tooltip-content">
        <p><strong>提交:</strong> {{ gitCommit }}</p>
        <p><strong>分支:</strong> {{ gitBranch }}</p>
        <p><strong>构建:</strong> {{ formattedBuildTime }}</p>
        <p class="build-tooltip-hint">点击跳转到GitHub</p>
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

// 检测是否为移动端
const isMobile = ref(false)

const formattedBuildTime = computed(() => {
  return new Date(buildTime).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const handleClick = () => {
  if (isMobile.value) {
    // 移动端点击切换显示详情
    showDetails.value = !showDetails.value
  } else {
    // 桌面端直接跳转
    openCommitPage()
  }
}

const openCommitPage = () => {
  const commitUrl = `https://github.com/Dehou23333-awa/RKS/commit/${gitCommit}`
  window.open(commitUrl, '_blank')
}

// 检测设备类型
onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth <= 768 || 'ontouchstart' in window
  }
  
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 桌面端鼠标事件
  if (!isMobile.value) {
    const element = document.querySelector('.build-info-responsive')
    if (element) {
      element.addEventListener('mouseenter', () => {
        showDetails.value = true
      })
      element.addEventListener('mouseleave', () => {
        showDetails.value = false
      })
    }
  }
})
</script>

<style scoped>
.build-info-responsive {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.build-minimal-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border-radius: 20px;
  font-size: 11px;
  font-family: 'SF Mono', Consolas, monospace;
  transition: all 0.2s ease;
  min-height: 28px; /* 确保足够的触摸区域 */
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

.build-hash {
  font-weight: 500;
}

.build-chevron {
  width: 12px;
  height: 12px;
  transition: transform 0.3s ease;
  margin-left: 4px;
}

.build-chevron.rotated {
  transform: rotate(180deg);
}

/* 移动端详情展示 */
.build-details-mobile {
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.build-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
}

.build-detail-row:not(:last-of-type) {
  border-bottom: 1px solid #f1f5f9;
}

.build-detail-row .label {
  color: #64748b;
  font-weight: 500;
}

.build-detail-row .value {
  color: #334155;
  font-weight: 600;
  font-family: 'SF Mono', Consolas, monospace;
}

.build-github-btn {
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  background: #24292e;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background-color 0.2s ease;
  min-height: 36px; /* 确保足够的触摸区域 */
}

.build-github-btn:hover {
  background: #1b1f23;
}

.github-icon {
  width: 14px;
  height: 14px;
}

/* 桌面端tooltip */
.build-tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  animation: slideUp 0.2s ease;
  pointer-events: none;
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

.build-tooltip-hint {
  color: #6b7280 !important;
  font-style: italic;
  font-size: 11px;
  margin-top: 8px !important;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

/* 移动端适配 */
.is-mobile .build-minimal-content {
  padding: 10px 14px;
  min-height: 44px; /* iOS建议的最小触摸区域 */
}

.is-mobile.show-details .build-minimal-content {
  border-radius: 20px 20px 0 0;
}

/* 小屏幕适配 */
@media (max-width: 480px) {
  .build-info-responsive {
    bottom: 16px;
    right: 16px;
    left: 16px;
    right: 16px;
  }
  
  .build-details-mobile {
    margin-top: 0;
    border-radius: 0 0 12px 12px;
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .build-details-mobile {
    background: #1f2937;
    border: 1px solid #374151;
  }
  
  .build-detail-row .label {
    color: #9ca3af;
  }
  
  .build-detail-row .value {
    color: #f9fafb;
  }
  
  .build-detail-row:not(:last-of-type) {
    border-bottom: 1px solid #374151;
  }
  
  .build-tooltip-content {
    background: #1f2937;
    border: 1px solid #374151;
  }
  
  .build-tooltip-content p {
    color: #d1d5db;
  }
  
  .build-tooltip-content strong {
    color: #f9fafb;
  }
  
  .build-tooltip-hint {
    color: #9ca3af !important;
    border-top: 1px solid #374151;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>