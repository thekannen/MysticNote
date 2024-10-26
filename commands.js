import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const JOIN_COMMAND = { name: 'gaze', description: 'The bot enters the channel, peering into the voices of the unseen.', type: 1 };
const LEAVE_COMMAND = { name: 'leave', description: 'The bot vanishes, ending the magical vision.', type: 1 };
const TRANSCRIBE_COMMAND = { name: 'begin_scrying', description: 'Start recording the words spoken, capturing them as if seen through a crystal ball.', type: 1 };
const STOP_COMMAND = { name: 'end_scrying', description: 'Cease recording, finalizing the vision.', type: 1 };
const REVEAL_SUMMARY_COMMAND = { name: 'reveal_summary', description: 'Receive a concise vision of the last scrying session.', type: 1, };
const COMPLETE_VISION_COMMAND = { name: 'complete_vision', description: 'Retrieve the full record of the scryed voices, as written by the orb.', type: 1, };

InstallGlobalCommands(process.env.APP_ID, [JOIN_COMMAND, LEAVE_COMMAND, TRANSCRIBE_COMMAND, STOP_COMMAND,REVEAL_SUMMARY_COMMAND, COMPLETE_VISION_COMMAND]);
