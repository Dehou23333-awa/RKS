<template>
  <div class="container">
    <h1>Phigros Cloud Save Viewer</h1>
    
    <div class="form-group">
      <label for="session-token">Session Token</label>
      <input 
        id="session-token"
        type="text" 
        v-model="sessionToken" 
        placeholder="Enter your 25-character sessionToken"
        :disabled="isLoading"
      />
    </div>

    <button @click="fetchSaveData" :disabled="!sessionToken || isLoading">
      {{ isLoading ? 'Loading...' : 'Get Save Data' }}
    </button>

    <div v-if="isLoading" class="loading">
      <p>Fetching and decrypting your save file... Please wait. 喵~</p>
    </div>

    <div v-if="error" class="error">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-if="saveData" class="result">
      <h2>Decrypted Save Data</h2>
      <pre>{{ JSON.stringify(saveData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sessionToken = ref('')
const saveData = ref<any | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const fetchSaveData = async () => {
  if (!sessionToken.value) return

  isLoading.value = true
  error.value = null
  saveData.value = null

  try {
    const response = await $fetch('/api/get-save', {
      method: 'POST',
      body: {
        token: sessionToken.value,
      },
    })

    if (response.success) {
      saveData.value = response.data
    } else {
      throw new Error(response.error || 'Failed to fetch save data.')
    }
  } catch (e: any) {
    error.value = e.data?.error || e.message || 'An unexpected error occurred.'
  } finally {
    isLoading.value = false
  }
}
</script>