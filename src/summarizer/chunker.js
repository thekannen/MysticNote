export function chunk(transcriptionText, maxTokens) {
  // Split transcript into sentences (keep delimiters)
  const sentenceRegex = /[^\.!\?]+[\.!\?]+/g;
  const sentences = transcriptionText.match(sentenceRegex) || [transcriptionText];

  const chunks = [];
  let currentChunk = '';
  let currentTokenCount = 0;

  for (const sentence of sentences) {
    const tokenCount = sentence.trim().split(/\s+/).length;
    // If adding this sentence exceeds maxTokens, flush current chunk
    if (currentTokenCount + tokenCount > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim() + ' ';
      currentTokenCount = tokenCount;
    } else {
      currentChunk += sentence.trim() + ' ';
      currentTokenCount += tokenCount;
    }
  }
  // Push the final chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
