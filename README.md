# Flashcard Application

## Overview

This is a lightweight flashcard study app built with React (Vite + TailwindCSS) 
and a PostgreSQL database with Node/Express API.

The app provides a simple study interface (flip front/back) and an admin UI 
for managing categories and flashcards.

### Tech stack

- Frontend: React + Vite, TailwindCSS for styling
- Backend: Node.js + Express.js
- Database: PostgreSQL

## Database Setup

### Local Development with Docker

The easiest way to run PostgreSQL locally is using Docker:

```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Manual PostgreSQL Setup

If you prefer to run PostgreSQL manually:

1. Install PostgreSQL on your system
2. Create a database and user:
   ```sql
   CREATE DATABASE flashcards;
   CREATE USER flashcards WITH PASSWORD 'flashcards';
   GRANT ALL PRIVILEGES ON DATABASE flashcards TO flashcards;
   ```
3. Configure connection in `.env.local` (copy from `.env.example`)

### Environment Configuration

Create a `.env.local` file (copy from `.env.example`):

```bash
# For local Docker setup:
PGHOST=localhost
PGPORT=5432
PGUSER=flashcards
PGPASSWORD=flashcards
PGDATABASE=flashcards

# Or use a connection string for hosted databases:
# DATABASE_URL=postgres://user:password@host:port/database
```

## Running The Application

The following command will run both the backend and frontend:

```
npm run dev:full
```

This will start:
- Backend API server on port 3001
- Frontend dev server on port 3000

### Running Separately

Backend only:
```
npm run server
```

Frontend only:
```
npm run dev
```

### Seeding the Database

To quickly populate your database with test data, you can use the seeding script:

```bash
npm run db:seed
```

This reads from `/server/seed-data.json` and populates the database. The seed script:
- Creates categories (subjects) if they don't exist
- Adds flashcards, skipping duplicates
- Can be run multiple times safely (idempotent)

To start fresh:
```bash
npm run db:clean  # Remove all data
npm run db:seed   # Add seed data
```

The seed data format in `seed-data.json`:
```json
{
  "subjects": [
    {
      "name": "Category Name",
      "cards": [
        {
          "front": "Question",
          "back": "Answer",
          "format": "sentence"
        }
      ]
    }
  ]
}
```

## Database Schema

The PostgreSQL database consists of two main tables:

**Categories**
- `id` - Auto-increment primary key (SERIAL)
- `name` - Unique category name
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Flashcards**
- `id` - Auto-increment primary key (SERIAL)
- `category_id` - Foreign key to categories (cascade delete)
- `front` - Question/front of card
- `back` - Answer/back of card
- `back_format` - Format type: 'sentence', 'list', or 'code'
- `code_language` - Programming language (for code format)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## User Interfaces

### Admin Interface
![Admin Page](docs/admin-panel.png)

### Flashcard Front
![Back Side](docs/front-side.png)

### Flashcard Back
![Back Side](docs/back-side.png)

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
docker exec -t flashcards-db pg_dump \
  -U flashcards \
  -F c \
  -f /tmp/flashcards_backup.dump \
  flashcards
```
**Copy it to your host:**
```
docker cp flashcards-db:/tmp/flashcards_backup.dump ./flashcards_backup.dump
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
  -U flashcards \
  -d flashcards < flashcards_backup.dump
```

### Step 7: Run the application

```
npm run dev:full
```