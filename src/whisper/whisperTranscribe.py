import whisper  # Import the OpenAI Whisper module for transcription
import sys  # Provides access to command-line arguments
import json  # For reading and writing JSON data
import os  # For file and directory operations
import warnings  # To suppress any unwanted warnings

# Suppress specific warnings from libraries to keep console output clean
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# Load the configuration file
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
with open(config_path, 'r') as f:
    config = json.load(f)

def transcribe_with_timestamps(file_path):
    """
    Transcribes an audio file, providing word-level timestamps if available.

    Parameters:
        file_path (str): The path to the audio file to transcribe.
    
    Returns:
        segments (list): A list of transcription segments with start and end times, 
                         including finer granularity if word-level timestamps are enabled.
    """
    
    # Load the Whisper model specified in the config, defaulting to "base" if not set
    model_name = config.get("whisperModel", "base")  # "base" model as fallback
    model = whisper.load_model(model_name)
    
    # Perform the transcription with Whisper
    result = model.transcribe(
        file_path, 
        condition_on_previous_text=False  # Avoids dependency on previous segments for finer control
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

if __name__ == "__main__":
    # Check if a file path argument was provided
    if len(sys.argv) != 2:
        print("Usage: python whisperTranscribe.py <path_to_audio_file>")
        sys.exit(1)

    # Obtain the audio file path from command-line argument
    file_path = sys.argv[1]

    # Run the transcription function
    segments = transcribe_with_timestamps(file_path)

    # Output the resulting segments as JSON for further use or processing
    print(json.dumps(segments))