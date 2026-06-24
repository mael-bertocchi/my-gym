# --- Builder Stage ---
FROM node:24-alpine AS builder

# Set the working directory
WORKDIR /app

# Install the toolchain needed to compile native addons
RUN apk add --no-cache python3 make g++

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy the Prisma schema
COPY prisma ./prisma

# Generate the Prisma client
RUN npx prisma generate

# Copy the rest of the code
COPY . .

# Build the application
RUN npm run build

# Prune the development dependencies to reduce the size of the final image
RUN npm prune --omit=dev

# --- Production Stage ---
FROM node:24-alpine

# Install the necessary runtime dependencies
RUN apk add --no-cache dumb-init openssl

# Set the working directory
WORKDIR /app

# Create a non-root user to run the application
RUN chown node:node /app

# Switch to the non-root user
USER node

# Copy the pruned dependencies from the builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy the rest of the application files
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Run the application
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start"]
