import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const JOIN_COMMAND = { name: 'join', description: 'Joins your current voice channel', type: 1 };
const LEAVE_COMMAND = { name: 'leave', description: 'Leaves the current voice channel', type: 1 };
const TRANSCRIBE_COMMAND = { name: 'transcribe', description: 'Starts recording audio', type: 1 };
const STOP_COMMAND = { name: 'stop', description: 'Stops recording and transcribes audio', type: 1 };

InstallGlobalCommands(process.env.APP_ID, [JOIN_COMMAND, LEAVE_COMMAND, TRANSCRIBE_COMMAND, STOP_COMMAND]);
