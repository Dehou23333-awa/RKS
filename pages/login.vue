<template>
  <div class="container">
    <h1>TapTap 登录</h1>

    <button @click="goHome" class="btn-home">返回首页</button>

    <!-- 账号切换区域 -->
    <div class="account-switcher" v-if="savedAccounts.length > 0">
      <h3>已保存的账号</h3>
      <div class="account-list">
        <div v-for="(account, index) in savedAccounts" :key="index" class="account-item"
          :class="{ active: currentAccountId === account.id }">
          <div class="account-info">
            <span class="account-name">{{ account.name || `账号 ${index + 1}` }}</span>
            <span class="account-id">
              {{ account.playerID ? `玩家ID: ${account.playerID}` : `ID: ${account.id.substring(0, 8)}...` }}
            </span>
            <span class="token-status" :class="account.tokenStatus || 'unknown'">
              {{ getTokenStatusText(account.tokenStatus) }}
            </span>
          </div>
          <div class="account-actions">
            <button @click="switchAccount(account)" class="btn-small">切换</button>
            <button @click="validateAccount(account)" class="btn-small">验证</button>
            <button @click="renameAccount(account)" class="btn-small">重命名</button>
            <button @click="deleteAccount(account)" class="btn-small btn-danger">删除</button>
          </div>
        </div>
      </div>
    </div>

    <button @click="startLogin">使用 TapTap 登录新账号</button>

    <div class="qrcode-wrapper">
      <a v-if="qrcodeValue" :href="qrcodeValue" target="_blank" rel="noopener noreferrer">
        <qrcode-vue :value="qrcodeValue" :size="128" level="H"></qrcode-vue>
      </a>
    </div>

    <div id="result">{{ resultMessage }}</div>

    <div class="manual-token-input">
      <h2>或手动输入 Token</h2>
      <input type="password" v-model="manualToken" placeholder="在此输入 Session Token" />
      <button @click="useManualToken">保存此 Token</button>
      <button @click="clearCurrentAccount">清除当前账号</button>
      <button @click="clearAllAccounts" class="btn-danger">清除所有账号</button>
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
      savedAccounts: [],
      currentAccountId: null,
    };
  },
  mounted() {
    this.loadAccounts();
    this.loadTokenFromCookie();
  },
  beforeDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  },
  methods: {
    goHome() {
      window.location.href = '/';
    },
    generateDeviceId() {
      return 'web-' + Math.random().toString(36).substring(2, 15);
    },

    generateAccountId() {
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      const randomString = Array.from(array, num => num.toString(36)).join('').substring(0, 12);
      return 'acc-' + Date.now() + '-' + randomString;
    },

    async fetchPlayerID(sessionToken) {
      try {
        const response = await fetch(`/api/query?action=playerID&sessionToken=${encodeURIComponent(sessionToken)}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 直接检查 playerID 字段
        const playerID = data.playerID || (data.data && data.data.playerID);

        if (playerID) {
          return {
            success: true,
            playerID: playerID,
            tokenStatus: 'valid'
          };
        } else {
          return {
            success: false,
            error: data.error || data.message || '获取玩家ID失败',
            tokenStatus: 'invalid'
          };
        }
      } catch (error) {
        console.error('获取玩家ID失败:', error);
        return {
          success: false,
          error: error.message,
          tokenStatus: 'error'
        };
      }
    },

    async validateAccount(account) {
      this.resultMessage = `正在验证账号 "${account.name}"...`;

      const result = await this.fetchPlayerID(account.token);

      if (result.success) {
        account.playerID = result.playerID;
        account.tokenStatus = 'valid';
        account.lastValidated = new Date().toISOString();
        this.saveAccounts();
        this.resultMessage = `账号 "${account.name}" 验证成功！玩家ID: ${result.playerID}`;
      } else {
        account.tokenStatus = 'invalid';
        account.lastValidated = new Date().toISOString();
        this.saveAccounts();
        this.resultMessage = `账号 "${account.name}" 验证失败: ${result.error}`;
      }
    },

    async validateAllAccounts() {
      this.resultMessage = '正在验证所有账号...';
      let validCount = 0;
      let invalidCount = 0;

      for (const account of this.savedAccounts) {
        const result = await this.fetchPlayerID(account.token);

        if (result.success) {
          account.playerID = result.playerID;
          account.tokenStatus = 'valid';
          validCount++;
        } else {
          account.tokenStatus = 'invalid';
          invalidCount++;
        }
        account.lastValidated = new Date().toISOString();
      }

      this.saveAccounts();
      this.resultMessage = `验证完成：${validCount} 个有效账号，${invalidCount} 个无效账号。`;
    },

    async validateCurrentToken() {
      const token = this.manualToken.trim();
      if (!token) {
        this.resultMessage = '请先输入Token。';
        return;
      }

      this.resultMessage = '正在验证当前Token...';
      const result = await this.fetchPlayerID(token);

      if (result.success) {
        this.resultMessage = `Token验证成功！玩家ID: ${result.playerID}`;
      } else {
        this.resultMessage = `Token验证失败: ${result.error}`;
      }
    },

    getTokenStatusText(status) {
      switch (status) {
        case 'valid': return '✓ 有效';
        case 'invalid': return '✗ 无效';
        case 'error': return '⚠ 错误';
        default: return '? 未验证';
      }
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

        if (!data.qrcode_url || !data.device_code) {
          this.resultMessage = "获取设备码失败: " + (data.error || '未知错误');
          return;
        }

        const qrcodeUrl = data.qrcode_url;
        const deviceCode = data.device_code;

        this.resultMessage = "设备码已接收。等待 TapTap 授权...";
        this.qrcodeValue = qrcodeUrl;

        this.intervalId = setInterval(async () => {
          try {
            const tokenResponse = await fetch(`/api/token/${deviceCode}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain',
              },
              body: deviceId,
            });

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
              this.resultMessage = "登录成功！正在获取用户信息...";
              await this.saveNewAccount(tokenData.data.sessionToken);
              clearInterval(this.intervalId);
            } else {
              this.resultMessage = "收到非预期响应: " + JSON.stringify(tokenData, null, 2);
              clearInterval(this.intervalId);
            }

          } catch (error) {
            console.error("获取 Token 时出错:", error);
            this.resultMessage = "获取 Token 时出错: " + (error.message || error);
            clearInterval(this.intervalId);
          }
        }, 5000);
      } catch (error) {
        console.error("获取设备码时出错:", error);
        this.resultMessage = "获取设备码时出错: " + (error.message || error);
      }
    },

    async saveNewAccount(token) {
      const accountId = this.generateAccountId();
      const newAccount = {
        id: accountId,
        token: token,
        name: `账号 ${this.savedAccounts.length + 1}`,
        createdAt: new Date().toISOString(),
        tokenStatus: 'unknown',
        playerID: null
      };

      // 尝试获取玩家ID
      const result = await this.fetchPlayerID(token);
      if (result.success) {
        newAccount.playerID = result.playerID;
        newAccount.tokenStatus = 'valid';
        this.resultMessage = `登录成功！玩家ID: ${result.playerID}`;
      } else {
        newAccount.tokenStatus = 'invalid';
        this.resultMessage = `登录成功但获取用户信息失败: ${result.error}`;
      }

      this.savedAccounts.push(newAccount);
      this.saveAccounts();
      this.switchAccount(newAccount);
      this.resultMessage += '\n新账号已保存并设为当前账号。';
    },

    saveTokenToCookie(token) {
      Cookies.set('session_token', token, { expires: 28 });
      console.log('Token 已保存到 Cookie:', token);
    },

    async loadTokenFromCookie() {
      const token = Cookies.get('session_token');
      if (token) {
        this.manualToken = token;

        const existingAccount = this.savedAccounts.find(acc => acc.token === token);
        if (existingAccount) {
          this.currentAccountId = existingAccount.id;
          this.resultMessage = `当前使用账号: ${existingAccount.name}`;
          if (existingAccount.playerID) {
            this.resultMessage += ` (玩家ID: ${existingAccount.playerID})`;
          }
        } else {
          this.resultMessage = `已从 Cookie 加载 Token: ${token.substring(0, 10)}...（已隐藏部分）\n您可以使用此 Token 或开始新的登录流程。`;
        }
        console.log('从 Cookie 加载的 Token:', token);
      } else {
        this.resultMessage = '点击按钮开始登录流程。';
      }
    },

    async useManualToken() {
      const token = this.manualToken.trim();
      if (token) {
        const existingAccount = this.savedAccounts.find(acc => acc.token === token);
        if (existingAccount) {
          this.switchAccount(existingAccount);
          this.resultMessage = `已切换到已存在的账号: ${existingAccount.name}`;
        } else {
          await this.saveNewAccount(token);
          this.resultMessage = `已使用手动输入的 Token 创建新账号并保存。`;
        }
      } else {
        this.resultMessage = '请输入有效的 Token。';
      }
    },

    loadAccounts() {
      const accountsData = localStorage.getItem('taptap_accounts');
      if (accountsData) {
        try {
          const data = JSON.parse(accountsData);
          this.savedAccounts = data.accounts || [];
          this.currentAccountId = data.currentAccountId || null;
        } catch (e) {
          console.error('加载账号数据失败:', e);
          this.savedAccounts = [];
        }
      }
    },

    saveAccounts() {
      const data = {
        accounts: this.savedAccounts,
        currentAccountId: this.currentAccountId
      };
      localStorage.setItem('taptap_accounts', JSON.stringify(data));
    },

    async switchAccount(account) {
      this.currentAccountId = account.id;
      this.saveTokenToCookie(account.token);
      this.manualToken = account.token;
      this.saveAccounts();

      let message = `已切换到账号: ${account.name}`;
      if (account.playerID) {
        message += ` (玩家ID: ${account.playerID})`;
      }

      // 如果token状态未知或者很久没验证，自动验证一次
      const lastValidated = account.lastValidated ? new Date(account.lastValidated) : null;
      const hoursSinceValidation = lastValidated ? (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60) : Infinity;

      if (!account.tokenStatus || account.tokenStatus === 'unknown' || hoursSinceValidation > 24) {
        message += '\n正在验证Token状态...';
        this.resultMessage = message;
        await this.validateAccount(account);
      } else {
        this.resultMessage = message;
      }
    },

    renameAccount(account) {
      const newName = prompt('请输入新的账号名称:', account.name);
      if (newName && newName.trim()) {
        account.name = newName.trim();
        this.saveAccounts();
        this.resultMessage = `账号已重命名为: ${account.name}`;
      }
    },

    deleteAccount(account) {
      if (confirm(`确定要删除账号 "${account.name}" 吗？`)) {
        const index = this.savedAccounts.findIndex(acc => acc.id === account.id);
        if (index > -1) {
          this.savedAccounts.splice(index, 1);

          if (this.currentAccountId === account.id) {
            Cookies.remove('session_token');
            this.currentAccountId = null;
            this.manualToken = '';

            if (this.savedAccounts.length > 0) {
              this.switchAccount(this.savedAccounts[0]);
            }
          }

          this.saveAccounts();
          this.resultMessage = `账号 "${account.name}" 已删除。`;
        }
      }
    },

    clearCurrentAccount() {
      if (this.currentAccountId) {
        const account = this.savedAccounts.find(acc => acc.id === this.currentAccountId);
        if (account) {
          this.deleteAccount(account);
        }
      } else {
        Cookies.remove('session_token');
        this.manualToken = '';
        this.resultMessage = '已清除当前 Token。';
      }
    },

    clearAllAccounts() {
      if (confirm('确定要清除所有保存的账号吗？此操作不可恢复。')) {
        this.savedAccounts = [];
        this.currentAccountId = null;
        localStorage.removeItem('taptap_accounts');
        Cookies.remove('session_token');
        this.manualToken = '';
        this.resultMessage = '已清除所有保存的账号。';
      }
    }
  },
};
</script>

