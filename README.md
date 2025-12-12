# Flashcard Application

This is a lightweight flashcard study app built with React (Vite + TailwindCSS) 
and a Postgres database with Node/Express API.

## Overview

### Purpose
The app provides a simple study interface (flip front/back) and an admin UI 
for managing categories and flashcards.

### Tech stack
- Frontend: React + Vite, TailwindCSS for styling
- Backend: Node.js + Express.js
- Database: Postgres

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

### Screenshots

#### Admin Panel

![Admin Panel](docs/admin-panel.png)

#### Front Side

![Front Side](docs/front-side.png)

#### Back Side

![Back Side](docs/back-side.png)
