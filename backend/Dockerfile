FROM php:8.2-cli

# Install Composer
RUN apt-get update && apt-get install -y unzip curl git \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY . .

EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000"]
