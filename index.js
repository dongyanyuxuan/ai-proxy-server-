const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 增加请求体大小限制

// 健康检查接口
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Gemini API代理 - 使用免费层级
app.post('/api/gemini', async (req, res) => {
  try {
    console.log('Received request:', {
      promptLength: req.body.prompt.length,
      model: req.body.model,
      hasImage: !!req.body.image
    });

    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
    console.log('Calling Gemini API:', {
      url: apiUrl,
      apiKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing'
    });

    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        key: process.env.GEMINI_API_KEY
      },
      data: {
        contents: [{
          parts: [
            { text: req.body.prompt },
            req.body.image ? {
              inline_data: {
                mime_type: 'image/jpeg',
                data: req.body.image.split(',')[1]
              }
            } : null
          ].filter(Boolean)
        }]
      }
    });
    
    console.log('Gemini API Response:', {
      status: response.status,
      hasData: !!response.data,
      hasCandidates: !!response.data?.candidates
    });

    res.json(response.data);
  } catch (error) {
    console.error('Detailed API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });

    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      details: error.response?.data
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 