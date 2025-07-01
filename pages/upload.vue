<template>
  <div class="container">
    <h1>上传游戏存档</h1>

    <label for="sessionToken">Session Token:</label>
    <input type="text" v-model="sessionToken" placeholder="从Cookie中读取" readonly>

    <div class="summary-input-section">
      <h3>存档摘要参数:</h3>
      <p>这里显示您当前存档的摘要信息，您可以修改后生成新的Base64摘要进行上传。</p>

      <label for="saveVersion">Save Version:</label>
      <input type="number" id="saveVersion" v-model.number="summaryParams.saveVersion" /><br />

      <label for="challenge">Challenge:</label>
      <input type="number" id="challenge" v-model.number="summaryParams.challenge" /><br />

      <label for="rks">RKS:</label>
      <input type="number" step="0.001" id="rks" v-model.number="summaryParams.rks" /><br />

      <label for="gameVersion">Game Version:</label>
      <input type="number" id="gameVersion" v-model.number="summaryParams.gameVersion" /><br />

      <label for="avatar">Avatar:</label>
      <input type="text" id="avatar" v-model="summaryParams.avatar" /><br />

      <h4>等级数据 (3个数字，用逗号分隔):</h4>
      <label for="ezLevels">EZ Levels:</label>
      <input type="text" id="ezLevels" v-model="ezLevelsInput" placeholder="例如: 10,20,30" /><br />

      <label for="hdLevels">HD Levels:</label>
      <input type="text" id="hdLevels" v-model="hdLevelsInput" placeholder="例如: 40,50,60" /><br />

      <label for="inLevels">IN Levels:</label>
      <input type="text" id="inLevels" v-model="inLevelsInput" placeholder="例如: 70,80,90" /><br />

      <label for="atLevels">AT Levels:</label>
      <input type="text" id="atLevels" v-model="atLevelsInput" placeholder="例如: 100,110,120" /><br />

      <button @click="encodeSummaryData">生成 Base64 存档摘要</button>
      <textarea v-model="summaryBase64" placeholder="生成的Base64编码摘要" readonly></textarea>
    </div>

    <label for="gameFile">选择存档文件 (save.zip):</label>
    <input type="file" id="gameFile" @change="handleFileUpload" accept=".zip">

    <button @click="uploadSave">上传存档</button>

    <div :class="messageClass">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import Cookies from 'js-cookie';

const sessionToken = ref('');
const summaryBase64 = ref('');
const gameData = ref('');
const message = ref('');
const messageClass = ref('');

const summaryParams = ref({
  saveVersion: 0,
  challenge: 0,
  rks: 0.0,
  gameVersion: 0,
  avatar: '',
  EZ: [0, 0, 0],
  HD: [0, 0, 0],
  IN: [0, 0, 0],
  AT: [0, 0, 0],
});

// 用于输入等级的字符串
const ezLevelsInput = ref('');
const hdLevelsInput = ref('');
const inLevelsInput = ref('');
const atLevelsInput = ref('');

// 解析等级输入字符串为数字数组
const parseLevelsInput = (input) => {
  const numbers = input.split(',')
                       .map(s => parseInt(s.trim(), 10))
                       .filter(n => !isNaN(n));
  while(numbers.length < 3) numbers.push(0);
  return numbers.slice(0, 3);
};

// 监听输入框变化，更新 summaryParams 中的数组
watch(ezLevelsInput, (val) => { summaryParams.value.EZ = parseLevelsInput(val); });
watch(hdLevelsInput, (val) => { summaryParams.value.HD = parseLevelsInput(val); });
watch(inLevelsInput, (val) => { summaryParams.value.IN = parseLevelsInput(val); });
watch(atLevelsInput, (val) => { summaryParams.value.AT = parseLevelsInput(val); });

const formatLevelsArray = (arr) => {
  return arr.join(',');
};

const fetchSummary = async (token) => {
  message.value = '正在尝试获取当前存档摘要...';
  messageClass.value = '';
  try {
    const response = await axios.get(`/api/query?action=summary&sessionToken=${token}`);
    if (response.data) {
      const data = response.data;
      summaryParams.value.saveVersion = data.saveVersion;
      summaryParams.value.challenge = data.challenge;
      summaryParams.value.rks = data.rks;
      summaryParams.value.gameVersion = data.gameVersion;
      summaryParams.value.avatar = data.avatar;

      ezLevelsInput.value = formatLevelsArray(data.EZ);
      hdLevelsInput.value = formatLevelsArray(data.HD);
      inLevelsInput.value = formatLevelsArray(data.IN);
      atLevelsInput.value = formatLevelsArray(data.AT);

      message.value = '已加载当前存档摘要信息。';
      messageClass.value = 'success';
      console.log('Summary data loaded:', data);
    } else {
       message.value = '获取存档摘要失败: 响应数据为空。';
       messageClass.value = 'error';
       console.error('Failed to fetch summary: Empty response data');
    }
  } catch (error) {
    messageClass.value = 'error';
    message.value = `获取存档摘要失败: ${error.response?.data?.body || error.message}`;
    console.error('Error fetching summary:', error);
  }
};


