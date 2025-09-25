# Use official PHP 8.2 image
FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Composer globally
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /app

# Copy backend code into container
COPY backend/ ./

# Install PHP dependencies if composer.json exists
RUN if [ -f "composer.json" ]; then composer install --no-dev --optimize-autoloader; fi

# Expose port (Railway will inject $PORT)
EXPOSE 8000

# Start PHP server
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} -t public"]
