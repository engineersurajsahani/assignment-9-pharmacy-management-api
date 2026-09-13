require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Pharmacy API is running' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
