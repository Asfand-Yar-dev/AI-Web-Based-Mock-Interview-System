# Smart Mock Interview System - Setup Script
# This script will install all required dependencies

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Smart Mock Interview System Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "[1/4] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if pip is available
Write-Host "[2/4] Checking pip..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✓ Found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pip not found!" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "[3/4] Installing dependencies from requirements.txt..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes (first time only)..." -ForegroundColor Gray
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies." -ForegroundColor Red
    exit 1
}

# Verify installation
Write-Host "[4/4] Verifying installation..." -ForegroundColor Yellow
python -c "import deepface; import cv2; import tensorflow; print('✓ All packages verified!')"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host " Setup Complete! " -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "To verify the module, run:" -ForegroundColor Cyan
    Write-Host "  python -c `"from models.Facial_AI_Module import FacialExpressionModel; print('Module ready!')`"" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✗ Verification failed. Please check error messages above." -ForegroundColor Red
    exit 1
}
