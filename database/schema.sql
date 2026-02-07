-- Travel Planner Database Schema
-- PostgreSQL 12+

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  transport VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE,
  accommodation VARCHAR(255),
  budget DECIMAL(10,2),
  travelers INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'Planning',
  activities TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  country VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cities
INSERT INTO cities (name, country) VALUES
  ('Warsaw', 'Poland'), ('Rzeszów', 'Poland'), ('Istanbul', 'Turkey'),
  ('Berlin', 'Germany'), ('Vienna', 'Austria'), ('Kraków', 'Poland'),
  ('Prague', 'Czech Republic'), ('Budapest', 'Hungary'), ('Amsterdam', 'Netherlands'),
  ('Paris', 'France'), ('Madrid', 'Spain'), ('Milan', 'Italy'),
  ('Barcelona', 'Spain'), ('Nice', 'France'), ('Lisbon', 'Portugal'),
  ('Athens', 'Greece'), ('Dubrovnik', 'Croatia'), ('Santorini', 'Greece'),
  ('Mallorca', 'Spain'), ('Rome', 'Italy')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_transport ON trips(transport);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
