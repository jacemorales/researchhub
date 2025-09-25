FROM php:8.2-cli

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install pdo_mysql

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /app

# Copy backend code
COPY . .

# Install Composer dependencies
RUN if [ -f "composer.json" ]; then composer install --no-dev --optimize-autoloader; fi

# Expose port
EXPOSE 8000


# Start PHP server
CMD ["php", "-S", "0.0.0.0:8000"]