FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (tsx needed for runtime)
RUN npm ci

# Copy source code
COPY . .

# Expose port (Railway will assign PORT via env var)
EXPOSE 8080

# Start with tsx (no build needed!)
CMD ["npm", "start"]

