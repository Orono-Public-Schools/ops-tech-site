# PowerShell script to help setup Clasp for OPSTech Site
# Run this script after installing Clasp globally

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OPSTech Site - Clasp Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if clasp is installed
Write-Host "Checking if Clasp is installed..." -ForegroundColor Yellow
$claspInstalled = Get-Command clasp -ErrorAction SilentlyContinue

if (-not $claspInstalled) {
    Write-Host "ERROR: Clasp is not installed!" -ForegroundColor Red
    Write-Host "Please run: npm install -g @google/clasp" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "✓ Clasp is installed" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Clasp login status..." -ForegroundColor Yellow
clasp login --status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "You need to login to Google first." -ForegroundColor Yellow
    Write-Host "This will open a browser window." -ForegroundColor Yellow
    Write-Host ""
    $login = Read-Host "Login now? (y/n)"
    if ($login -eq "y") {
        clasp login
    } else {
        Write-Host "Please run 'clasp login' manually" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }
} else {
    Write-Host "✓ Already logged in to Google" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Get your Script ID from Apps Script:" -ForegroundColor Yellow
Write-Host "   - Open your project at script.google.com"
Write-Host "   - Click Project Settings (gear icon)"
Write-Host "   - Copy the Script ID"
Write-Host ""
Write-Host "2. Create .clasp.json file:" -ForegroundColor Yellow
Write-Host "   - Copy .clasp.json.template to .clasp.json"
Write-Host "   - Replace YOUR_SCRIPT_ID_HERE with your actual ID"
Write-Host ""
Write-Host "3. Test connection:" -ForegroundColor Yellow
Write-Host "   - Run: clasp open"
Write-Host ""
Write-Host "4. Push your local files:" -ForegroundColor Yellow
Write-Host "   - Run: clasp push"
Write-Host ""
Write-Host "See SETUP_STEPS.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
