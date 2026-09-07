#!/bin/bash

set -euo pipefail

############################################
# Load Environment Variables
############################################

ENV_FILE="/root/WEB/YARITU/.env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found: $ENV_FILE"
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

############################################
# Configuration
############################################

CONTAINER_NAME="mongodb"
BACKUP_ROOT="/tmp/mongodb_backups"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_PATH=$(date +"%Y/%m/%d")

BACKUP_NAME="yaritu_web_backup_${TIMESTAMP}"
ARCHIVE_FILE="${BACKUP_ROOT}/${BACKUP_NAME}.archive"

mkdir -p "$BACKUP_ROOT"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION="${AWS_REGION}"

echo "===================================="
echo "MongoDB Backup Started"
echo "Time : $(date)"
echo "===================================="

############################################
# Verify Docker Container
############################################

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "MongoDB container '${CONTAINER_NAME}' is not running."
    exit 1
fi

############################################
# Create Backup Inside Container
############################################

echo "Creating MongoDB backup..."

docker exec "$CONTAINER_NAME" sh -c \
"mongodump --uri='$MONGODB_URI' --archive=/tmp/mongodb.archive"

############################################
# Copy Backup to Host
############################################

docker cp \
"$CONTAINER_NAME:/tmp/mongodb.archive" \
"$ARCHIVE_FILE"

############################################
# Remove Temporary File From Container
############################################

docker exec "$CONTAINER_NAME" rm -f /tmp/mongodb.archive

############################################
# Upload to AWS S3
############################################

echo "Uploading backup to S3..."

aws s3 cp \
"$ARCHIVE_FILE" \
"s3://${AWS_S3_BUCKET_NAME}/mongodb-backups/${DATE_PATH}/${BACKUP_NAME}.archive"

############################################
# Cleanup
############################################

rm -f "$ARCHIVE_FILE"

echo ""
echo "===================================="
echo "Backup uploaded successfully."
echo "S3 Location:"
echo "s3://${AWS_S3_BUCKET_NAME}/mongodb-backups/${DATE_PATH}/${BACKUP_NAME}.archive"
echo "Completed : $(date)"
echo "===================================="
