const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const v1Routes = require('./routes/v1');
const { apiRateLimiter } = require('./middleware/rateLimit');
const { apiVersion } = require('./middleware/apiVersion');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const frontendPath = path.join(__dirname, '../../frontend');

app.use(helmet({
  contentSecurityPolicy: env.nodeEnv === 'test' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Darts Manager API',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Darts Tournament Manager API',
      version: 'v1',
      docs: '/docs',
      health: '/api/v1/health',
    },
    meta: null,
    error: null,
  });
});

app.use('/api/v1', apiRateLimiter, apiVersion, v1Routes);

if (env.nodeEnv !== 'test') {
  app.use(express.static(frontendPath));

  app.get('/', (req, res) => {
    res.redirect('/login.html');
  });
}

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
    console.log(`Documentación API: http://localhost:${env.port}/docs`);
  });
}

module.exports = app;
