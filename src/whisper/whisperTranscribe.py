import whisper
import sys
import json
import os
import warnings
import traceback

# Suppress specific warnings from libraries to keep console output clean
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

def load_config():
    """
    Loads the configuration file.

    Returns:
        dict: The configuration dictionary.
    """
    try:
        config_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
        config_file = os.path.join(config_dir, 'conf.json')
        with open(config_file, 'r') as f:
            config = json.load(f)
        return config
    except Exception as e:
        print(f"Error loading configuration file: {e}", file=sys.stderr)
        sys.exit(1)

def transcribe_with_timestamps(file_path, model_name):
    """
    Transcribes an audio file, providing word-level timestamps if available.

    Parameters:
        file_path (str): The path to the audio file to transcribe.
        model_name (str): The name of the Whisper model to use.
    
    Returns:
        segments (list): A list of transcription segments with start and end times.
    """
    try:
        # Load the Whisper model
        model = whisper.load_model(model_name)

        # Perform the transcription with Whisper
        result = model.transcribe(
            file_path, 
            condition_on_previous_text=False
        )

        # Collect transcription segments with timestamps
        segments = []
        for segment in result["segments"]:
            # If word-level timestamps are enabled, process individual words
            if "words" in segment:
                for word_info in segment["words"]:
                    # Check that word info includes start, end, and text keys
                    if "start" in word_info and "end" in word_info and "text" in word_info:
                        segments.append({
                            "start": word_info["start"],
                            "end": word_info["end"],
                            "text": word_info["text"]
                        })
            else:
                # Fallback: use the entire segment if word-level timestamps are unavailable
                segments.append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"]
                })

        return segments
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Check if a file path argument was provided
    if len(sys.argv) != 2:
        print("Usage: python whisperTranscribe.py <path_to_audio_file>", file=sys.stderr)
        sys.exit(1)

    # Obtain the audio file path from command-line argument
    file_path = sys.argv[1]

    # Ensure the audio file exists
    if not os.path.isfile(file_path):
        print(f"Audio file not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    # Load the configuration
    config = load_config()

    # Get the model name from the config, defaulting to "base"
    model_name = config.get("whisperModel", "base")

    # Run the transcription function
    segments = transcribe_with_timestamps(file_path, model_name)

    # Output the resulting segments as JSON for further use or processing
    print(json.dumps(segments, ensure_ascii=False))