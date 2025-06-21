<!--
路径: pages/index.vue (Corrected Verification Logic)
-->
<template>
  <div class="container">
    <h1>Phigros Save Tester</h1>
    <p>A full round-trip test: Get → Parse → Edit → Build → Upload → Verify.</p>

    <!-- Step 1: Input Token and Get Save -->
    <div class="card">
      <h2>Step 1: Fetch & Parse Save File</h2>
      <div class="input-group">
        <label for="token-input">Session Token:</label>
        <input
          id="token-input"
          v-model="sessionToken"
          type="text"
          placeholder="Enter your 25-character sessionToken"
          :disabled="isLoading"
        />
        <button @click="getAndParseSave" :disabled="!sessionToken || isLoading">
          {{ isLoadingGet ? 'Loading...' : 'Get & Parse Save' }}
        </button>
      </div>
    </div>

    <!-- Step 2: Display, Edit, and Rebuild -->
    <div v-if="parsedSaveData" class="card">
      <h2>Step 2: Edit Data & Rebuild Save File</h2>
      <p>The parsed data is shown below. You can edit it directly in the text area.</p>

      <textarea v-model="saveDataString" rows="20"></textarea>

      <div class="input-group">
        <button @click="buildAndDownloadSave" :disabled="isLoading">
          {{ isLoadingBuild ? 'Building...' : 'Build & Download Save' }}
        </button>
      </div>
    </div>

    <!-- Step 3: Verify Rebuilt File -->
    <div v-if="downloadCompleted" class="card">
      <h2>Step 3: Verify Rebuilt File</h2>
      <p>Upload the <code>gameFile.zip</code> you just downloaded to verify it.</p>
      <div class="input-group">
        <input type="file" @change="handleFileSelect" accept=".zip" :disabled="isLoading" />
        <button @click="parseUploadedFile" :disabled="!uploadedFile || isLoading">
           {{ isLoadingParseUpload ? 'Verifying...' : 'Verify Uploaded File' }}
        </button>
      </div>
       <div v-if="reParsedData">
        <h3>Verification Result:</h3>
        <div v-if="isVerificationSuccessful" class="message success">
            ✅ Verification Successful! The re-parsed data is deeply equal to the data used for building.
        </div>
        <div v-else class="message error">
            ❌ Verification Failed! The re-parsed data does NOT match. Check the data below for differences.
        </div>
        <textarea v-model="reParsedDataString" rows="20" readonly></textarea>
       </div>
    </div>

    <!-- Status Messages -->
    <div v-if="errorMessage" class="message error">
      <strong>Error:</strong> {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="message success">
      <strong>Success:</strong> {{ successMessage }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const sessionToken = ref('');
const parsedSaveData = ref<Record<string, any> | null>(null);
const reParsedData = ref<Record<string, any> | null>(null);
const uploadedFile = ref<File | null>(null);
const downloadCompleted = ref(false);

const isLoadingGet = ref(false);
const isLoadingBuild = ref(false);
const isLoadingParseUpload = ref(false);

const errorMessage = ref('');
const successMessage = ref('');

// Combined loading state for disabling UI elements
const isLoading = computed(() => isLoadingGet.value || isLoadingBuild.value || isLoadingParseUpload.value);

// A computed property to handle the conversion between the object and a formatted JSON string for the textarea
const saveDataString = computed({
  get: () => parsedSaveData.value ? JSON.stringify(parsedSaveData.value, null, 2) : '',
  set: (val) => {
    try {
      parsedSaveData.value = JSON.parse(val);
      errorMessage.value = ''; // Clear error if parsing succeeds
    } catch (e) {
      errorMessage.value = 'Invalid JSON format in the text area.';
    }
  }
});

// Computed property for the re-parsed data (display only)
const reParsedDataString = computed(() => reParsedData.value ? JSON.stringify(reParsedData.value, null, 2) : '');

// ===================================================================
//                        CORRECTED VERIFICATION LOGIC
// ===================================================================

/**
 * Recursively creates a new object with all its keys sorted alphabetically.
 * This is used to create a "canonical" representation for comparison.
 * @param obj The object or value to process.
 */
function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj; // Return primitives as-is
  }

  if (Array.isArray(obj)) {
    return obj.map(canonicalize); // Process each item in an array
  }

  // Process objects: sort keys and recurse on values
  const sortedObj: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = canonicalize(obj[key]);
  });
  return sortedObj;
}

