# Database Maintenance

## Database Backup / Restore

### Step 1: Identify your Postgres container and volume

**List running containers:**
```
docker ps
```
You should see something like this:
```
CONTAINER ID   IMAGE                 NAMES
ecd1fa9fcbc2   postgres:16-alpine    flashcards-db
```

**Inspect volumes used by the container:**
```
docker inspect flashcards-db | grep -A5 Mounts
```
You should see something like this:
```
"Type": "volume",
"Name": "flashcard-app_postgres_data",
"Source": "/var/lib/docker/volumes/flashcard-app_postgres_data/_data",
"Destination": "/var/lib/postgresql/data",
```

### Step 2: Create a backup from the running container

**Create the backup:**
```
docker exec -i flashcards-db pg_dump \
  -U flashcards \
  -F c \
  flashcards > flashcards_backup.dump
```

### Step 3: Verify the backup file
```
pg_restore -l flashcards_backup.dump
```
If tables are listed the backup is valid.

### Step 4: Stop postgres and remove the volume

```
docker compose down -v
```

### Step 5: Start Postgres

```
docker compose up -d
```

### Step 6: Restore the database from the backup

```
docker exec -i flashcards-db pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  -U flashcards \
  -d flashcards < flashcards_backup.dump
```

### Step 7: Run the application

```
npm run dev:full
```