#!/usr/bin/env bash
# Bash helper script for Archaeon Backend developer tasks.

set -e

ACTION=$1

export DJANGO_SETTINGS_MODULE="config.settings.development"

case "$ACTION" in
    runserver)
        echo "Starting Django Development Server..."
        python manage.py runserver 0.0.0.0:8000
        ;;
    makemigrations)
        echo "Generating database migrations..."
        python manage.py makemigrations
        ;;
    migrate)
        echo "Applying database migrations..."
        python manage.py migrate
        ;;
    createsuperuser)
        echo "Creating django superuser..."
        python manage.py createsuperuser
        ;;
    worker)
        echo "Starting Celery Worker..."
        celery -A config worker --loglevel=info
        ;;
    beat)
        echo "Starting Celery Beat Scheduler..."
        celery -A config beat --loglevel=info
        ;;
    lint)
        echo "Running code quality checkers..."
        echo "--- Flake8 ---"
        flake8 apps config tests
        echo "--- MyPy ---"
        mypy apps config tests
        echo "--- Bandit ---"
        bandit -r apps config
        ;;
    format)
        echo "Running code autoformatters..."
        black apps config tests
        isort apps config tests
        ;;
    test)
        echo "Running tests with pytest..."
        pytest
        ;;
    *)
        echo "Usage: $0 {runserver|makemigrations|migrate|createsuperuser|worker|beat|lint|format|test}"
        exit 1
        ;;
esac
