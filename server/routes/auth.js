import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/index.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

const COMPANY_FIELDS = `u.id, u.email, u.name, u.role, u.company_id,
  c.name as company_name, c.slug as company_slug,
  c.primary_color, c.logo_data, c.tagline, c.industry_focus`;

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query(
      `SELECT u.*, c.name as company_name, c.slug as company_slug,
              c.primary_color, c.logo_data, c.tagline, c.industry_focus
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1 AND u.active = true`,
      [email]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        company_name: user.company_name,
        company_slug: user.company_slug,
        primary_color: user.primary_color,
        logo_data: user.logo_data,
        tagline: user.tagline,
        industry_focus: user.industry_focus,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { company_name, name, email, password } = req.body;
    if (!company_name || !name || !email || !password) {
      return res.status(400).json({ error: 'Company name, your name, email, and password are required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with that email already exists' });

    const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
    const company = await pool.query(
      'INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING *',
      [company_name, slug]
    );
    const company_id = company.rows[0].id;

    const password_hash = await bcrypt.hash(password, 10);
    const user = await pool.query(
      'INSERT INTO users (company_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [company_id, email, password_hash, name, 'admin']
    );

    const fullUser = { ...user.rows[0], company_name, company_slug: slug };
    const token = generateToken(fullUser);
    res.status(201).json({
      token,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
        company_id,
        company_name,
        company_slug: slug,
        primary_color: '#1e3a5f',
        logo_data: null,
        tagline: null,
        industry_focus: 'Oil & Gas',
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${COMPANY_FIELDS}
       FROM users u JOIN companies c ON u.company_id = c.id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
