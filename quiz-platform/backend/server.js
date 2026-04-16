require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'quiz.html'));
});

app.use('/api', authRoutes);
app.use('/api', quizRoutes);
app.use('/admin/api', adminRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Shadow AI Quiz Platform' });
});

app.listen(PORT, () => {
  console.log(`Quiz platform running on http://localhost:${PORT}`);
});

module.exports = app;
