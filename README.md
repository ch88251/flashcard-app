# Flashcard Application

This is a lightweight flashcard study app built with React (Vite + TailwindCSS) and an SQLite-backed Node/Express API.

## Overview

### Purpose
The app provides a simple study interface (flip front/back) and an admin UI for managing categories and flashcards. It focuses on fast local development and easy data management.

### Tech stack
- Frontend: React + Vite, TailwindCSS for styling
- Backend: Node.js + Express.js
- Database: SQLite (via `better-sqlite3`)
- Local tooling: npm scripts and `concurrently` for running frontend + backend together

### High-level architecture
- Frontend (client): React app served by Vite in development or a static build in production. It consumes the backend REST API.
- Backend (server): Express server exposing CRUD API endpoints and using prepared statements against the SQLite database.
- Database: Single-file SQLite database at `server/flashcards.db` storing `categories` and `flashcards` with foreign key constraints.

### Data model
- `categories`:
	- `id` (INTEGER, PK)
	- `name` (TEXT, UNIQUE)
	- `created_at`, `updated_at` (DATETIME)
- `flashcards`:
	- `id` (INTEGER, PK)
	- `category_id` (INTEGER, FK -> categories.id)
	- `front` (TEXT)
	- `back` (TEXT)
	- `created_at`, `updated_at` (DATETIME)

Foreign key constraints use `ON DELETE CASCADE` so deleting a category removes its flashcards.

## Available Scripts

- `npm run dev` - Start the React development server
- `npm run server` - Start the Express API server
- `npm run server:dev` - Start the API server with auto-reload
- `npm run dev:full` - Run both frontend and backend concurrently
- `npm run migrate` - Run the data migration from JSON to SQLite
- `npm run build` - Build the React app for production
- `npm run preview` - Preview the production build

## API Endpoints

The Express server provides the following REST endpoints:

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category
- `GET /api/categories/:id` - Get a specific category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category
- `GET /api/categories/:id/stats` - Get category statistics
- `GET /api/categories/:id/flashcards` - Get flashcards for a category

### Flashcards
- `GET /api/flashcards` - Get all flashcards
- `POST /api/flashcards` - Create a new flashcard
- `GET /api/flashcards/:id` - Get a specific flashcard
- `PUT /api/flashcards/:id` - Update a flashcard
- `DELETE /api/flashcards/:id` - Delete a flashcard
- `GET /api/flashcards/category/:categoryName` - Get flashcards by category name

## Usage

### Study Mode
1. Visit the main application at `http://localhost:5173`
2. Select a category from the dropdown
3. Use the flashcards with Previous/Next buttons
4. Click on cards to flip between front and back

### Admin Panel
1. Click the "Admin Panel" button in the top-right corner
2. **Manage Categories:**
   - Add new categories using the form
   - Delete existing categories (this will delete all associated flashcards)
   - Select a category to view its flashcards
3. **Manage Flashcards:**
   - Select a category first
   - Add new flashcards with front/back content
   - Edit existing flashcards inline
   - Delete unwanted flashcards

### Frontend notes
- Frontend API client: `src/services/flashcardAPI.js`.
- Main app: `src/App.jsx` now fetches categories and flashcards from the API.
- Admin interface: `src/AdminPanel.jsx` lets you add/edit/delete categories and flashcards.

### Screenshots

#### Admin Panel

![Admin Panel](docs/admin-panel.png)

#### Front Side

![Front Side](docs/front-side.png)

#### Back Side

![Back Side](docs/back-side.png)
