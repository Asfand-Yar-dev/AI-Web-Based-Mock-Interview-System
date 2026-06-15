"""
Setup Script - Pre-download the Whisper model for deployment.

Run this ONCE before distributing the application to users.
After running, the model will be saved in the 'models/' directory
and users won't need to download anything.

Usage:
    python setup_model.py
    python setup_model.py --model-size medium
"""

import argparse
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_models.stt_engine import STTEngine


def main():
    parser = argparse.ArgumentParser(
        description="Pre-download the Whisper STT model for deployment"
    )
    parser.add_argument(
        "--model-size",
        type=str,
        default="medium",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size to download (default: medium)"
    )
    args = parser.parse_args()
    
    print("=" * 60)
    print("  STT Model Setup - One-Time Download")
    print("=" * 60)
    print(f"\n  Model size : {args.model_size}")
    print(f"  Save to    : {STTEngine.get_models_dir()}")
    
    if STTEngine.is_model_downloaded(args.model_size):
        model_path = STTEngine.get_model_path(args.model_size)
        size_mb = model_path.stat().st_size / (1024 * 1024)
        print(f"\n  ✓ Model already downloaded! ({size_mb:.0f} MB)")
        print(f"    Location: {model_path}")
        print("\n  No download needed. Users are ready to go!")
    else:
        print(f"\n  Downloading model '{args.model_size}'...")
        print("  This may take a few minutes depending on your internet speed.\n")
        
        model_path = STTEngine.download_model(args.model_size)
        size_mb = model_path.stat().st_size / (1024 * 1024)
        
        print(f"\n  ✓ Download complete! ({size_mb:.0f} MB)")
        print(f"    Location: {model_path}")
    
    print("\n" + "=" * 60)
    print("  Users will now load the model instantly without downloading.")
    print("=" * 60)


if __name__ == "__main__":
    main()
