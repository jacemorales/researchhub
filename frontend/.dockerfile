# Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy frontend code
COPY . .

# Install dependencies and build
RUN npm install
RUN npm run build

# Expose port
EXPOSE 3000

# Serve using a lightweight server (or your dev server)
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
