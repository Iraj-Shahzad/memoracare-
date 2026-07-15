# MemoryCare chatbot ML service (Flask + TensorFlow/Keras)
FROM python:3.11-slim

WORKDIR /app

# libgomp1 is required by TensorFlow at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train the model at build time so it's ready to serve.
RUN python train.py

EXPOSE 5001
CMD ["python", "app.py"]
