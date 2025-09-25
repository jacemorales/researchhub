# Use official PHP CLI image
FROM php:8.2-cli

# Install system dependencies needed for Composer
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Composer globally
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory inside container
WORKDIR /app

# Copy backend folder into container
COPY . .

# Install PHP dependencies if composer.json exists
RUN if [ -f "composer.json" ]; then composer install --no-dev --optimize-autoloader; fi

# Expose Railway default port
EXPOSE 8000

# Start PHP built-in server
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} -t public"]
