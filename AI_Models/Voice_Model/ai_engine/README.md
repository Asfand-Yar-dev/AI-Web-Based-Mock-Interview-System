# AI Engine Modules for Smart Mock Interview System

This directory contains AI modules for analyzing interview performance.

## Modules

### 1. Vocal Tone Analysis (`vocal_analysis.py`)
Analyzes vocal tone and detects emotions from audio files using Wav2Vec2.

**Model Used:** `superb/wav2vec2-base-superb-er`

**Features:**
- Emotion detection from audio (WAV/MP3)
- Maps abbreviated labels to human-readable emotions
- Returns confidence scores (0-100%)
- Professional error handling with logging
- Both simple and detailed analysis modes

**Supported Emotions:**
- Neutral
- Happy/Confident
- Angry
- Sad
- Fearful/Nervous
- Disgust
- Surprised

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Install Dependencies

```bash
# For Vocal Tone Analysis
pip install transformers torch librosa soundfile numpy
```

## Quick Start

### Vocal Tone Analysis

```python
from ai_engine.vocal_analysis import VocalToneAnalyzer

# Initialize the analyzer (loads model once)
analyzer = VocalToneAnalyzer()

# Analyze an audio file
result = analyzer.analyze_tone("path/to/audio.wav")

print(result)
# Output: {"emotion": "Neutral", "score": 92.5}
```

### Detailed Analysis

```python
# Get top 3 emotions with confidence scores
detailed = analyzer.analyze_tone_detailed("path/to/audio.wav", top_n=3)

print(detailed)
# Output:
# {
#     "emotion": "Neutral",
#     "score": 92.5,
#     "all_predictions": [
#         {"emotion": "Neutral", "score": 92.5},
#         {"emotion": "Happy/Confident", "score": 5.2},
#         {"emotion": "Sad", "score": 2.3}
#     ]
# }
```

## Testing

Run the test script to verify the module:

```bash
cd ai_engine
python vocal_analysis.py
```

**Note:** On first run, the model will be downloaded (~380MB). Ensure you have a stable internet connection.

## Integration with Flask/FastAPI

### Flask Example

```python
from flask import Flask, request, jsonify
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = Flask(__name__)

# Initialize once at startup
analyzer = VocalToneAnalyzer()

@app.route('/api/analyze-tone', methods=['POST'])
def analyze_tone():
    try:
        data = request.get_json()
        audio_path = data.get('audio_path')
        
        result = analyzer.analyze_tone(audio_path)
        return jsonify(result), 200
        
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
```

### FastAPI Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = FastAPI()

# Initialize once at startup
analyzer = VocalToneAnalyzer()

class AudioRequest(BaseModel):
    audio_path: str

@app.post("/api/analyze-tone")
async def analyze_tone(request: AudioRequest):
    try:
        result = analyzer.analyze_tone(request.audio_path)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Error Handling

The module includes comprehensive error handling:

- **FileNotFoundError**: Raised when audio file doesn't exist
- **RuntimeError**: Raised when model loading or processing fails
- All errors are logged using Python's logging module

## Performance Notes

- **Model Loading**: Takes 5-15 seconds on first initialization
- **Analysis Speed**: ~1-3 seconds per audio file (depending on duration)
- **Memory Usage**: ~500MB RAM when model is loaded
- **Model Download Size**: ~380MB (one-time download)

## Troubleshooting

### Common Issues

1. **Model Download Fails**
   - Ensure stable internet connection
   - Check firewall/proxy settings
   - Try downloading manually from Hugging Face

2. **Audio File Not Supported**
   - Ensure file is in WAV or MP3 format
   - Check file permissions
   - Verify file is not corrupted

3. **Low Confidence Scores**
   - Audio quality may be poor
   - Background noise present
   - Audio too short (minimum 1-2 seconds recommended)

## License

This module is part of the Smart Mock Interview System project.

---

**Last Updated:** 2026-02-06
