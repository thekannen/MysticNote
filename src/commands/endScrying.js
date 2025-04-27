import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root assumed two levels up from this config file
const projectRoot = path.resolve(__dirname, '..', '..');

export default {
  recordingsDir: path.join(projectRoot, 'bin', 'recordings'),
  transcriptsDir: path.join(projectRoot, 'bin', 'transcripts'),
  sessionNameMaxLength: 50,
};