FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build (optional, saves space)
RUN npm prune --production

# Expose port (Railway will assign PORT via env var)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

