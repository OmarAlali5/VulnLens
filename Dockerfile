# Use a slim version of Python for a smaller security footprint
FROM python:3.11-slim

# Set environment variables to prevent Python from writing .pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /code

# Install system dependencies required for WeasyPrint and network tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libcairo2 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install subfinder
RUN wget -qO /tmp/subfinder.zip https://github.com/projectdiscovery/subfinder/releases/download/v2.6.6/subfinder_2.6.6_linux_amd64.zip && \
    unzip /tmp/subfinder.zip -d /tmp && \
    mv /tmp/subfinder /usr/local/bin/subfinder && \
    chmod +x /usr/local/bin/subfinder && \
    rm /tmp/subfinder.zip


# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application
COPY . .

# Security Best Practice: Don't run as root
RUN useradd -m scanneruser
USER scanneruser
