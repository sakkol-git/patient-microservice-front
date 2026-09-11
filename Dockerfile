# Stage 1: Build the React application
FROM public.ecr.aws/docker/library/node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for better cache utilization
COPY package*.json ./

# Install dependencies (ci is faster and more reliable than install for builds)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Pass build arguments (optional) if dynamic backend URLs are needed at build time
ARG VITE_PATIENT_API
ARG VITE_AUDIT_API
ENV VITE_PATIENT_API=$VITE_PATIENT_API
ENV VITE_AUDIT_API=$VITE_AUDIT_API

# Build the Vite project
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM public.ecr.aws/docker/library/nginx:alpine

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the previous stage to Nginx's default html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to Docker
EXPOSE 80

# Start Nginx when the container starts
CMD ["nginx", "-g", "daemon off;"]
