# 🐳 **Docker Usage**

## Quick Start

### Production deployment
```bash
docker run --rm -p 8080:80 \
  -v $(pwd)/my-site:/site \
  dompile
```

### Development with live reload
```bash
docker run --rm -p 3000:3000 \
  -v $(pwd)/my-site:/site \
  dompile \
  dompile serve --source /site --output /var/www/html --port 3000 --host 0.0.0.0
```

## Docker Compose

### Basic production setup
```bash
# Edit docker-compose.yml to point to your site directory
docker-compose up dompile
```

### Development mode
```bash
docker-compose --profile dev up dompile-dev
```

### Custom site
```bash
# Create your site directory and update docker-compose.yml
docker-compose --profile custom up my-site
```

## Environment Variables

- `NODE_ENV` - Set to `production` or `development`
- Custom environment variables are passed through to dompile

## Volume Mounts

- `/site` - Your source files (required)
- `/var/www/html` - Generated output (managed automatically)

## Ports

- `80` - Production NGINX server
- `3000` - Development server with live reload