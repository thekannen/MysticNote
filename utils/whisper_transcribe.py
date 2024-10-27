import whisper
import sys
import json
import warnings

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


def transcribe_with_timestamps(file_path):
    model = whisper.load_model("medium")  # Use "base", "small", "medium", or "large" based on resources
    result = model.transcribe(file_path)

    # Collect segments with timestamps
    segments = []
    for segment in result["segments"]:
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
    print(json.dumps(segments))  # Output the transcription as JSON