<style scoped>
/* 保留原有样式并添加新样式 */
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
  max-width: 700px;
  width: 90%;
}

h1,
h2,
h3 {
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
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #0056b3;
}

.manual-token-input button {
  background-color: #28a745;
  margin-left: 10px;
}

.manual-token-input button:hover {
  background-color: #218838;
}

.manual-token-input button:last-child {
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
  max-height: 200px;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}

.qrcode-wrapper {
  margin-top: 20px;
  border: 1px solid #eee;
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
  width: calc(100% - 22px);
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

/* 多账号管理样式 */
.account-switcher {
  width: 100%;
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.account-switcher h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #495057;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.account-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.account-item.active {
  border-color: #007bff;
  background-color: #e7f3ff;
}

.account-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  flex: 1;
}

.account-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.account-id {
  font-size: 11px;
  color: #6c757d;
  margin-bottom: 2px;
}

.player-id {
  font-size: 12px;
  color: #28a745;
  font-weight: 500;
  margin-bottom: 2px;
}

.token-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
}

.token-status.valid {
  color: #155724;
  background-color: #d4edda;
}

.token-status.invalid {
  color: #721c24;
  background-color: #f8d7da;
}

.token-status.error {
  color: #856404;
  background-color: #fff3cd;
}

.token-status.unknown {
  color: #6c757d;
  background-color: #e9ecef;
}

.account-actions {
  display: flex;
  gap: 5px;
}

.bulk-actions {
  margin-top: 10px;
  text-align: center;
}

.btn-small {
  padding: 5px 10px;
  font-size: 12px;
  margin-top: 0;
}

.btn-danger {
  background-color: #dc3545;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-home {
  background-color: #6c757d;
  margin-bottom: 20px;
}

.btn-home:hover {
  background-color: #5a6268;
}
</style>