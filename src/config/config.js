import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define the path to the configuration file
const configPath = path.join(__dirname, '../../conf.json');

// Define the path to the modelTokenLimits.json file
const modelTokenLimitsPath = path.join(__dirname, '../utils/modelTokenLimits.json');

let config = {};
try {
  // Attempt to read and parse the configuration file
  const fileContent = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(fileContent);

  // Provide default values for optional properties
  const defaultConfig = {
    botVersion: '1.0.0',
    inactivityTimeoutMinutes: 30,
    sessionNameMaxLength: 50,
    whisperModel: 'small',
    openAIModel: 'gpt-3.5-turbo',
    saveRecordings: true,
    audioQuality: 'medium',
    verbose: false,
    logLevel: 'info',
    logsDirectory: '../../bin/logs',
  };

  // Merge default config with user config
  config = { ...defaultConfig, ...config };

  // Load modelTokenLimits.json to get the list of valid models
  const modelTokenLimitsContent = fs.readFileSync(modelTokenLimitsPath, 'utf8');
  const modelTokenLimits = JSON.parse(modelTokenLimitsContent);
  const validOpenAIModels = Object.keys(modelTokenLimits.models);

  // Validate required configuration properties

  // botVersion should be a non-empty string
  if (typeof config.botVersion !== 'string' || config.botVersion.trim() === '') {
    throw new Error('Configuration property "botVersion" must be a non-empty string.');
  }

  // inactivityTimeoutMinutes should be a positive number
  if (
    typeof config.inactivityTimeoutMinutes !== 'number' ||
    config.inactivityTimeoutMinutes <= 0
  ) {
    throw new Error(
      'Configuration property "inactivityTimeoutMinutes" must be a positive number.'
    );
  }

  // sessionNameMaxLength should be a positive integer
  if (
    typeof config.sessionNameMaxLength !== 'number' ||
    !Number.isInteger(config.sessionNameMaxLength) ||
    config.sessionNameMaxLength <= 0
  ) {
    throw new Error(
      'Configuration property "sessionNameMaxLength" must be a positive integer.'
    );
  }

  // Validate whisperModel against allowed values
  const validWhisperModels = ['tiny', 'base', 'small', 'medium', 'large'];
  if (
    typeof config.whisperModel !== 'string' ||
    !validWhisperModels.includes(config.whisperModel)
  ) {
    throw new Error(
      `Configuration property "whisperModel" must be one of: ${validWhisperModels.join(
        ', '
      )}.`
    );
  }

  // Validate openAIModel against models from modelTokenLimits.json
  if (
    typeof config.openAIModel !== 'string' ||
    !validOpenAIModels.includes(config.openAIModel)
  ) {
    throw new Error(
      `Configuration property "openAIModel" must be one of: ${validOpenAIModels.join(
        ', '
      )}.`
    );
  }

  // saveRecordings should be a boolean
  if (typeof config.saveRecordings !== 'boolean') {
    throw new Error('Configuration property "saveRecordings" must be a boolean.');
  }

  // Validate audioQuality against allowed values
  const validAudioQualities = ['low', 'medium', 'high'];
  if (
    typeof config.audioQuality !== 'string' ||
    !validAudioQualities.includes(config.audioQuality)
  ) {
    throw new Error(
      `Configuration property "audioQuality" must be one of: ${validAudioQualities.join(
        ', '
      )}.`
    );
  }

  // verbose should be a boolean
  if (typeof config.verbose !== 'boolean') {
    throw new Error('Configuration property "verbose" must be a boolean.');
  }

  // Validate logLevel against allowed values
  const validLogLevels = ['error', 'warn', 'info', 'verbose', 'debug'];
  if (
    typeof config.logLevel !== 'string' ||
    !validLogLevels.includes(config.logLevel)
  ) {
    throw new Error(
      `Configuration property "logLevel" must be one of: ${validLogLevels.join(', ')}.`
    );
  }

  // Validate logsDirectory
  if (
    config.logsDirectory &&
    (typeof config.logsDirectory !== 'string' || config.logsDirectory.trim() === '')
  ) {
    throw new Error('Configuration property "logsDirectory" must be a non-empty string.');
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    logger(`Configuration file not found at ${configPath}`, 'error');
  } else if (error instanceof SyntaxError) {
    logger(`Syntax error in configuration file: ${error.message}`, 'error');
  } else {
    logger(`Error loading configuration: ${error.message}`, 'error');
  }
  logger(`Stack trace: ${error.stack}`, 'error');
  process.exit(1); // Exit the process to prevent further issues
}

// Export the parsed and validated configuration object for use across the app
export default config;
