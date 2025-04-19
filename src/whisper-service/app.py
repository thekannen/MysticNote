from fastapi import FastAPI, UploadFile, File, HTTPException
from typing import List
import os
from faster_whisper import WhisperModel

# Load WhisperModel on GPU once at startup
MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
model = WhisperModel(
    MODEL_NAME,
    device="cuda",
    compute_type="float16"
)

app = FastAPI(title="Whisper Transcription Service")

@app.post("/transcribe")
async def transcribe(files: List[UploadFile] = File(...)):
    """
    Accepts multiple audio files (each named <speaker>.wav)
    and returns a flat list of {speaker, start, end, text} segments.
    """
    segments = []
    for upload in files:
        # Derive speaker name from filename (e.g. "Alice.wav" → "Alice")
        speaker = os.path.splitext(upload.filename)[0]

        # Save to a temporary file
        tmp_path = f"temp_{speaker}.wav"
        with open(tmp_path, "wb") as f:
            f.write(await upload.read())

        # Run transcription using faster-whisper
        segments_gen, _info = model.transcribe(
            tmp_path,
            beam_size=5
        )
        for seg in segments_gen:
            segments.append({
                "speaker": speaker,
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip()
            })

        # Clean up
        os.remove(tmp_path)

    return { "segments": segments }
