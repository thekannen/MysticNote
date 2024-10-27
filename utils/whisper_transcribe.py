import whisper
import sys
import json
import warnings
import os
from datetime import datetime

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

def transcribe_with_timestamps(file_path):
    model = whisper.load_model("small")  # Use "base", "small", "medium", or "large" based on resources
    result = model.transcribe(file_path)

    # Collect segments with timestamps (for direct return to calling code)
    segments = []
    for segment in result["segments"]:
        segments.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"]
        })

    return result, segments

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python whisper_transcribe.py <path_to_audio_file>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    result, segments = transcribe_with_timestamps(file_path)

    # Print only the simplified segments JSON to stdout for the bot to process
    print(json.dumps(segments))
