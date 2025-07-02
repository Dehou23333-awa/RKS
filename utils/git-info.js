import { execSync } from 'child_process'

export function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    
    return {
      hash: commitHash,
      date: commitDate,
      branch: branch
    }
  } catch (error) {
    console.warn('无法获取Git信息:', error.message)
    return {
      hash: 'dev',
      date: new Date().toISOString(),
      branch: 'local'
    }
  }
}