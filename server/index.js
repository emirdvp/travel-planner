const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "travelplanner",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Test database connection and run migrations
pool.query("SELECT NOW()", async (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
  console.log("Connected to PostgreSQL database");
  
  // Auto-run migrations to add missing columns
  try {
    await pool.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation VARCHAR(255)");
    await pool.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2)");
    await pool.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS travelers INTEGER DEFAULT 1");
    await pool.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Planning'");
    await pool.query("ALTER TABLE trips ADD COLUMN IF NOT EXISTS activities TEXT");
    
    // Create cities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        country VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default cities if table is empty
    const citiesCheck = await pool.query("SELECT COUNT(*) FROM cities");
    if (citiesCheck.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO cities (name, country) VALUES
          ('Warsaw', 'Poland'), ('Rzesz\u00f3w', 'Poland'), ('Istanbul', 'Turkey'),
          ('Berlin', 'Germany'), ('Vienna', 'Austria'), ('Krak\u00f3w', 'Poland'),
          ('Prague', 'Czech Republic'), ('Budapest', 'Hungary'), ('Amsterdam', 'Netherlands'),
          ('Paris', 'France'), ('Madrid', 'Spain'), ('Milan', 'Italy'),
          ('Barcelona', 'Spain'), ('Nice', 'France'), ('Lisbon', 'Portugal'),
          ('Athens', 'Greece'), ('Dubrovnik', 'Croatia'), ('Santorini', 'Greece'),
          ('Mallorca', 'Spain'), ('Rome', 'Italy')
      `);
    }
    
    console.log("✓ Database migrations completed");
  } catch (migrationErr) {
    console.error("Migration warning:", migrationErr.message);
  }
});

app.use(cors());
app.use(express.json());

// Check if user is logged in (for protected routes)
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Optional auth - sets userId if logged in, but doesn't require it
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      req.userEmail = decoded.email;
    } catch (err) {
      // Invalid token, continue as guest
    }
  }
  next();
}

// Get all cities
app.get("/api/cities", async (req, res) => {
  try {
    const result = await pool.query("SELECT name, country FROM cities ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Get cities error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Register new user
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // Check if user already exists
    const checkUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name || null]
    );

    const user = result.rows[0];

    // Create token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token: token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // Find user
    const result = await pool.query(
      "SELECT id, email, password_hash, name FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Wrong email or password" });
    }

    const user = result.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Wrong email or password" });
    }

    // Create token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token: token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all trips - optional auth (guests see all trips, users see only theirs)
app.get("/api/trips", optionalAuth, async (req, res) => {
  try {
    let result;
    
    if (req.userId) {
      // Logged in user - show only their trips
      result = await pool.query(
        "SELECT id, origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities, created_at FROM trips WHERE user_id = $1 ORDER BY start_date",
        [req.userId]
      );
    } else {
      // Guest mode - show sample/public trips (you can customize this logic)
      result = await pool.query(
        "SELECT id, origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities, created_at FROM trips ORDER BY start_date LIMIT 20"
      );
    }

    // Return trips as-is (keep snake_case for consistency)
    res.json(result.rows);
  } catch (error) {
    console.error("Get trips error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new trip - requires authentication
app.post("/api/trips", checkAuth, async (req, res) => {
  const { origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities } = req.body;

  if (!origin || !destination || !start_date) {
    return res.status(400).json({ error: "Origin, destination and start date required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO trips (user_id, origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
      [req.userId, origin, destination, transport || null, start_date, end_date || null, accommodation || null, budget || null, travelers || 1, status || 'Planning', activities || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create trip error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update trip - requires authentication
app.put("/api/trips/:id", checkAuth, async (req, res) => {
  const tripId = req.params.id;
  const { origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities } = req.body;

  if (!origin || !destination || !start_date) {
    return res.status(400).json({ error: "Origin, destination and start date required" });
  }

  try {
    // Update trip only if it belongs to the user
    const result = await pool.query(
      "UPDATE trips SET origin = $1, destination = $2, transport = $3, start_date = $4, end_date = $5, accommodation = $6, budget = $7, travelers = $8, status = $9, activities = $10 WHERE id = $11 AND user_id = $12 RETURNING *",
      [origin, destination, transport || null, start_date, end_date || null, accommodation || null, budget || null, travelers || 1, status || 'Planning', activities || null, tripId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found or you don't have permission to edit it" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update trip error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete trip - requires authentication
app.delete("/api/trips/:id", checkAuth, async (req, res) => {
  const tripId = req.params.id;

  try {
    // Check if trip belongs to user and delete in one query
    const result = await pool.query(
      "DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id",
      [tripId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete trip error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

