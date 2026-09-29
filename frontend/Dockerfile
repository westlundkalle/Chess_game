# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve with Nginx and Proxy to Backend
FROM nginx:alpine

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration with WebSocket reverse proxy to backend
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
 \
    # Frontend SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
 \
    # Backend Health Check and API routing \
    location /health { \
        proxy_pass http://backend:5000/health; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
 \
    location /api/ { \
        proxy_pass http://backend:5000/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
 \
    # Socket.io WebSocket upgrade & streaming \
    location /socket.io/ { \
        proxy_pass http://backend:5000/socket.io/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
        proxy_read_timeout 86400s; \
        proxy_send_timeout 86400s; \
    } \
 \
    # Static asset caching \
    location ~* \.(?:ico|css|js|gif|jpe?g|png|wasm|woff2?|eot|ttf|svg)$ { \
        expires 6M; \
        access_log off; \
        add_header Cache-Control "public"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
