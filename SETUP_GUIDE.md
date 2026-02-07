# Setup Guide

## Database Setup

1. Open pgAdmin 4

2. Create database
   - Right-click Databases > Create > Database
   - Name: `travelplanner`
   - Save

3. Run schema
   - Select `travelplanner` database
   - Tools > Query Tool
   - Copy content from `database/schema.sql`
   - Paste and execute (F5)

4. Verify
   ```sql
   SELECT * FROM users;
   SELECT * FROM trips;
   ```

## Configure Environment

1. Copy template
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` with your password
   ```
   DB_PASSWORD=your_postgres_password
   ```

## Run Application

1. Start backend
   ```bash
   npm start
   ```

2. Start frontend
   ```bash
   cd web
   python -m http.server 8000
   ```

3. Open browser at `http://localhost:8000`

## Test

Guest Mode:
- Click "Browse as Guest"
- View sample trips

User Mode:
- Login: `test@example.com` / `password123`
- Or register new account

## Troubleshooting

Database connection error:
- Check PostgreSQL is running
- Verify password in `.env`
- Confirm database exists

Relation does not exist:
- Run `schema.sql` in Query Tool

Can't login:
- Verify schema.sql executed
- Try test account
