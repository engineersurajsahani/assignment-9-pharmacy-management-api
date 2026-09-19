const path = require('path');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

const doc = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(doc));
};

module.exports = setupSwagger;
