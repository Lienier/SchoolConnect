FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.app:app

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

CMD ["sh", "-c", "flask db upgrade && python -m seed && gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads ${WEB_THREADS:-100} --timeout ${WEB_TIMEOUT:-120} wsgi:app"]
