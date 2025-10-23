FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Railway will assign PORT via env var)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]

