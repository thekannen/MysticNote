import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  recordingsDir: path.join(__dirname, '../../bin/recordings'),
  transcriptsDir: path.join(__dirname, '../../bin/transcripts'),
  sessionNameMaxLength: 50,
};