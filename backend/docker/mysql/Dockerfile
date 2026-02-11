FROM mysql:8.0

# Set root password and initial database
ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=sandbox

# Copy init SQL
COPY init.sql /docker-entrypoint-initdb.d/

# Expose port (optional)
EXPOSE 3306

# The MySQL image will automatically run the initialization scripts in /docker-entrypoint-initdb.d/ when the container starts