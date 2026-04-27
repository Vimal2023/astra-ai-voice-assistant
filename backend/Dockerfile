# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Install FFmpeg (Crucial for Whisper)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean

# Set the working directory
WORKDIR /app

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Run the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]