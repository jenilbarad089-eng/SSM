const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Smart Society Management System API active' });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log('==========================================================');
  console.log(` Smart Society Management System Express Server Started!`);
  console.log(` Server listening at: http://localhost:${PORT}/`);
  console.log(` Access Role Dashboards at http://localhost:${PORT}/index.html`);
  console.log('==========================================================');
});
