#  Quick Start Guide

Get your Smart Mock Interview System running in **3 simple steps**!

## ⚡ Quick Installation (5 minutes)

### Option 1: Automated Setup (Recommended for Windows)

Open PowerShell in the project directory and run:

```powershell
.\setup.ps1
```

This will automatically:
- ✓ Check Python installation
- ✓ Install all dependencies
- ✓ Verify the installation
- ✓ Show you how to run the system

### Option 2: Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import deepface; import cv2; print('Ready!')"
```

## 🎬 Run the System

```bash
python tests/test_gui.py
```

**That's it!** 🎉 A window will open showing your webcam feed with real-time emotion detection.

## 🎮 Controls

While the application is running:

| Key | Action |
|-----|--------|
| **Q** | Quit the application |
| **R** | Reset emotion history (start fresh) |
| **S** | Show statistics in console |

## 💡 What You'll See

1. **Green bounding box** around your face
2. **Emotion label** (e.g., "Happy (87.5%)") above the box
3. **FPS counter** at the top showing performance
4. **Real-time updates** as your expression changes

## 🧪 Try Different Expressions!

The system can detect:
- 😊 **Happy** - Smile!
- 😢 **Sad** - Frown
- 😠 **Angry** - Scowl
- 😮 **Surprise** - Open mouth, raise eyebrows
- 😨 **Fear** - Wide eyes
- 😖 **Disgust** - Wrinkle nose
- 😐 **Neutral** - Relax your face

## ⚠️ Troubleshooting

### "Could not access the webcam"

**Fix:**
1. Close Zoom, Teams, or any app using the camera
2. Check Windows Settings → Privacy → Camera
3. Make sure camera permissions are enabled

### Slow or Laggy

**Fix:** The system automatically skips frames for performance. If still slow:
1. Close other programs
2. Increase the `skip_frames` value in the code (see README.md)

### First Run is Slow

**Expected!** DeepFace downloads AI models (~100-200 MB) on first run. This only happens once.

## 📚 Next Steps

### For Developers

Check out `examples.py` for code samples:

```bash
python examples.py
```

This shows you how to:
- Analyze single frames
- Track emotions over time
- Detect stress/nervousness
- Save results to JSON

### For Advanced Users

Read the full documentation:
- **README.md** - Complete feature guide
- **ARCHITECTURE.md** - Technical details & diagrams

## 🎯 Quick Test Checklist

✅ I can see my webcam feed  
✅ Green box appears around my face  
✅ Emotion label updates when I smile/frown  
✅ FPS shows 25-30 (smooth video)  
✅ Pressing 'Q' closes the app cleanly  

If all checked, you're ready to go! 

## 🆘 Still Having Issues?

1. **Check Python version:** `python --version` (need 3.8+)
2. **Update pip:** `pip install --upgrade pip`
3. **Reinstall dependencies:** `pip install -r requirements.txt --force-reinstall`
4. **Test camera manually:**
   ```python
   import cv2
   cap = cv2.VideoCapture(0)
   print(cap.isOpened())  # Should be True
   ```

## 📞 Support

For detailed documentation, see:
- `README.md` - Full user guide
- `ARCHITECTURE.md` - Technical architecture
- `examples.py` - Code examples

---

**Total Setup Time:** ~5 minutes  
**First Run:** +2-3 minutes (model download)  
**Subsequent Runs:** <10 seconds  

**You're all set! Happy coding! 🎉**
