# Use the official Python image as a base
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Suppress debconf warnings during apt-get (non-interactive build)
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --root-user-action=ignore --disable-pip-version-check -r requirements.txt

# Copy the rest of the application
COPY . .

# Compile C++ indicators extension for this Python version
RUN cd /app/app/engine && \
    c++ -O2 -Wall -shared -std=c++14 -fPIC \
    $(python3 -m pybind11 --includes) \
    indicators.cpp \
    -o indicators$(python3-config --extension-suffix)

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Add non-root user and create data directory for SQLite
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/sh -M appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
