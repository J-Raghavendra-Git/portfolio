# Production-ready zero-dependency Node.js runtime container
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application source
COPY . .

# Default environment variables
ENV NODE_ENV=production
ENV PORT=4173

# Expose server port
EXPOSE 4173

# Run portfolio server
CMD ["node", "server.js"]
