FROM nginx:latest

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration file
COPY apps/nginx/nginx.conf /etc/nginx/nginx.conf

# Expose the port Nginx is configured to listen on
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
