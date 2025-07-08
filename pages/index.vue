<template>
  <div class="home-wrapper">
    <h1>Phigros B27 报告生成器</h1>
    <div class="btn-group">
      <router-link to="/b27">
        <button class="go-btn">查询成绩</button>
      </router-link>
      <router-link to="/login">
        <button class="go-btn login-btn">登录后立即查分</button>
      </router-link>
      <router-link to="/songs">
        <button class="go-btn songs-btn">Phigros全曲目</button>
      </router-link>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Welcome to RKS',
  meta: [
    { name: 'description', content: 'Phigros B27 成绩查询工具，支持生成 B27 成绩图、查看全部记录、导出成绩等功能。' },
    { name: 'keywords', content: 'Phigros,B27,成绩查询,音游,RKS' },
    { property: 'og:title', content: 'Phigros B27 成绩查询 | RKS' },
    { property: 'og:description', content: 'Phigros B27 成绩查询工具，支持生成 B27 成绩图、查看全部记录、导出成绩等功能。' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
})
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
  flex-wrap: wrap;
  justify-content: center;
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

.go-btn.songs-btn {
  background: #6f42c1;
}

.go-btn.songs-btn:hover {
  background: #5a32a3;
}

.go-btn:hover {
  background: #0056b3;
}
</style>