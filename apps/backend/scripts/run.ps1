# PowerShell helper script for Archaeon Backend developer tasks.

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("runserver", "makemigrations", "migrate", "createsuperuser", "worker", "beat", "lint", "format", "test")]
    [string]$Action
)

$env:DJANGO_SETTINGS_MODULE = "config.settings.development"

switch ($Action) {
    "runserver" {
        Write-Host "Starting Django Development Server..." -ForegroundColor Green
        python manage.py runserver
    }
    "makemigrations" {
        Write-Host "Generating database migrations..." -ForegroundColor Green
        python manage.py makemigrations
    }
    "migrate" {
        Write-Host "Applying database migrations..." -ForegroundColor Green
        python manage.py migrate
    }
    "createsuperuser" {
        Write-Host "Creating django superuser..." -ForegroundColor Green
        python manage.py createsuperuser
    }
    "worker" {
        Write-Host "Starting Celery Worker..." -ForegroundColor Green
        celery -A config worker --loglevel=info
    }
    "beat" {
        Write-Host "Starting Celery Beat Scheduler..." -ForegroundColor Green
        celery -A config beat --loglevel=info
    }
    "lint" {
        Write-Host "Running code quality checkers (flake8, mypy, bandit)..." -ForegroundColor Cyan
        Write-Host "--- Flake8 ---"
        flake8 apps config tests
        Write-Host "--- MyPy ---"
        mypy apps config tests
        Write-Host "--- Bandit ---"
        bandit -r apps config
    }
    "format" {
        Write-Host "Running code autoformatters (black, isort)..." -ForegroundColor Cyan
        black apps config tests
        isort apps config tests
    }
    "test" {
        Write-Host "Running tests with pytest..." -ForegroundColor Green
        pytest
    }
}
