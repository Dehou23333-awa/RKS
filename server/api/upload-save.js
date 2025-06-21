// server/api/upload-save.ts
import crypto from 'crypto'
import { defineEventHandler, readBody } from 'h3'
import qiniu from 'qiniu'
import axios from 'axios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sessionToken, data, summary } = body
  const Qiniuheaders = {
    'X-LC-Session': sessionToken,
    'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
    'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
    'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
    'Accept': 'application/json',
  }

  try {
    // 0. 获取用户ID
    const result = await axios.get(`http://localhost:3000/api/query?action=OriginSummary&sessionToken=${sessionToken}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('获取存档记录成功:', result.data);
    const userId = result.data.results.user.objectId;
    const createdAt = result.data.results.createdAt;
    const objectId = result.data.results.objectId;
    console.log('用户ID:', userId, '创建时间:', createdAt, '存档ID:', objectId);

    // 转换文件
    const fileBuffer = Buffer.from(data, 'base64');

    // 1. 计算文件哈希
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex')

    // 2. 获取上传凭证
    const tokenRes = await axios.post(
      'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/fileTokens',
      {
        name: '.save',
        __type: 'File',
        ACL: { [userId]: { read: true, write: true } },
        prefix: 'gamesaves',
        metaData: {
          size: data.length,
          _checksum: md5Hash,
          prefix: 'gamesaves'
        }
      },
      {
        headers: {
          'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
          'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
          'X-LC-Session': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('获取上传凭证成功:', tokenRes.data)
    const NewgameFile = {
      __type: 'File',
      "bucket": tokenRes.data.bucket,
      "createdAt": tokenRes.data.createdAt,
      "key": tokenRes.data.key,
      metaData: {
        _checksum: tokenRes.data.metaData._checksum,
        prefix: 'gamesaves',
        size: tokenRes.data.metaData.size,
      },
      mine_type: tokenRes.data.mime_type,
      name: tokenRes.data.name,
      objectId: tokenRes.data.objectId,
      provider: tokenRes.data.provider,
      updatedAT: tokenRes.data.createdAt,
      url: tokenRes.data.url
    }
    const { key, token: qiniuToken, objectId: fileId} = tokenRes.data
    console.log("新的文件信息:", NewgameFile)

    // 3. 直传文件到七牛云
    const formUploader = new qiniu.form_up.FormUploader()
    await new Promise((resolve, reject) => {
      formUploader.put(
        qiniuToken,
        key,
        fileBuffer,
        new qiniu.form_up.PutExtra(),
        (err, ret) => err ? reject(err) : resolve(ret)
      )
    })
    console.log('文件上传成功:', key)

    // 4. 回调游戏服务器
    await axios.post(
      'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/fileCallback',
      { result: true, token: qiniuToken },
      {
        headers: Qiniuheaders
      }
    )
    console.log('回调游戏服务器成功')

    // 5. 更新存档记录
    const newSummary = {
      createdAt: createdAt,
      gameFile: NewgameFile,
      modifiedAt:{
        __type: 'Date',
        iso: new Date().toISOString()
      },
      name: "save",
      objectId: objectId,
      summary: summary,
      updatedAt: new Date().toISOString(),
      user: {
        __type: 'Pointer',
        className: '_User',
        objectId: userId
      }
    }

    console.log('更新存档记录:', newSummary)

    await axios.put(
      `https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/classes/_GameSave/${objectId}`,
      newSummary,
      {
        headers: Qiniuheaders
      }
    )

    console.log('存档记录更新成功:')

    // 6. 删除旧文件
    if (fileId) {
      await axios.delete(
        `https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/files/${summary.fileId}`,
        {
          headers: Qiniuheaders
        }
      )
    }

    console.log('旧文件删除成功:', fileId)

    return { success: true }
  } catch (error) {
    console.error('上传失败:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
})
