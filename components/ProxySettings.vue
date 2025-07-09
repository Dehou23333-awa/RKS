<!-- components/ProxySettings.vue -->
<template>
  <div v-if="show" class="modal-overlay" @click="handleCancel">
    <div class="modal-content proxy-modal" @click.stop>
      <h3 class="modal-title">GitHub 代理设置</h3>

      <div class="proxy-options">
        <label class="proxy-option">
          <input type="radio" v-model="proxyType" value="none" />
          <span>直接访问（不使用代理）</span>
        </label>

        <label class="proxy-option">
          <input type="radio" v-model="proxyType" value="preset" />
          <span>使用预设代理</span>
        </label>

        <div v-if="proxyType === 'preset'" class="preset-list">
          <label v-for="proxy in presetProxies" :key="proxy.url" class="preset-item">
            <input type="radio" v-model="selectedPreset" :value="proxy.url" />
            <span>{{ proxy.name }}</span>
            <span class="proxy-url">{{ proxy.url }}</span>
          </label>
        </div>

        <label class="proxy-option">
          <input type="radio" v-model="proxyType" value="custom" />
          <span>自定义代理</span>
        </label>

        <div v-if="proxyType === 'custom'" class="custom-input">
          <input v-model="customProxy" type="text" placeholder="输入代理URL，例如: https://ghproxy.com/"
            class="proxy-input" />
          <p class="proxy-hint">
            代理URL应以 https:// 开头并以 / 结尾
          </p>
        </div>
      </div>

      <div class="current-proxy" v-if="currentProxyUrl">
        <strong>当前代理:</strong> {{ currentProxyUrl || '未设置' }}
      </div>

      <div class="modal-actions">
        <button @click="handleSave" class="save-btn">保存设置</button>
        <button @click="handleCancel" class="cancel-btn">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])

const proxyType = ref('none')
const selectedPreset = ref('')
const customProxy = ref('')
const currentProxyUrl = ref('')

const presetProxies = [
  { name: 'GHProxy', url: 'https://ghfast.top/' },
  { name: 'Goppx', url: 'https://goppx.com/' },
]

const loadProxySettings = () => {
  if (typeof window === 'undefined') return

  const savedProxy = localStorage.getItem('githubProxy')
  const savedProxyType = localStorage.getItem('githubProxyType')

  if (savedProxyType) {
    proxyType.value = savedProxyType
    if (savedProxyType === 'preset' && savedProxy) {
      selectedPreset.value = savedProxy
      currentProxyUrl.value = savedProxy
    } else if (savedProxyType === 'custom' && savedProxy) {
      customProxy.value = savedProxy
      currentProxyUrl.value = savedProxy
    } else {
      currentProxyUrl.value = ''
    }
  }
}

const handleSave = () => {
  if (typeof window === 'undefined') return

  let proxyUrl = ''
  if (proxyType.value === 'preset' && selectedPreset.value) {
    proxyUrl = selectedPreset.value
  } else if (proxyType.value === 'custom' && customProxy.value) {
    let url = customProxy.value.trim()
    if (url && !url.endsWith('/')) {
      url += '/'
    }
    proxyUrl = url
  }

  localStorage.setItem('githubProxyType', proxyType.value)
  localStorage.setItem('githubProxy', proxyUrl)
  currentProxyUrl.value = proxyUrl

  emit('save', { type: proxyType.value, url: proxyUrl })
}

const handleCancel = () => {
  emit('close')
}

const applyProxy = (url) => {
  if (!currentProxyUrl.value || !url) return url
  if (url.includes('github.com') || url.includes('githubusercontent.com')) {
    return currentProxyUrl.value + url
  }
  return url
}

watch(() => props.show, (newVal) => {
  if (newVal) loadProxySettings()
})

onMounted(() => {
  loadProxySettings()
})

defineExpose({
  applyProxy,
  loadProxySettings
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0;
  color: #2d3748;
  text-align: center;
}

.proxy-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.proxy-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.proxy-option:hover {
  background: #f7fafc;
}

.preset-list {
  margin-left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.preset-item:hover {
  background: #e2e8f0;
}

.proxy-url {
  font-size: 0.8rem;
  color: #666;
  margin-left: auto;
}

.custom-input {
  margin-left: 2rem;
  margin-top: 0.5rem;
}

.proxy-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.proxy-input:focus {
  outline: none;
  border-color: #007bff;
}

.proxy-hint {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.current-proxy {
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #2d3748;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.save-btn {
  padding: 0.5rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-btn:hover {
  background: #0056b3;
  transform: translateY(-2px);
}

.cancel-btn {
  padding: 0.5rem 1.5rem;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #cbd5e0;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 1.5rem;
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }

  .preset-list,
  .custom-input {
    margin-left: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
  }
}
</style>