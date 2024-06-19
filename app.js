require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const phoneNumbers = await extractPhoneNumbers(imagePath);
    
    for (const number of phoneNumbers) {
      await makeVoiceCall(number);
    }

    res.json({ message: 'Processing complete', phoneNumbers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  } finally {
    // Clean up the uploaded file
    fs.unlinkSync(imagePath);
  }
});

async function extractPhoneNumbers(imagePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(imagePath));
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('iscreatesearchablepdf', 'false');
  formData.append('issearchablepdfhidetextlayer', 'false');

  try {
    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        ...formData.getHeaders(),
        'apikey': process.env.OCR_SPACE_API_KEY,
      },
    });

    const text = response.data.ParsedResults[0].ParsedText;
    const phoneRegex = /\b\d{10}\b/g; // Matches 10-digit phone numbers
    return text.match(phoneRegex) || [];
  } catch (error) {
    console.error('Error extracting phone numbers:', error);
    return [];
  }
}

async function makeVoiceCall(phoneNumber) {
  const params = new URLSearchParams();
  params.append('user', process.env.BULK_SMS_USER);
  params.append('pass', process.env.BULK_SMS_PASS);
  params.append('phone', phoneNumber);
  params.append('text', 'Hello, this is a test call from PhoneScanner AI.');

  try {
    const response = await axios.post('https://www.bulksmsplans.com/api/voice-calls.php', params);
    console.log(`Voice call response for ${phoneNumber}:`, response.data);
  } catch (error) {
    console.error(`Error making voice call to ${phoneNumber}:`, error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));