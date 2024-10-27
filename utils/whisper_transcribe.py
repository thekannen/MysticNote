import whisper
import sys
import json
import warnings
import os
from datetime import datetime

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

def transcribe_with_timestamps(file_path):
    model = whisper.load_model("base")  # Use "base", "small", "medium", or "large" based on resources
    result = model.transcribe(file_path, word_timestamps=True)  # Enable word-level timestamps

    # Collect segments with word-level timestamps for auditing
    segments = []
    for segment in result["segments"]:
        words = segment.get("words", [])
        word_text = " ".join([word["text"] for word in words])
        segments.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": word_text,
            "words": words  # Detailed word-level data
        })

    return result, segments

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python whisper_transcribe.py <path_to_audio_file>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    result, segments = transcribe_with_timestamps(file_path)

    # Define a JSON file path for auditing purposes
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = "transcription_audit_logs"
    os.makedirs(output_dir, exist_ok=True)
    audit_file_path = os.path.join(output_dir, f"transcription_audit_{timestamp}.json")

    # Save the full JSON result to a file
    with open(audit_file_path, "w") as audit_file:
        json.dump(result, audit_file, indent=2)

    # Send audit message to stderr
    print(f"Audit JSON saved to: {audit_file_path}", file=sys.stderr)
    # Print only the simplified segments JSON to stdout for the bot to process
    print(json.dumps(segments))
