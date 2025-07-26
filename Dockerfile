# Multi-stage Docker build for dompile with NGINX
FROM node:18-alpine AS builder

# Install dependencies for building
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage with NGINX
FROM nginx:alpine

# Install Node.js for running dompile
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app /opt/dompile

# Create symlink for global dompile command
RUN ln -sf /opt/dompile/bin/cli.js /usr/local/bin/dompile

# Copy custom NGINX configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Create necessary directories
RUN mkdir -p /site /var/www/html

# Copy startup script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Set working directory for site files
WORKDIR /site

# Start dompile with auto-rebuild and NGINX
ENTRYPOINT ["/entrypoint.sh"]