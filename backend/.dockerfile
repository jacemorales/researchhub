# Use PHP CLI image
FROM php:8.2-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    unzip git curl \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /app

# Copy backend code
COPY . .

# Install PHP dependencies
RUN if [ -f "composer.json" ]; then composer install --no-dev --optimize-autoloader; fi

# Expose port Render provides
EXPOSE 8000

# Start server
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8000} -t public"]
