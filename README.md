# Travel Planner

Web application for planning trips with PostgreSQL backend.

## Features

- User authentication with JWT
- Create and manage trips
- Budget tracking
- Accommodation information
- Activity planning
- Calendar view
- City autocomplete from database

## Tech Stack

Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express, PostgreSQL

## Setup

### Requirements

- Node.js 14+
- PostgreSQL 12+

### Installation

1. Clone repository
   ```bash
   git clone <repo-url>
   cd project
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create database
   ```bash
   psql -U postgres -d travelplanner -f database/schema.sql
   ```

4. Configure environment
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials

5. Start server
   ```bash
   npm start
   ```

6. Open frontend
   ```bash
   cd web
   python -m http.server 8000
   ```

## Database

- users: User accounts
- trips: Trip records
- cities: City database

## API

- POST /api/auth/register
- POST /api/auth/login
- GET /api/cities
- GET /api/trips
- POST /api/trips
- PUT /api/trips/:id
- DELETE /api/trips/:id

## License

MIT
