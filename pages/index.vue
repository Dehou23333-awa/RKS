<template>
  <div class="home-wrapper">
    <h1>Phigros B27 报告生成器</h1>
    <p>欢迎使用！请选择上方导航进入 B27 报告页面。</p>
    <div class="btn-group">
      <router-link to="/b27">
        <button class="go-btn">前往 B27 报告</button>
      </router-link>
      <router-link to="/login">
        <button class="go-btn login-btn">立即查分</button>
      </router-link>
    </div>
  </div>
</template>

<script setup>
// 首页暂不需要逻辑
</script>

<style scoped>
.home-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  background: #f0f2f5;
}
h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #007bff;
}
p {
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 2rem;
}
.btn-group {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.go-btn {
  padding: 12px 32px;
  font-size: 1.2rem;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.go-btn.login-btn {
  background: #28a745;
}
.go-btn.login-btn:hover {
  background: #1e7e34;
}
.go-btn:hover {
  background: #0056b3;
}
</style>
