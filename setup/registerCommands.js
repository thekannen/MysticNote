import 'dotenv/config';
import { InstallGlobalCommands } from '../src/utils/common.js';
import config from '../src/config/config.js';

// Define command list with their descriptions and options

// Command for the bot to join the voice channel
const GAZE_COMMAND = {
  name: 'gaze',
  description: 'The bot enters the channel, peering into the voices of the unseen.',
  type: 1, // Slash command
};

// Command for the bot to leave the voice channel
const LEAVE_COMMAND = {
  name: 'leave',
  description: 'The bot vanishes, ending the magical vision.',
  type: 1,
};

// Command to start recording voices in the channel
const BEGIN_SCRYING_COMMAND = {
  name: 'begin_scrying',
  description: 'Start recording the words spoken, capturing them as if seen through a crystal ball.',
  type: 1,
  options: [
    {
      name: 'session',
      description: `The name of the session (up to ${config.sessionNameMaxLength} characters, must be unique)`,
      type: 3, // STRING type
      required: true,
    },
  ],
};

// Command to end the recording session
const END_SCRYING_COMMAND = {
  name: 'end_scrying',
  description: 'Cease recording, finalizing the vision.',
  type: 1,
};

// Command to list all recorded sessions
const CONSULT_THE_TEXTS = {
  name: 'consult_the_texts',
  description: 'Lists all the scrying sessions saved to the wizards tome.',
  type: 1,
};

// Command to receive a summary of a specific session
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

// Command to retrieve the full transcript of a specific session
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

// Command to delete a specific session's recordings and transcripts
const DELETE_SESSION = {
  name: 'delete_session',
  description: 'Deletes all recordings and transcripts for a session. Use with caution!',
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

// Command to delete all sessions; requires explicit confirmation
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

// Install the commands globally using the Discord application ID
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