const isVerificationSuccessful = computed(() => {
    if (!parsedSaveData.value || !reParsedData.value) return false;
    
    // Create canonical (key-sorted) versions of both objects and then compare their string representations.
    // This is a robust way to check for deep equality, ignoring key order.
    const canonicalOriginal = JSON.stringify(canonicalize(parsedSaveData.value));
    const canonicalRebuilt = JSON.stringify(canonicalize(reParsedData.value));

    return canonicalOriginal === canonicalRebuilt;
});
// ===================================================================


function clearAllState() {
  clearMessages();
  parsedSaveData.value = null;
  reParsedData.value = null;
  uploadedFile.value = null;
  downloadCompleted.value = false;
}

function clearMessages() {
  errorMessage.value = '';
  successMessage.value = '';
}

async function getAndParseSave() {
  clearAllState();
  isLoadingGet.value = true;
  try {
    const response = await $fetch('/api/get-save', { method: 'POST', body: { token: sessionToken.value } });
    if (response.success) {
      parsedSaveData.value = response.data;
      successMessage.value = 'Save file fetched and parsed successfully!';
    } else { throw new Error(response.error); }
  } catch (error: any) {
    errorMessage.value = error.data?.error || error.message || 'An unknown error occurred.';
  } finally {
    isLoadingGet.value = false;
  }
}

async function buildAndDownloadSave() {
  if (!parsedSaveData.value) return;
  clearMessages();
  reParsedData.value = null;
  uploadedFile.value = null;
  downloadCompleted.value = false;
  isLoadingBuild.value = true;
  try {
    const blob = await $fetch('/api/build-save', { method: 'POST', body: parsedSaveData.value, responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gameFile.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    successMessage.value = 'Save file built! Download has started. You can now verify it in Step 3.';
    downloadCompleted.value = true;
  } catch (error: any) {
    errorMessage.value = error.data?.error || error.message || 'Failed to build the save file.';
  } finally {
    isLoadingBuild.value = false;
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadedFile.value = target.files[0];
  } else {
    uploadedFile.value = null;
  }
}

async function parseUploadedFile() {
  if (!uploadedFile.value) return;
  clearMessages();
  reParsedData.value = null;
  isLoadingParseUpload.value = true;
  try {
    const formData = new FormData();
    formData.append('savefile', uploadedFile.value);

    const response = await $fetch('/api/parse-upload', { method: 'POST', body: formData });
    if (response.success) {
        reParsedData.value = response.data;
        successMessage.value = "Uploaded file parsed successfully! Check the verification result."
    } else { throw new Error(response.error); }
  } catch (error: any) {
     errorMessage.value = error.data?.error || error.message || 'Failed to parse the uploaded file.';
  } finally {
      isLoadingParseUpload.value = false;
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: sans-serif;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 0.5rem;
}

p {
  color: #666;
  margin-bottom: 1rem;
}

.card {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h2 {
  margin-top: 0;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

h3 {
    margin-top: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

label {
  font-weight: bold;
}

input[type="text"],
input[type="file"],
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

textarea {
  font-family: 'Courier New', Courier, monospace;
  min-height: 300px;
  resize: vertical;
}

textarea[readonly] {
    background-color: #f1f1f1;
    cursor: not-allowed;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #a0c3e6;
  cursor: not-allowed;
}

.message {
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  text-align: left;
  line-height: 1.4;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
</style>