import whisper
import sys
import json
import warnings
import os
from datetime import datetime

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

def transcribe_with_timestamps(file_path):
    # Load the Whisper model
    model = whisper.load_model("medium")  # Use "base", "small", "medium", or "large" based on resources
    
    # Transcribe with custom parameters for finer granularity
    result = model.transcribe(
        file_path, 
        word_timestamps=True,         # Enables word-level timestamps
        condition_on_previous_text=False, # Prevents reliance on previous segments, useful for more granular segmentation
        initial_prompt=None            # Avoids using a specific initial prompt
    )

    # Collect segments with timestamps
    segments = []
    for segment in result["segments"]:
        # If word-level timestamps are enabled, break down segments by words
        if "words" in segment:
            for word_info in segment["words"]:
                # Only add words that have both 'start', 'end', and 'text' attributes
                if "start" in word_info and "end" in word_info and "text" in word_info:
                    segments.append({
                        "start": word_info["start"],
                        "end": word_info["end"],
                        "text": word_info["text"]
                    })
        else:
            # Fallback to the whole segment if word-level timestamps are not provided
            segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"]
            })

    return segments

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python whisper_transcribe.py <path_to_audio_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    segments = transcribe_with_timestamps(file_path)

    # Output the segments JSON to stdout for further processing
    print(json.dumps(segments))