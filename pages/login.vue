<template>
  <div class="container">
    <h1>TapTap 登录</h1>
    <button @click="startLogin">使用 TapTap 登录</button>

    <div class="qrcode-wrapper">
      <qrcode-vue v-if="qrcodeValue" :value="qrcodeValue" :size="128" level="H"></qrcode-vue>
    </div>

    <div id="result">{{ resultMessage }}</div>

    <div class="manual-token-input">
      <h2>或手动输入 Token</h2>
      <input type="password" v-model="manualToken" placeholder="在此输入 Session Token" />
      <button @click="useManualToken">使用此 Token</button>
      <button @click="clearCookie">清除保存的 Token</button>
    </div>
  </div>
</template>

<script>
import QrcodeVue from 'qrcode.vue';
import Cookies from 'js-cookie';

export default {
  components: {
    QrcodeVue,
  },
  data() {
    return {
      intervalId: null,
      qrcodeValue: '',
      resultMessage: '点击按钮开始登录流程。',
      manualToken: '',
    };
  },
  mounted() {
    this.loadTokenFromCookie();
  },
  beforeDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  },
  methods: {
    generateDeviceId() {
      return 'web-' + Math.random().toString(36).substring(2, 15);
    },
    async startLogin() {
      const deviceId = this.generateDeviceId();
      this.resultMessage = "正在生成设备码...";
      this.qrcodeValue = '';

      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      try {
        const response = await fetch('/api/login', { 
          method: 'POST',
        });
        const data = await response.json();
        console.log("设备码响应:", data);

        // 检查设备码是否成功获取
        if (!data.qrcode_url || !data.device_code) {
          this.resultMessage = "获取设备码失败: " + (data.error || '未知错误');
          return; // 停止流程
        }

        const qrcodeUrl = data.qrcode_url;
        const deviceCode = data.device_code;

        this.resultMessage = "设备码已接收。等待 TapTap 授权...";
        this.qrcodeValue = qrcodeUrl;

        // 2. 获取 Token
        this.intervalId = setInterval(async () => {
          try {
            const tokenResponse = await fetch(`/api/token/${deviceCode}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain',
              },
              body: deviceId,
            });

            // 首先检查 HTTP 错误
            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json();
              console.error("Token API HTTP 错误:", tokenResponse.status, errorData);
              this.resultMessage = `登录失败: ${errorData.statusMessage || '未知错误'} (${tokenResponse.status})`;
              clearInterval(this.intervalId);
              return;
            }

            const tokenData = await tokenResponse.json();
            console.log("完整 Token 响应数据:", tokenData);

            if (tokenData.success === false) {
              if (tokenData.data && tokenData.data.error === "authorization_pending") {
                console.log("等待扫码中...");
                this.resultMessage = "等待扫码中，请在 TapTap App 中扫码...";
              } else if (tokenData.data && tokenData.data.error === "authorization_waiting") {
                console.log("等待授权中...");
                this.resultMessage = "等待授权中，请在 TapTap App 中授权...";
              } else {
                this.resultMessage = "登录流程发生错误: " + JSON.stringify(tokenData.data || '未知错误', null, 2);
                clearInterval(this.intervalId);
              }
            } else if (tokenData.success === true) {
              // 登录成功
              this.resultMessage = "登录成功！已保存 Token 到 Cookie。";
              this.saveTokenToCookie(tokenData.data.sessionToken);
              clearInterval(this.intervalId);
            } else {
              this.resultMessage = "收到非预期响应: " + JSON.stringify(tokenData, null, 2);
              clearInterval(this.intervalId);
            }

          } catch (error) {
            console.error("获取 Token 时出错:", error);
            this.resultMessage = "获取 Token 时出错: " + (error.message || error);
            clearInterval(this.intervalId); // 网络/解析错误时停止轮询
          }
        }, 5000); // 每 5 秒轮询
      } catch (error) {
        console.error("获取设备码时出错:", error);
        this.resultMessage = "获取设备码时出错: " + (error.message || error);
      }
    },
    saveTokenToCookie(token) {
      Cookies.set('session_token', token, { expires: 28 });
      this.resultMessage += '\nToken 已保存到 Cookie。';
      console.log('Token 已保存到 Cookie:', token);
    },
    loadTokenFromCookie() {
      const token = Cookies.get('session_token');
      if (token) {
        this.manualToken = token; // 将 Cookie 中的 Token 加载到输入框
        this.resultMessage = `已从 Cookie 加载 Token: ${token.substring(0, 10)}...（已隐藏部分）\n您可以使用此 Token 或开始新的登录流程。`;
        console.log('从 Cookie 加载的 Token:', token);
      } else {
        this.resultMessage = '点击按钮开始登录流程。';
      }
    },
    useManualToken() {
      const token = this.manualToken.trim();
      if (token) {
        this.saveTokenToCookie(token);
        this.resultMessage = `已使用手动输入的 Token 并保存到 Cookie: ${token.substring(0, 10)}...（已隐藏部分）`;
      } else {
        this.resultMessage = '请输入有效的 Token。';
      }
    },
    clearCookie() {
      Cookies.remove('session_token');
      this.manualToken = '';
      this.resultMessage = '已清除保存的 Token。请点击按钮开始新的登录流程。';
      console.log('TapTap Token Cookie 已清除。');
    }
  },
};
</script>

<style scoped>
body {
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  background-color: #f0f0f0;
}

.container {
  margin: auto;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 500px;
  width: 90%;
}

h1, h2 {
  color: #333;
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  transition: background-color 0.3s ease; /* 添加过渡效果 */
}

button:hover {
  background-color: #0056b3;
}

.manual-token-input button {
  background-color: #28a745; /* 不同的颜色 */
  margin-left: 10px;
}

.manual-token-input button:hover {
  background-color: #218838;
}

.manual-token-input button:last-child { /* 清除按钮 */
  background-color: #dc3545;
}

.manual-token-input button:last-child:hover {
  background-color: #c82333;
}


#result {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
  background-color: #f9f9f9;
  max-height: 200px; /* 限制高度并添加滚动条 */
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box; /* 包含 padding 在宽度内 */
}

.qrcode-wrapper {
  margin-top: 20px;
  border: 1px solid #eee; /* 添加边框 */
  padding: 5px;
  background-color: white;
  border-radius: 4px;
}

.manual-token-input {
  margin-top: 30px;
  border-top: 1px solid #eee;
  padding-top: 20px;
  width: 100%;
}

.manual-token-input input[type="password"] {
  width: calc(100% - 22px); /* 减去 padding 和 border */
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box; /* 包含 padding 在宽度内 */
}
</style>