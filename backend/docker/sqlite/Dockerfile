FROM alpine:3.18

RUN apk add --no-cache sqlite

WORKDIR /sandbox

# COPY path is relative to BUILD CONTEXT (project root)
COPY docker/shared/init.sql /sandbox/init.sql

RUN sqlite3 sandbox.db < init.sql

CMD ["sleep", "infinity"]
