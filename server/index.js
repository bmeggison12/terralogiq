import http from 'http';
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema, seedData, seedRigs } from './db/schema.js';
import authRoutes from './routes/auth.js';
import operatorRoutes from './routes/operators.js';
import contactRoutes from './routes/contacts.js';
import rigRoutes from './routes/rigs.js';
import opportunityRoutes from './routes/opportunities.js';
import salesLogRoutes from './routes/salesLogs.js';
import msaRoutes from './routes/msa.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import fracSiteRoutes from './routes/fracSites.js';
import jobSiteRoutes from './routes/jobSites.js';
import revenuePackageRoutes from './routes/revenuePackages.js';
import activityRoutes from './routes/activities.js';
import territoryRoutes from './routes/territories.js';
import companyRoutes from './routes/company.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

app.use('/api/auth', authRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/rigs', rigRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/sales-logs', salesLogRoutes);
app.use('/api/msa', msaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/frac-sites', fracSiteRoutes);
app.use('/api/job-sites', jobSiteRoutes);
app.use('/api/revenue-packages', revenuePackageRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/company', companyRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function start() {
  try {
    await createSchema();
    await seedData();
    await seedRigs();

    const httpServer = http.createServer(app);

    if (isDev) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server: httpServer }
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, '..', 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