onMounted(() => {
  const token = Cookies.get('session_token');
  if (token) {
    sessionToken.value = token;
    console.log('从 Cookie 读取到 session_token:', token);
    fetchSummary(token);
  } else {
    console.warn('Cookie 中未找到 session_token。');
    message.value = '警告：未从 Cookie 中读取到 session_token。请确保已登录。无法获取当前存档摘要。';
    messageClass.value = 'error';
  }
});

// 处理文件上传的函数
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.name.toLowerCase() !== 'save.zip') {
      message.value = '请选择名为 "save.zip" 的文件。';
      messageClass.value = 'error';
      gameData.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      gameData.value = e.target.result.split(',')[1];
      message.value = `文件 "${file.name}" 已加载，等待上传。`;
      messageClass.value = 'success';
    };
    reader.onerror = () => {
      message.value = '文件读取失败。';
      messageClass.value = 'error';
    };
    reader.readAsDataURL(file);
  } else {
    gameData.value = '';
    message.value = '未选择文件。';
    messageClass.value = '';
  }
};

// 编码摘要数据并更新 summaryBase64
async function encodeSummaryData() {
  message.value = '正在编码摘要数据...';
  messageClass.value = '';

  try {
    const response = await axios.post('/api/query?action=encodeSummary', summaryParams.value, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.encodedSummary) {
      summaryBase64.value = response.data.encodedSummary;
      message.value = '存档摘要已成功编码为 Base64。';
      messageClass.value = 'success';
      console.log('编码成功:', response.data.encodedSummary);
    } else {
      messageClass.value = 'error';
      message.value = `摘要编码失败: ${response.data.error || '未知错误'}`;
      console.error('编码失败响应:', response.data);
    }
  } catch (error) {
    messageClass.value = 'error';
    message.value = `编码过程中发生错误: ${error.response?.data?.body || error.message}`;
    console.error('编码过程中发生错误:', error);
  }
}

async function uploadSave() {
  message.value = '正在上传，请稍候...';
  messageClass.value = '';

  if (!sessionToken.value) {
    messageClass.value = 'error';
    message.value = 'Session Token 未设置，请确保已登录。';
    return;
  }

  // 在上传前检查 summaryBase64 是否已生成
  if (!summaryBase64.value) {
    messageClass.value = 'error';
    message.value = '请先生成 Base64 编码的存档摘要。';
    return;
  }

  if (!gameData.value) {
    messageClass.value = 'error';
    message.value = '存档文件不能为空，请选择 save.zip。';
    return;
  }

  try {
    const response = await axios.post('/api/upload-save', {
      sessionToken: sessionToken.value,
      data: gameData.value, 
      summary: summaryBase64.value
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      messageClass.value = 'success';
      message.value = '存档上传成功！';
      console.log('上传成功响应:', response.data);
    } else {
      messageClass.value = 'error';
      message.value = `上传失败: ${response.data.error || '未知错误'}`;
      console.error('上传失败响应:', response.data);
    }
  } catch (error) {
    messageClass.value = 'error';
    message.value = `上传过程中发生错误: ${error.response?.data?.body || error.message}`;
    console.error('上传过程中发生错误:', error);
  }
}
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 20px auto;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
h1 {
  color: #0056b3;
  text-align: center;
  margin-bottom: 20px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}
input[type="text"],
input[type="number"],
textarea {
  width: calc(100% - 20px);
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 15px;
}
input[readonly] {
  background-color: #f0f0f0;
  cursor: default;
}
textarea {
  min-height: 80px;
  resize: vertical;
  background-color: #f9f9f9;
}
button {
  background-color: #007bff;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  transition: background-color 0.3s ease;
  margin-bottom: 15px;
}
button:hover {
  background-color: #0056b3;
}
button:active {
    background-color: #004085;
}

.summary-input-section {
  margin-bottom: 25px;
  padding: 20px;
  border: 1px dashed #a0a0a0;
  background-color: #f8f9fa;
  border-radius: 5px;
}
.summary-input-section h3,
.summary-input-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #0056b3;
}
.summary-input-section p {
    font-size: 0.9em;
    color: #555;
    margin-top: -10px;
    margin-bottom: 20px;
}
.summary-input-section label {
  display: inline-block;
  width: 150px;
  margin-right: 10px;
  vertical-align: top;
  margin-bottom: 10px;
}
.summary-input-section input[type="text"],
.summary-input-section input[type="number"] {
  width: calc(100% - 170px);
  margin-bottom: 10px;
  display: inline-block;
  vertical-align: top;
}

.summary-input-section button {
    margin-top: 5px;
    background-color: #ffc107;
    color: #333;
}
.summary-input-section button:hover {
     background-color: #e0a800;
}


input[type="file"] {
    display: block;
    margin-bottom: 20px;
}

.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
  word-break: break-all;
}
.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
  margin-top: 15px;
  word-break: break-all;
}
</style>