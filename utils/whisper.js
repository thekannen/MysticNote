import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

export async function transcribeAndSummarize(filePath, username) {
  if (!fs.existsSync(filePath)) {
    console.error(`Audio file not found for transcription: ${filePath}`);
    return null;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('model', 'whisper-1');

  try {
    // Transcribe audio
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();

    if (data.text) {
      const fullTranscription = `${username}: ${data.text}`;
      const transcriptionFile = `transcription_${username}.txt`;

      // Save full transcription to a text file
      fs.writeFileSync(transcriptionFile, fullTranscription);
      console.log(`Full transcription saved as ${transcriptionFile}`);

      // Generate summary
      const summary = await generateSummary(data.text);
      return { summary, transcriptionFile };
    } else {
      console.error('Transcription failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    return null;
  }
}

// Function to generate a summary of the transcription
async function generateSummary(transcriptionText) {
  const prompt = `Summarize the following conversation:\n\n${transcriptionText}\n\nSummary:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo', // Using gpt-4-turbo model
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
//    console.log('OpenAI API Response:', data); // Log the response for debugging

    // Check if 'choices' exists and contains at least one entry
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('No summary available. Response did not contain expected data.');
      return 'No summary available';
    }
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return 'Summary generation failed';
  }
}
