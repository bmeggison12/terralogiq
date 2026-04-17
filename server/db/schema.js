import pool from './index.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createSchema() {
  // Step 1: Create ALL tables in dependency order (no ALTER TABLE here)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      tagline VARCHAR(255),
      description TEXT,
      primary_color VARCHAR(20) DEFAULT '#1e3a5f',
      logo_data TEXT,
      hq_city VARCHAR(100),
      hq_state VARCHAR(50),
      website VARCHAR(255),
      phone VARCHAR(50),
      industry_focus VARCHAR(255) DEFAULT 'Oil & Gas',
      what_we_sell TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS territories (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      states VARCHAR(255),
      center_lat DECIMAL(10,7),
      center_lon DECIMAL(10,7),
      zoom_level INTEGER DEFAULT 7,
      color VARCHAR(50) DEFAULT '#1e3a5f',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, slug)
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'sales',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_territories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
      UNIQUE(user_id, territory_id)
    );

    CREATE TABLE IF NOT EXISTS operators (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      territory_id INTEGER REFERENCES territories(id),
      name VARCHAR(255) NOT NULL,
      basin VARCHAR(255),
      state VARCHAR(100),
      relationship_score INTEGER DEFAULT 5 CHECK (relationship_score BETWEEN 1 AND 10),
      last_contact_date DATE,
      next_action TEXT,
      next_action_date DATE,
      revenue_per_rig DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      operator_type VARCHAR(50) DEFAULT 'public',
      parent_company VARCHAR(255),
      hq_city VARCHAR(100),
      hq_state VARCHAR(50),
      price_sheet_name TEXT,
      price_sheet_data TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      operator_id INTEGER REFERENCES operators(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id),
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      mobile_phone VARCHAR(50),
      is_primary BOOLEAN DEFAULT false,
      role_type VARCHAR(100),
      influence_level VARCHAR(100),
      department VARCHAR(100),
      office_location VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rigs (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      territory_id INTEGER REFERENCES territories(id),
      rig_name VARCHAR(255),
      rig_number VARCHAR(100),
      contractor VARCHAR(255),
      basin VARCHAR(255),
      county VARCHAR(255),
      state VARCHAR(100),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      spud_date DATE,
      status VARCHAR(50) DEFAULT 'active',
      week_date DATE,
      formation VARCHAR(255),
      well_type VARCHAR(100),
      drill_type VARCHAR(50),
      api_number VARCHAR(50),
      permit_number VARCHAR(50),
      land_offshore VARCHAR(20) DEFAULT 'LAND',
      operator_name_display VARCHAR(255),
      company_man_day VARCHAR(255),
      company_man_night VARCHAR(255),
      is_peak_rig BOOLEAN DEFAULT false,
      peak_notes TEXT,
      win_probability INTEGER DEFAULT NULL CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100)),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rig_history (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      week_date DATE NOT NULL,
      rig_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, operator_id, week_date)
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      territory_id INTEGER REFERENCES territories(id),
      title VARCHAR(255) NOT NULL,
      stage VARCHAR(100) DEFAULT 'Identified',
      value DECIMAL(12,2) DEFAULT 0,
      description TEXT,
      assigned_to INTEGER REFERENCES users(id),
      expected_close_date DATE,
      probability INTEGER DEFAULT NULL CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
      equipment_type VARCHAR(255),
      competitor_on_site VARCHAR(255),
      follow_up_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS msa_status (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      status VARCHAR(100) DEFAULT 'Not Started',
      signed_date DATE,
      expiry_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, operator_id)
    );

    CREATE TABLE IF NOT EXISTS sales_logs (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      user_id INTEGER REFERENCES users(id),
      operator_id INTEGER REFERENCES operators(id),
      rig_id INTEGER REFERENCES rigs(id),
      log_date DATE DEFAULT CURRENT_DATE,
      contact_method VARCHAR(100),
      notes TEXT,
      competitor_equipment TEXT,
      next_steps TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      user_id INTEGER REFERENCES users(id),
      operator_id INTEGER REFERENCES operators(id),
      contact_id INTEGER REFERENCES contacts(id),
      activity_type VARCHAR(50) NOT NULL DEFAULT 'Call',
      subject VARCHAR(255),
      notes TEXT,
      activity_date TIMESTAMP DEFAULT NOW(),
      follow_up_date DATE,
      follow_up_notes TEXT,
      is_completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revenue_packages (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      package_name VARCHAR(255) NOT NULL,
      notes TEXT,
      days_per_month INTEGER DEFAULT 30,
      items JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rig_equipment (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      rig_id INTEGER REFERENCES rigs(id) ON DELETE CASCADE,
      item_name VARCHAR(255) NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS operator_competitors (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      competitor_name VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_site_types (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50) DEFAULT '#6366f1',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS job_sites (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      site_type_id INTEGER REFERENCES job_site_types(id) ON DELETE SET NULL,
      territory_id INTEGER REFERENCES territories(id),
      site_name VARCHAR(255) NOT NULL,
      county VARCHAR(255),
      state VARCHAR(100),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      status VARCHAR(100) DEFAULT 'Active',
      wells_count INTEGER DEFAULT 0,
      notes TEXT,
      is_peak_site BOOLEAN DEFAULT false,
      job_date DATE,
      source VARCHAR(100) DEFAULT 'Manual',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS frac_sites (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id),
      operator_id INTEGER REFERENCES operators(id),
      territory_id INTEGER REFERENCES territories(id),
      site_name VARCHAR(255) NOT NULL,
      county VARCHAR(255),
      state VARCHAR(100),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      status VARCHAR(100) DEFAULT 'Active',
      total_wells INTEGER DEFAULT 0,
      active_wells INTEGER DEFAULT 0,
      notes TEXT,
      is_peak_site BOOLEAN DEFAULT false,
      frac_date DATE,
      source VARCHAR(100) DEFAULT 'Manual',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_products (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      daily_rate DECIMAL(10,2),
      weekly_rate DECIMAL(10,2),
      monthly_rate DECIMAL(10,2),
      unit VARCHAR(50),
      specs TEXT,
      image_data TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_price_sheets (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255),
      file_data TEXT,
      file_type VARCHAR(50),
      notes TEXT,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_active_sites (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      operator_id INTEGER REFERENCES operators(id),
      rig_id INTEGER REFERENCES rigs(id),
      site_name VARCHAR(255),
      site_type VARCHAR(100),
      county VARCHAR(100),
      state VARCHAR(50),
      products_on_site TEXT,
      units_count INTEGER DEFAULT 1,
      start_date DATE,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Step 2: ALTER TABLE for any columns that may be missing on existing databases (safe no-ops on fresh DBs)
  await pool.query(`
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#1e3a5f';
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_data TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_city VARCHAR(100);
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_state VARCHAR(50);
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_focus VARCHAR(255) DEFAULT 'Oil & Gas';
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS what_we_sell TEXT;

    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS office_location VARCHAR(255);
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role_type VARCHAR(100);
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS influence_level VARCHAR(100);

    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS company_man_day VARCHAR(255);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS company_man_night VARCHAR(255);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS is_peak_rig BOOLEAN DEFAULT false;
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS peak_notes TEXT;
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS win_probability INTEGER DEFAULT NULL CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100));
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS formation VARCHAR(255);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS well_type VARCHAR(100);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS drill_type VARCHAR(50);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS api_number VARCHAR(50);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS permit_number VARCHAR(50);
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS land_offshore VARCHAR(20) DEFAULT 'LAND';
    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS operator_name_display VARCHAR(255);

    ALTER TABLE operators ADD COLUMN IF NOT EXISTS price_sheet_name TEXT;
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS price_sheet_data TEXT;
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS operator_type VARCHAR(50) DEFAULT 'public';
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS parent_company VARCHAR(255);
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS hq_city VARCHAR(100);
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS hq_state VARCHAR(50);
    ALTER TABLE operators ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id);

    ALTER TABLE rigs ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id);
    ALTER TABLE job_sites ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id);
    ALTER TABLE frac_sites ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id);
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id);
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT NULL CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100));
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(255);
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competitor_on_site VARCHAR(255);
    ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS follow_up_date DATE;
  `);

  // Step 3: Data migrations (safe — no-ops if already done)
  await pool.query(`
    UPDATE users SET email = 'admin@demo.com' WHERE email = 'admin@peakrentals.com';
    UPDATE users SET email = 'sales@demo.com' WHERE email = 'sales@peakrentals.com';
    UPDATE users SET email = 'exec@demo.com' WHERE email = 'exec@peakrentals.com';
    UPDATE companies SET name = 'Demo Company', slug = 'demo-company' WHERE slug = 'peak-rentals';
  `);

  // Step 4: Remove old Select Water data
  await pool.query(`
    DO $$
    DECLARE sw_id INTEGER;
    BEGIN
      SELECT id INTO sw_id FROM companies WHERE slug = 'select-water';
      IF sw_id IS NOT NULL THEN
        DELETE FROM activities WHERE company_id = sw_id;
        DELETE FROM sales_logs WHERE company_id = sw_id;
        DELETE FROM msa_status WHERE company_id = sw_id;
        DELETE FROM opportunities WHERE company_id = sw_id;
        DELETE FROM rig_equipment WHERE company_id = sw_id;
        DELETE FROM rig_history WHERE company_id = sw_id;
        DELETE FROM rigs WHERE company_id = sw_id;
        DELETE FROM operator_competitors WHERE company_id = sw_id;
        DELETE FROM contacts WHERE company_id = sw_id;
        DELETE FROM revenue_packages WHERE company_id = sw_id;
        DELETE FROM job_site_types WHERE company_id = sw_id;
        DELETE FROM job_sites WHERE company_id = sw_id;
        DELETE FROM frac_sites WHERE company_id = sw_id;
        DELETE FROM operators WHERE company_id = sw_id;
        DELETE FROM users WHERE company_id = sw_id;
        DELETE FROM companies WHERE id = sw_id;
      END IF;
    END $$;
  `);

  // Step 5: Seed territories for each company that has none
  await pool.query(`
    DO $$
    DECLARE cid INTEGER;
    BEGIN
      FOR cid IN SELECT id FROM companies LOOP
        IF NOT EXISTS (SELECT 1 FROM territories WHERE company_id = cid) THEN
          INSERT INTO territories (company_id, name, slug, states, center_lat, center_lon, zoom_level, color, sort_order) VALUES
            (cid, 'Permian Basin',        'permian',       'TX, NM',            31.8000, -102.5000, 7, '#8b5cf6',  1),
            (cid, 'Eagle Ford',           'eagle-ford',    'TX',                28.5000,  -98.5000, 7, '#0ea5e9',  2),
            (cid, 'Haynesville',         'haynesville',   'LA, TX',            32.0000,  -93.5000, 7, '#f97316',  3),
            (cid, 'Barnett',              'barnett',       'TX',                32.5000,  -97.5000, 8, '#84cc16',  4),
            (cid, 'SCOOP-STACK / Anadarko','scoop-stack',  'OK',                35.5000,  -98.0000, 7, '#eab308',  5),
            (cid, 'Woodford',             'woodford',      'OK',                34.5000,  -96.5000, 8, '#a855f7',  6),
            (cid, 'Arkoma Basin',         'arkoma',        'OK, AR',            35.0000,  -94.5000, 8, '#6366f1',  7),
            (cid, 'Fayetteville',         'fayetteville',  'AR',                35.5000,  -92.0000, 8, '#64748b',  8),
            (cid, 'Bakken / Williston',   'bakken',        'ND, MT, SD',        47.9000, -103.0000, 6, '#f59e0b',  9),
            (cid, 'Powder River Basin',   'powder-river',  'WY',                43.5000, -106.0000, 7, '#ef4444', 10),
            (cid, 'DJ Basin / Niobrara',  'dj-basin',      'CO, WY, NE, KS',   40.5000, -104.5000, 7, '#ec4899', 11),
            (cid, 'Piceance Basin',       'piceance',      'CO',                39.5000, -108.0000, 8, '#14b8a6', 12),
            (cid, 'San Juan Basin',       'san-juan',      'NM, CO',            36.8000, -107.8000, 8, '#0891b2', 13),
            (cid, 'Marcellus',            'marcellus',     'PA, WV, OH, NY',   41.0000,  -78.0000, 6, '#10b981', 14),
            (cid, 'Utica',                'utica',         'OH, PA, WV',        40.5000,  -81.0000, 7, '#06b6d4', 15),
            (cid, 'Appalachian',          'appalachian',   'PA, WV, OH, VA',   39.5000,  -80.5000, 6, '#22c55e', 16)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END $$;
  `);

  // Step 6: Add Gulf of Mexico territory
  await pool.query(`
    DO $$
    DECLARE cid INTEGER;
    BEGIN
      FOR cid IN SELECT id FROM companies LOOP
        INSERT INTO territories (company_id, name, slug, states, center_lat, center_lon, zoom_level, color, sort_order)
        VALUES (cid, 'Gulf of Mexico', 'gulf-mexico', 'LA, TX (Offshore)', 27.0000, -90.0000, 6, '#0f172a', 17)
        ON CONFLICT (company_id, slug) DO NOTHING;
      END LOOP;
    END $$;
  `);

  // Step 7: Seed operators for company 1 if under threshold
  await pool.query(`
    DO $$
    DECLARE
      permian_id    INTEGER; ef_id        INTEGER; haynesville_id INTEGER;
      barnett_id    INTEGER; scoop_id     INTEGER; woodford_id   INTEGER;
      bakken_id     INTEGER; dj_id        INTEGER; marcellus_id  INTEGER;
      utica_id      INTEGER; appalachian_id INTEGER; gulf_id     INTEGER;
      powder_id     INTEGER; arkoma_id    INTEGER;
    BEGIN
      IF (SELECT COUNT(*) FROM operators WHERE company_id = 1) < 60 THEN
        SELECT id INTO permian_id    FROM territories WHERE company_id=1 AND slug='permian';
        SELECT id INTO ef_id         FROM territories WHERE company_id=1 AND slug='eagle-ford';
        SELECT id INTO haynesville_id FROM territories WHERE company_id=1 AND slug='haynesville';
        SELECT id INTO barnett_id    FROM territories WHERE company_id=1 AND slug='barnett';
        SELECT id INTO scoop_id      FROM territories WHERE company_id=1 AND slug='scoop-stack';
        SELECT id INTO woodford_id   FROM territories WHERE company_id=1 AND slug='woodford';
        SELECT id INTO bakken_id     FROM territories WHERE company_id=1 AND slug='bakken';
        SELECT id INTO dj_id         FROM territories WHERE company_id=1 AND slug='dj-basin';
        SELECT id INTO marcellus_id  FROM territories WHERE company_id=1 AND slug='marcellus';
        SELECT id INTO utica_id      FROM territories WHERE company_id=1 AND slug='utica';
        SELECT id INTO appalachian_id FROM territories WHERE company_id=1 AND slug='appalachian';
        SELECT id INTO gulf_id       FROM territories WHERE company_id=1 AND slug='gulf-mexico';
        SELECT id INTO powder_id     FROM territories WHERE company_id=1 AND slug='powder-river';
        SELECT id INTO arkoma_id     FROM territories WHERE company_id=1 AND slug='arkoma';

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'ExxonMobil','Permian Basin','TX',permian_id,'public',NULL,'Spring','TX',6,88000,'Schedule intro meeting with XTO completions team'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('ExxonMobil'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Chevron','Permian Basin','TX',permian_id,'public',NULL,'San Ramon','CA',6,91000,'Connect with Noble Energy legacy contacts'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Chevron'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Occidental Petroleum','Permian Basin','TX',permian_id,'public',NULL,'Houston','TX',7,86000,'Follow up on MSA renewal — due Q3'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Occidental Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Pioneer Natural Resources','Permian Basin','TX',permian_id,'public',NULL,'Irving','TX',8,93000,'Q2 pricing proposal — Midland completions fleet'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Pioneer Natural Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Diamondback Energy','Permian Basin','TX',permian_id,'public',NULL,'Midland','TX',8,89000,'Send updated equipment catalog — Delaware Basin program'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Diamondback Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'APA Corporation','Permian Basin','TX',permian_id,'public',NULL,'Houston','TX',7,81000,'Reconnect after Apache rebrand — check rig count'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('APA Corporation'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Matador Resources','Permian Basin','NM',permian_id,'public',NULL,'Dallas','TX',8,84000,'Delaware Basin expansion — schedule site visit'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Matador Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Laredo Petroleum','Permian Basin','TX',permian_id,'public',NULL,'Tulsa','OK',7,78000,'Quarterly review call — Permian program update'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Laredo Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'CrownQuest Operating','Permian Basin','TX',permian_id,'private',NULL,'Midland','TX',5,75000,'Initial outreach — private Permian operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('CrownQuest Operating'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Double Eagle Energy','Permian Basin','TX',permian_id,'private_equity',NULL,'Fort Worth','TX',6,77000,'PE-backed — fast growing Midland operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Double Eagle Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Endeavor Energy Resources','Permian Basin','TX',permian_id,'private',NULL,'Midland','TX',7,87000,'Largest private Permian operator — schedule exec meeting'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Endeavor Energy Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'XCL Resources','Permian Basin','TX',permian_id,'private_equity',NULL,'Fort Worth','TX',6,80000,'Delaware Basin — confirm rig schedule Q3'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('XCL Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Blackbeard Operating','Permian Basin','TX',permian_id,'private',NULL,'Midland','TX',5,72000,'New Midland operator — initial contact via referral'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Blackbeard Operating'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Shell Oil Company','Permian Basin','TX',permian_id,'public','Shell plc','Houston','TX',5,90000,'Enterprise deal potential — connect with supply chain'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Shell Oil Company'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Marathon Oil','Eagle Ford','TX',ef_id,'public',NULL,'Houston','TX',8,75000,'MSA renewal discussion — Q2 deadline'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Marathon Oil'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'SM Energy','Eagle Ford','TX',ef_id,'public',NULL,'Denver','CO',7,72000,'Eagle Ford + Permian expansion — dual territory opportunity'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('SM Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Callon Petroleum','Eagle Ford','TX',ef_id,'public',NULL,'Houston','TX',8,92000,'Completions fleet expansion — DeWitt County'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Callon Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Repsol USA','Eagle Ford','TX',ef_id,'public','Repsol S.A.','The Woodlands','TX',6,68000,'International operator — procurement decision in Spain'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Repsol USA'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Baytex Energy','Eagle Ford','TX',ef_id,'public',NULL,'Calgary','AB',6,70000,'Canadian operator with major Eagle Ford position'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Baytex Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Central Gulf Petroleum','Eagle Ford','TX',ef_id,'private',NULL,'Corpus Christi','TX',5,65000,'South Texas operator — early stage discussions'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Central Gulf Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Continental Resources','Bakken','ND',bakken_id,'public',NULL,'Oklahoma City','OK',7,82000,'Bakken + SCOOP — dual territory strategy call'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Continental Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Hess Corporation','Bakken','ND',bakken_id,'public',NULL,'New York','NY',7,85000,'Top Bakken operator — annual equipment review'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Hess Corporation'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Whiting Petroleum','Bakken','ND',bakken_id,'public',NULL,'Denver','CO',6,74000,'Post-bankruptcy recovery — assess new rig program'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Whiting Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Oasis Petroleum','Bakken','ND',bakken_id,'public',NULL,'Houston','TX',6,72000,'Williston focus — reestablish contact post-merger'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Oasis Petroleum'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Equinor USA','Bakken','ND',bakken_id,'public','Equinor ASA','Stamford','CT',5,80000,'Norwegian NOC — major Bakken position'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Equinor USA'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Southwestern Energy','Haynesville','LA',haynesville_id,'public',NULL,'Spring','TX',7,76000,'Haynesville + Appalachia — dual basin presence'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Southwestern Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Rockcliff Energy','Haynesville','TX',haynesville_id,'private_equity',NULL,'Houston','TX',7,74000,'East Texas Haynesville — active drilling program'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Rockcliff Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Flywheel Energy','Haynesville','LA',haynesville_id,'private_equity',NULL,'Houston','TX',6,71000,'Growing Haynesville operator — acquired Aethon assets'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Flywheel Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Civitas Resources','DJ Basin','CO',dj_id,'public',NULL,'Denver','CO',8,82000,'Formed from Bonanza Creek + Extraction merger — top DJ operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Civitas Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Bonanza Creek Energy','DJ Basin','CO',dj_id,'public',NULL,'Denver','CO',6,74000,'Legacy DJ operator — now part of Civitas'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Bonanza Creek Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Extraction Oil & Gas','DJ Basin','CO',dj_id,'public',NULL,'Denver','CO',5,71000,'Merged into Civitas — legacy relationship'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Extraction Oil & Gas'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Ovintiv','DJ Basin','CO',dj_id,'public',NULL,'Denver','CO',7,84000,'Major Anadarko + DJ + Permian operator — key account'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Ovintiv'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Mewbourne Oil Company','SCOOP-STACK','OK',scoop_id,'private',NULL,'Oklahoma City','OK',6,76000,'Largest private Oklahoma operator — relationship building'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Mewbourne Oil Company'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'TotalEnergies','SCOOP-STACK','OK',scoop_id,'public','TotalEnergies SE','Houston','TX',5,83000,'French NOC — SCOOP JV with Continental'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('TotalEnergies'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Gulfport Energy','SCOOP-STACK','OK',scoop_id,'public',NULL,'Oklahoma City','OK',7,78000,'SCOOP + Utica operator — quarterly review due'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Gulfport Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'EQT Corporation','Marcellus','PA',marcellus_id,'public',NULL,'Pittsburgh','PA',7,79000,'Largest US gas producer — Appalachia focus'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('EQT Corporation'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Range Resources','Marcellus','PA',marcellus_id,'public',NULL,'Fort Worth','TX',7,76000,'Pioneer Marcellus producer — long-term relationship potential'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Range Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Antero Resources','Marcellus','WV',marcellus_id,'public',NULL,'Denver','CO',7,77000,'Marcellus + Utica liquids-rich play'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Antero Resources'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Coterra Energy','Marcellus','PA',marcellus_id,'public',NULL,'Houston','TX',7,80000,'Cabot + Cimarex merger — Appalachia + Permian dual play'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Coterra Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Cabot Oil & Gas','Marcellus','PA',marcellus_id,'public',NULL,'Houston','TX',5,72000,'Legacy Marcellus operator — now part of Coterra'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Cabot Oil & Gas'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'BKV Corporation','Marcellus','PA',marcellus_id,'private_equity',NULL,'Denver','CO',6,73000,'Barnett + Appalachia operator — growing platform'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('BKV Corporation'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Chesapeake Energy','Marcellus','PA',marcellus_id,'public',NULL,'Oklahoma City','OK',6,75000,'Haynesville + Marcellus focus post-restructuring'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Chesapeake Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Crescent Energy','Eagle Ford','TX',ef_id,'public',NULL,'Houston','TX',7,76000,'Eagle Ford + Rocky Mountain operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Crescent Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Talos Energy','Gulf of Mexico','LA',gulf_id,'public',NULL,'Houston','TX',6,95000,'Top independent GoM operator — shelf and deepwater'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Talos Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'LLOG Exploration','Gulf of Mexico','LA',gulf_id,'private',NULL,'Covington','LA',6,90000,'Major private deepwater operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('LLOG Exploration'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'W&T Offshore','Gulf of Mexico','LA',gulf_id,'public',NULL,'Houston','TX',5,82000,'Shelf-focused GoM operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('W&T Offshore'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Kosmos Energy','Gulf of Mexico','TX',gulf_id,'public',NULL,'Dallas','TX',5,88000,'Deepwater exploration — Africa + GoM focus'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Kosmos Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'PetroQuest Energy','Gulf of Mexico','LA',gulf_id,'public',NULL,'Lafayette','LA',4,70000,'Small GoM and onshore Louisiana operator'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('PetroQuest Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Denbury Inc.','Gulf Coast','TX',gulf_id,'public',NULL,'Plano','TX',5,76000,'CO2 EOR specialist — Gulf Coast onshore + offshore'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Denbury Inc.'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Wintershall Dea','Gulf of Mexico','TX',gulf_id,'public','BASF','Houston','TX',4,85000,'European NOC — GoM deepwater position'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Wintershall Dea'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Fieldwood Energy','Gulf of Mexico','LA',gulf_id,'private_equity',NULL,'Houston','TX',5,88000,'Largest GoM shelf operator by acreage'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Fieldwood Energy'));

        INSERT INTO operators (company_id,name,basin,state,territory_id,operator_type,parent_company,hq_city,hq_state,relationship_score,revenue_per_rig,next_action)
        SELECT 1,'Beacon Offshore Energy','Gulf of Mexico','LA',gulf_id,'private_equity',NULL,'Houston','TX',5,87000,'GoM deepwater development specialist'
        WHERE NOT EXISTS(SELECT 1 FROM operators WHERE company_id=1 AND LOWER(name)=LOWER('Beacon Offshore Energy'));

      END IF;
    END $$;
  `);

  // Step 8: Seed contacts for key operators
  await pool.query(`
    DO $$
    DECLARE
      op_id INTEGER; comp_id INTEGER;
    BEGIN
      comp_id := 1;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Pioneer Natural Resources');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Sarah Mitchell','VP Completions','s.mitchell@pxd.com','432-555-1001','Completions','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('s.mitchell@pxd.com'));
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Tom Bradley','Supply Chain Director','t.bradley@pxd.com','432-555-1002','Supply Chain','Influencer',false
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('t.bradley@pxd.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Diamondback Energy');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Randy Faulk','Completions Manager','r.faulk@diamondbackenergy.com','432-555-2001','Completions','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('r.faulk@diamondbackenergy.com'));
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Kelli Thompson','Procurement Lead','k.thompson@diamondbackenergy.com','432-555-2002','Procurement','Influencer',false
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('k.thompson@diamondbackenergy.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Occidental Petroleum');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Marcus Reyes','Drilling Superintendent','m.reyes@oxy.com','432-555-3001','Drilling','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('m.reyes@oxy.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Continental Resources');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Clay Henderson','VP Drilling','c.henderson@clr.com','405-555-4001','Drilling','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('c.henderson@clr.com'));
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Amy Collins','Completions Superintendent','a.collins@clr.com','405-555-4002','Completions','Influencer',false
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('a.collins@clr.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Hess Corporation');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'David Ostrowski','Bakken Operations Director','d.ostrowski@hess.com','701-555-5001','Production','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('d.ostrowski@hess.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('EQT Corporation');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Lauren Strickland','Supply Chain VP','l.strickland@eqt.com','412-555-6001','Supply Chain','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('l.strickland@eqt.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Civitas Resources');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Jake Simmons','Completions Director','j.simmons@civitasresources.com','303-555-7001','Completions','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('j.simmons@civitasresources.com'));
      END IF;

      SELECT id INTO op_id FROM operators WHERE company_id=comp_id AND LOWER(name)=LOWER('Talos Energy');
      IF op_id IS NOT NULL THEN
        INSERT INTO contacts (company_id,operator_id,name,title,email,phone,role_type,influence_level,is_primary)
        SELECT comp_id,op_id,'Maria Gonzalez','GoM Operations Manager','m.gonzalez@talosenergy.com','713-555-8001','Production','Decision Maker',true
        WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE operator_id=op_id AND LOWER(email)=LOWER('m.gonzalez@talosenergy.com'));
      END IF;

    END $$;
  `);

  console.log('Schema created successfully');
}

export async function seedData() {
  const existing = await pool.query('SELECT id FROM companies LIMIT 1');
  if (existing.rows.length > 0) return;

  await pool.query(`
    INSERT INTO companies (name, slug) VALUES
      ('Demo Company', 'demo-company')
    ON CONFLICT DO NOTHING;
  `);

  const bcrypt = await import('bcryptjs');

  const adminHash = await bcrypt.default.hash('admin123', 10);
  const salesHash = await bcrypt.default.hash('sales123', 10);

  await pool.query(`
    INSERT INTO users (company_id, email, password_hash, name, role) VALUES
      (1, 'admin@demo.com', $1, 'Admin User', 'admin'),
      (1, 'sales@demo.com', $2, 'Sarah Johnson', 'sales'),
      (1, 'exec@demo.com', $2, 'Mike Thompson', 'exec')
    ON CONFLICT DO NOTHING;
  `, [adminHash, salesHash]);

  await pool.query(`
    INSERT INTO territories (company_id, name, slug, states, center_lat, center_lon, zoom_level, color, sort_order) VALUES
      (1, 'Permian Basin',        'permian',       'TX, NM',             31.8000, -102.5000, 7, '#8b5cf6', 1),
      (1, 'Eagle Ford',           'eagle-ford',    'TX',                 28.5000,  -98.5000, 7, '#0ea5e9', 2),
      (1, 'Haynesville',         'haynesville',   'LA, TX',             32.0000,  -93.5000, 7, '#f97316', 3),
      (1, 'Barnett',              'barnett',       'TX',                 32.5000,  -97.5000, 8, '#84cc16', 4),
      (1, 'SCOOP-STACK / Anadarko','scoop-stack',  'OK',                 35.5000,  -98.0000, 7, '#eab308', 5),
      (1, 'Woodford',             'woodford',      'OK',                 34.5000,  -96.5000, 8, '#a855f7', 6),
      (1, 'Arkoma Basin',         'arkoma',        'OK, AR',             35.0000,  -94.5000, 8, '#6366f1', 7),
      (1, 'Fayetteville',         'fayetteville',  'AR',                 35.5000,  -92.0000, 8, '#64748b', 8),
      (1, 'Bakken / Williston',   'bakken',        'ND, MT, SD',         47.9000, -103.0000, 6, '#f59e0b', 9),
      (1, 'Powder River Basin',   'powder-river',  'WY',                 43.5000, -106.0000, 7, '#ef4444', 10),
      (1, 'DJ Basin / Niobrara',  'dj-basin',      'CO, WY, NE, KS',    40.5000, -104.5000, 7, '#ec4899', 11),
      (1, 'Piceance Basin',       'piceance',      'CO',                 39.5000, -108.0000, 8, '#14b8a6', 12),
      (1, 'San Juan Basin',       'san-juan',      'NM, CO',             36.8000, -107.8000, 8, '#0891b2', 13),
      (1, 'Marcellus',            'marcellus',     'PA, WV, OH, NY',    41.0000,  -78.0000, 6, '#10b981', 14),
      (1, 'Utica',                'utica',         'OH, PA, WV',         40.5000,  -81.0000, 7, '#06b6d4', 15),
      (1, 'Appalachian',          'appalachian',   'PA, WV, OH, VA',    39.5000,  -80.5000, 6, '#22c55e', 16)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO operators (company_id, name, basin, state, relationship_score, next_action, revenue_per_rig) VALUES
      (1, 'EOG Resources', 'Eagle Ford', 'TX', 9, 'Schedule Q2 field visit', 85000),
      (1, 'ConocoPhillips', 'Eagle Ford', 'TX', 7, 'Follow up on pricing proposal', 72000),
      (1, 'Marathon Oil', 'Eagle Ford', 'TX', 8, 'MSA renewal discussion', 68000),
      (1, 'Murphy Oil', 'Eagle Ford', 'TX', 6, 'Send equipment catalog', 75000),
      (1, 'Callon Petroleum', 'Eagle Ford', 'TX', 8, 'Contract review meeting', 92000),
      (1, 'Pioneer Natural Resources', 'Eagle Ford', 'TX', 7, 'Quarterly review call', 78000),
      (1, 'SM Energy', 'Eagle Ford', 'TX', 5, 'Initial outreach follow-up', 64000)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO contacts (operator_id, company_id, name, title, email, phone, is_primary) VALUES
      (1, 1, 'Carlos Rodriguez', 'Drilling Manager', 'c.rodriguez@eog.com', '361-555-0101', true),
      (1, 1, 'Maria Santos', 'Supply Chain Manager', 'm.santos@eog.com', '361-555-0102', false),
      (2, 1, 'Robert Davis', 'Field Operations Director', 'r.davis@conocophillips.com', '361-555-0201', true),
      (3, 1, 'Amanda Wilson', 'Completions Superintendent', 'a.wilson@marathonoil.com', '361-555-0301', true),
      (4, 1, 'James Hernandez', 'Company Man', 'j.hernandez@murphyoil.com', '361-555-0401', true),
      (5, 1, 'Jennifer Park', 'Director of Operations', 'j.park@callon.com', '432-555-0501', true),
      (6, 1, 'John Martinez', 'VP Operations', 'j.martinez@pioneer.com', '432-555-0601', true),
      (7, 1, 'Lisa Chen', 'Procurement Manager', 'l.chen@smenergy.com', '432-555-0701', true)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO rigs (company_id, operator_id, rig_name, rig_number, contractor, basin, county, state, latitude, longitude, status, week_date) VALUES
      (1, 1, 'EOG Eagle 1', 'EE-001', 'Nabors', 'Eagle Ford', 'LA SALLE', 'TX', 28.3520, -99.4340, 'active', CURRENT_DATE),
      (1, 1, 'EOG Eagle 2', 'EE-002', 'Patterson-UTI', 'Eagle Ford', 'MCMULLEN', 'TX', 28.1700, -99.3800, 'active', CURRENT_DATE),
      (1, 1, 'EOG Eagle 3', 'EE-003', 'H&P', 'Eagle Ford', 'KARNES', 'TX', 28.9100, -97.8500, 'active', CURRENT_DATE),
      (1, 2, 'COP South Texas 1', 'CP-001', 'Ensign', 'Eagle Ford', 'WEBB', 'TX', 27.7500, -99.5000, 'active', CURRENT_DATE),
      (1, 2, 'COP South Texas 2', 'CP-002', 'Nabors', 'Eagle Ford', 'LA SALLE', 'TX', 28.4800, -99.6200, 'active', CURRENT_DATE),
      (1, 3, 'Marathon EF 1', 'MO-001', 'Patterson-UTI', 'Eagle Ford', 'ATASCOSA', 'TX', 29.1000, -98.5200, 'active', CURRENT_DATE),
      (1, 4, 'Murphy ST 1', 'MU-001', 'Precision', 'Eagle Ford', 'KARNES', 'TX', 28.8800, -97.9200, 'active', CURRENT_DATE),
      (1, 5, 'Callon EF 1', 'CA-001', 'H&P', 'Eagle Ford', 'DEWITT', 'TX', 29.0500, -97.4800, 'active', CURRENT_DATE),
      (1, 6, 'Pioneer EF 1', 'PR-001', 'Nabors', 'Eagle Ford', 'DIMMIT', 'TX', 28.4200, -99.8100, 'active', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO rig_history (company_id, operator_id, week_date, rig_count)
    SELECT 
      o.company_id, o.id, 
      CURRENT_DATE - (n.n * 7) AS week_date,
      FLOOR(2 + RANDOM() * 4)::INTEGER AS rig_count
    FROM operators o
    CROSS JOIN generate_series(0, 11) AS n(n)
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO opportunities (company_id, operator_id, title, stage, value, description) VALUES
      (1, 1, 'EOG Q2 Wellhead Package', 'Pricing', 255000, 'Wellhead equipment package for Q2 Eagle Ford drilling program'),
      (1, 2, 'COP South Texas Expansion', 'Visited', 180000, 'Equipment for 3 new Eagle Ford wells'),
      (1, 3, 'Marathon MSA Renewal', 'MSA', 320000, 'Annual MSA renewal with expanded scope'),
      (1, 4, 'Murphy Oil New Program', 'Contacted', 95000, 'Initial contact for Karnes County program'),
      (1, 5, 'Callon Completions Fleet', 'Won', 415000, 'Full completions fleet deployment for DeWitt County'),
      (1, 6, 'Pioneer Eagle Ford Push', 'Identified', 175000, 'Pressure control equipment for Dimmit County wells'),
      (1, 7, 'SM Energy Rental Expansion', 'Contacted', 110000, 'Rental expansion for SM Energy EF program')
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO msa_status (company_id, operator_id, status, signed_date, expiry_date, notes) VALUES
      (1, 1, 'Active', '2023-01-15', '2026-01-15', 'Renewed annually, strong relationship'),
      (1, 2, 'Active', '2022-06-01', '2025-06-01', 'Up for renewal in June'),
      (1, 3, 'In Review', NULL, NULL, 'Legal review in progress'),
      (1, 4, 'Not Started', NULL, NULL, 'Initial discussions only'),
      (1, 5, 'Active', '2023-03-20', '2026-03-20', 'Solid agreement in place'),
      (1, 6, 'In Progress', NULL, NULL, 'Sending draft MSA this week'),
      (1, 7, 'Not Started', NULL, NULL, 'No MSA initiated yet')
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO sales_logs (company_id, user_id, operator_id, log_date, contact_method, notes, competitor_equipment, next_steps) VALUES
      (1, 2, 1, CURRENT_DATE - 1, 'Phone Call', 'Discussed Q2 wellhead needs. Positive response to our pricing.', 'BJ Services - 2 units on site', 'Send formal proposal by Friday'),
      (1, 2, 2, CURRENT_DATE - 2, 'Site Visit', 'Toured Karnes County operations. Met with completions team.', 'None observed', 'Schedule follow-up with procurement'),
      (1, 2, 3, CURRENT_DATE - 3, 'Email', 'MSA renewal documentation sent to legal.', 'N/A', 'Await legal review response'),
      (1, 3, 5, CURRENT_DATE - 1, 'Meeting', 'Executive meeting on fleet expansion. Very engaged.', 'Legacy equipment - older models', 'Prepare fleet proposal for 4 additional units'),
      (1, 2, 4, CURRENT_DATE - 5, 'Site Visit', 'Visited Murphy Karnes County pad. Good rapport with company man.', 'None', 'Follow up on pricing next week')
    ON CONFLICT DO NOTHING;
  `);

  console.log('Seed data inserted successfully');
}

export async function seedRigs() {
  const seedPath = join(__dirname, 'seeds', 'rigs_2026.json');
  if (!existsSync(seedPath)) { console.log('No rig seed file found, skipping.'); return; }

  const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM rigs WHERE company_id = 1`);
  if (parseInt(countRows[0].count) >= 100) { console.log('Rigs already seeded, skipping.'); return; }

  console.log('Seeding rigs from rigs_2026.json...');
  const rigs = JSON.parse(readFileSync(seedPath, 'utf8'));

  const { rows: territories } = await pool.query(`SELECT id, slug FROM territories WHERE company_id = 1`);
  const slugToId = {};
  for (const t of territories) slugToId[t.slug] = t.id;

  const { rows: operators } = await pool.query(`SELECT id, UPPER(name) as uname FROM operators WHERE company_id = 1`);
  const opNameToId = {};
  for (const o of operators) opNameToId[o.uname] = o.id;

  function matchOperator(rawName) {
    if (!rawName) return null;
    const key = rawName.toUpperCase().trim();
    if (opNameToId[key]) return opNameToId[key];
    for (const [storedName, id] of Object.entries(opNameToId)) {
      const keyWords = key.split(/\s+/).filter(w => w.length > 3);
      const storedWords = storedName.split(/\s+/).filter(w => w.length > 3);
      const overlap = keyWords.filter(w => storedWords.some(sw => sw.includes(w) || w.includes(sw)));
      if (overlap.length > 0 && overlap.length >= Math.min(keyWords.length, storedWords.length)) return id;
    }
    return null;
  }

  let inserted = 0, skipped = 0;
  for (const rig of rigs) {
    const territoryId = slugToId[rig.territory_slug] || null;
    const operatorId = matchOperator(rig.operator_name_raw);

    try {
      await pool.query(`
        INSERT INTO rigs (
          company_id, operator_id, rig_name, contractor, basin, county, state,
          latitude, longitude, spud_date, status, territory_id,
          formation, well_type, drill_type, api_number, permit_number, land_offshore,
          operator_name_display, week_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_DATE)
      `, [
        1, operatorId, rig.rig_name, rig.contractor, rig.basin, rig.county, rig.state,
        rig.latitude, rig.longitude, rig.spud_date, rig.status, territoryId,
        rig.formation || null, rig.well_type || null, rig.drill_type || null,
        rig.api_number || null, rig.permit_number || null, rig.land_offshore || 'LAND',
        rig.operator_name_raw || null
      ]);
      inserted++;
    } catch (err) {
      skipped++;
    }
  }
  console.log(`Rigs seeded: ${inserted} inserted, ${skipped} skipped`);
}
