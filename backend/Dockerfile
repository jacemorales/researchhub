# Use official PHP CLI image
FROM php:8.2-cli

# Set working directory
WORKDIR /app

# Copy all backend files into container
COPY . .

# Expose the port Railway provides
EXPOSE 8000

# Start PHP built-in server
CMD ["php", "-S", "0.0.0.0:8000"]
