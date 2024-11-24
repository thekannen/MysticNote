import whisper
import sys
import json
import os
import warnings
import traceback
import numpy as np

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
    Transcribes an audio file with progress updates, providing word-level timestamps.

    Parameters:
        file_path (str): The path to the audio file to transcribe.
        model_name (str): The name of the Whisper model to use.
    
    Returns:
        segments (list): A list of transcription segments with start and end times.
    """
    try:
        # Load the Whisper model
        model = whisper.load_model(model_name)

        # Load the audio file
        audio = whisper.load_audio(file_path)

        # Determine total duration in seconds
        total_duration = audio.shape[0] / whisper.audio.SAMPLE_RATE

        # Define chunk size in seconds (adjust as needed)
        chunk_size = 30  # or any other value suitable for your use case

        # Calculate the number of chunks
        num_chunks = int(np.ceil(total_duration / chunk_size))

        segments = []
        language = 'en'  # Assuming English; adjust if needed

        for i in range(num_chunks):
            # Calculate start and end times for the chunk
            start_time = i * chunk_size
            end_time = min((i + 1) * chunk_size, total_duration)

            # Convert times to sample indices
            start_sample = int(start_time * whisper.audio.SAMPLE_RATE)
            end_sample = int(end_time * whisper.audio.SAMPLE_RATE)

            # Extract the audio chunk
            audio_chunk = audio[start_sample:end_sample]

            # Pad or trim the audio chunk to the desired length
            audio_chunk = whisper.pad_or_trim(audio_chunk)

            # Transcribe the chunk
            result = model.transcribe(
                audio_chunk,
                language=language,
                condition_on_previous_text=False,
                word_timestamps=True,
                verbose=False
            )

            # Adjust timestamps and collect segments
            for segment in result["segments"]:
                for word_info in segment["words"]:
                    if "start" in word_info and "end" in word_info and "word" in word_info:
                        segments.append({
                            "start": word_info["start"] + start_time,
                            "end": word_info["end"] + start_time,
                            "text": word_info["word"]
                        })

            # Calculate and output progress
            progress = ((i + 1) / num_chunks) * 100
            print(json.dumps({"progress": progress}), flush=True)

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

    # Get the model name from the config, defaulting to "medium"
    model_name = config.get("whisperModel", "medium")

    # Run the transcription function
    segments = transcribe_with_timestamps(file_path, model_name)

    # Output the resulting segments as JSON for further use or processing
    print(json.dumps(segments, ensure_ascii=False))