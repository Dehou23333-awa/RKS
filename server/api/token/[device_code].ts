import { defineEventHandler, readBody, getRouterParams, createError } from 'h3';
import axios from 'axios';
import crypto from 'crypto';

// Initialize shared axios instances (same as in api/login.ts)
const taptapClient = axios.create({
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'TapTapAndroidSDK/3.16.5',
  },
  validateStatus: function (status) {
    return true;
  },
});

const phiClient = axios.create({
  headers: {
    'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
    'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
    'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
    'Content-Type': 'application/json',
  },
});

// Helper function equivalent to Python's mac
function generateMac(token: any): string {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * (2 ** 32 - 1));
  const inputStr = `${ts}\n${nonce}\nGET\n/account/basic-info/v1?client_id=rAK3FfdieFob2Nn8Am\nopen.tapapis.cn\n443\n\n`;

  const hmacSha1 = crypto.createHmac('sha1', token.mac_key);
  hmacSha1.update(inputStr);
  const macBase64 = hmacSha1.digest('base64');

  return `MAC id="${token.kid}",ts="${ts}",nonce="${nonce}",mac="${macBase64}"`;
}

// Helper function to get account info
async function getAccountInfo(token: any): Promise<any> {
  const url = 'https://open.tapapis.cn/account/basic-info/v1?client_id=rAK3FfdieFob2Nn8Am';
  const headers = { ...taptapClient.defaults.headers.common, Authorization: generateMac(token) };

  const response = await taptapClient.get(url, { headers });
  return response.data.data;
}

// Helper function to register user
async function registerUser(token: any, account: any): Promise<any> {
  const url = 'https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/users';
  const payload = {
    authData: {
      taptap: {
        kid: token.kid,
        access_token: token.kid,
        token_type: 'mac',
        mac_key: token.mac_key,
        mac_algorithm: 'hmac-sha-1',
        openid: account.openid,
        unionid: account.unionid,
      },
    },
  };

  const response = await phiClient.post(url, payload);
  return response.data;
}

export default defineEventHandler(async (event) => {
  const { device_code } = getRouterParams(event);
  const deviceId = await readBody(event);
  const url = "https://www.taptap.cn/oauth2/v1/token";
  const payload = `grant_type=device_token&client_id=rAK3FfdieFob2Nn8Am&secret_type=hmac-sha-1&code=${device_code}&version=1.0&platform=unity&info=%7b%22device_id%22%3a%22${deviceId}%22%7d`;

  try {
    const response = await taptapClient.post(url, payload);
    const tapTapResponseData = response.data;

    if (tapTapResponseData.data.error === 'authorization_pending'
        || tapTapResponseData.data.error === 'authorization_waiting'){
        //Pending or waiting for authorization, return the data as is
        return tapTapResponseData;
    }
    else if (tapTapResponseData.data.code === -1)//Error
    {
        console.error('TapTap token exchange failed:', tapTapResponseData.data);
        throw createError({
          statusCode: 400,
          statusMessage: 'TapTap token exchange failed',
          data: tapTapResponseData.data,
        });
    }
    //Get session token
    const token = tapTapResponseData.data;
    const accountInfo = await getAccountInfo(token);
    const userInfo = await registerUser(token, accountInfo);

    return {
      success: true,
      data: userInfo,
    };

  } catch (error: any) {
    console.error('Backend process error during TapTap token exchange or user registration:', error.response?.data || error.message || error);

    if (error.statusCode && error.statusMessage) {
        throw error;
    }

    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?.statusText || 'Internal Server Error during login process',
      data: error.response?.data || { message: 'An unexpected backend error occurred during login process.' },
    });
  }
});