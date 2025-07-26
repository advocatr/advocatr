
# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files from root
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all source code except what's in .dockerignore
COPY . .

# Build the application
RUN npm run build

# Expose the port Cloud Run expects
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["npm", "start"]

