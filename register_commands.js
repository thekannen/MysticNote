import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Command list and descriptions
const GAZE_COMMAND = {
  name: 'gaze',
  description: 'The bot enters the channel, peering into the voices of the unseen.',
  type: 1,
};

const LEAVE_COMMAND = {
  name: 'leave',
  description: 'The bot vanishes, ending the magical vision.',
  type: 1,
};

const BEGIN_SCRYING_COMMAND = {
  name: 'begin_scrying',
  description: 'Start recording the words spoken, capturing them as if seen through a crystal ball.',
  type: 1,
  options: [
    {
      name: 'session',
      description: 'The name of the session (up to 50 characters, must be unique)',
      type: 3,
      required: true,
    },
  ],
};

const END_SCRYING_COMMAND = {
  name: 'end_scrying',
  description: 'Cease recording, finalizing the vision.',
  type: 1,
};

const CONSULT_THE_TEXTS = {
  name: 'consult_the_texts',
  description: 'Lists all the scrying sessions saved to the wizards tome.',
  type: 1,
};

const REVEAL_SUMMARY_COMMAND = {
  name: 'reveal_summary',
  description: 'Receive a concise vision of the last scrying session.',
  type: 1, 
  options: [
    {
      name: 'session',
      description: 'The name of the session you wish to summarize.',
      type: 3,
      required: true,
    },
  ],
};


const COMPLETE_VISION_COMMAND = {
  name: 'complete_vision',
  description: 'Retrieve the full record of the scryed voices, as written by the orb.',
  type: 1,
  options: [
    {
      name: 'session',
      description: 'The name of the session you wish to reveal.',
      type: 3,
      required: true,
    },
  ],
};

const DELETE_SESSION = {
  name: 'delete_session',
  description: 'Deletes all recordings and transcripts for a session. Use with caution!.',
  type: 1,
  options: [
    {
      name: 'session',
      description: 'The name of the session you wish to delete.',
      type: 3,
      required: true,
    },
  ],
};

const PURGE = {
  name: 'purge',
  description: 'Deletes all recordings and transcripts for EVERY session. Use with extreme caution!',
  type: 1,
  options: [
    {
      name: 'confirmation',
      description: 'Type "y" to delete everything! This cannot be undone!',
      type: 3,
      required: true,
    },
  ],
};

// Run the install command
InstallGlobalCommands(process.env.APP_ID, [
  GAZE_COMMAND,
  LEAVE_COMMAND,
  BEGIN_SCRYING_COMMAND,
  END_SCRYING_COMMAND,
  CONSULT_THE_TEXTS,
  REVEAL_SUMMARY_COMMAND,
  COMPLETE_VISION_COMMAND,
  DELETE_SESSION,
  PURGE,
]);
