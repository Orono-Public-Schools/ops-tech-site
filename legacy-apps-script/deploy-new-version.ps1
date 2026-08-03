# PowerShell script to create a new version and update the deployment
# This will increment your version number automatically

param(
    [string]$description = "Auto-deployment"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OPSTech Site - Version Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get deployment ID from list-deployments
$deployments = clasp list-deployments --json 2>&1 | ConvertFrom-Json
$versionedDeployment = $deployments | Where-Object { $_.description -like "*OPS Tech*" } | Select-Object -First 1

if (-not $versionedDeployment) {
    Write-Host "ERROR: Could not find OPS Tech deployment" -ForegroundColor Red
    exit 1
}

$deploymentId = $versionedDeployment.deploymentId
$currentVersion = $versionedDeployment.version

Write-Host "Current deployment: $($versionedDeployment.description)" -ForegroundColor Yellow
Write-Host "Deployment ID: $deploymentId" -ForegroundColor Yellow
Write-Host ""

# Calculate next version number
$nextVersion = [int]$currentVersion + 1
$newDescription = "OPS Tech v$nextVersion"

Write-Host "Creating new version: $newDescription" -ForegroundColor Green
Write-Host ""

# Create new version
clasp create-version "$newDescription"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create version" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Updating deployment to new version..." -ForegroundColor Green

# Update the deployment
clasp update-deployment $deploymentId --description "$newDescription"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Successfully deployed $newDescription" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment ID: $deploymentId" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "ERROR: Failed to update deployment" -ForegroundColor Red
    exit 1
}
