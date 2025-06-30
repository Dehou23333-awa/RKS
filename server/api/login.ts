export default defineEventHandler(async (event) => {
  try {
    const device_id = await readBody(event);
    const loginResponse = await login(device_id);
    return loginResponse;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Login failed'
    });
  }
});

class Share {
  client: {
    post: (url: string, options: any) => Promise<Response>;
    get: (url: string, options: any) => Promise<Response>;
  };
  tap_headers: Record<string, string>;

  constructor() {
    this.client = {
      post: async (url: string, options: any) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: options.headers,
          body: options.body,
        });
        return response;
      },
      get: async (url: string, options: any) => {
        const response = await fetch(url, {
          method: 'GET',
          headers: options.headers,
        });
        return response;
      },
    };
    this.tap_headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TapTapAndroidSDK/3.16.5"
    };
  }
}

const share = new Share();

async function login(device_id: string) {
  const url = "https://www.taptap.cn/oauth2/v1/device/code";
  const payload = `client_id=rAK3FfdieFob2Nn8Am&response_type=device_code&scope=basic_info&version=1.2.0&platform=unity&info=%7b%22device_id%22%3a%22${device_id}%22%7d`;

  const response = await share.client.post(url, { 
    headers: share.tap_headers, 
    body: payload 
  });
  
  const jsonResponseData = await response.json();
  return jsonResponseData.data;
}