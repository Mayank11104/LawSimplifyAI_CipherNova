# Stage 1: Build the application with dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt requirements.txt
# Use wheels for faster installation in the final stage
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt

# ---

# Stage 2: Create the final, lean production image
FROM python:3.11-slim

WORKDIR /app

# Copy pre-built wheels from the builder stage
COPY --from=builder /app/wheels /wheels

# Install the dependencies from the wheels
RUN pip install --no-cache-dir /wheels/*

# Copy your application code and other necessary script files
COPY . .

# Create a non-root user for better security practices
RUN useradd --create-home appuser
USER appuser

# Cloud Run automatically provides the PORT environment variable.
# We'll set a default here and our command will use it.
ENV PORT 8080
EXPOSE 8080

# The command to run your application using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

