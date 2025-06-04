const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const studentsRoutes = require("./routes/studentsRoute");
const subjectRoutes = require("./routes/subjectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const documentTemplateRoutes = require("./routes/documentTemplateRoutes");
const summaryDataRoutes = require("./routes/summaryDataRoutes");
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Sequelize } = require("sequelize");
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
require("dotenv").config();
const sequelize = require("./config");

const connectWithRetry = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("Database connection established successfully.");
      await sequelize.sync();
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt === retries) {
        throw new Error("Failed to connect to database after multiple attempts");
      }
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      await new Promise(res => setTimeout(res, Math.min(1000 * Math.pow(2, attempt + 1), 30000)));
    }
  }
  return false;
}

const app = express();

const PORT = process.env.PORT || 8080; // Updated default port

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configuração CORS mais detalhada
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: ['https://sisa-project.up.railway.app'], // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
} else {  
  app.use(cors({
    origin: ['http://localhost:3000'], // Local frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
}

app.use(bodyParser.json({ limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/templates", documentTemplateRoutes);
app.use("/api/summary_data", summaryDataRoutes);

app.get("/", (req, res) => {
  res.send("SISA API is running.");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API está funcionando!" });
});

// Update server startup section
if (process.env.NODE_ENV === 'production') {
  connectWithRetry()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running in production on port ${PORT}`);
      });
    })
    .catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
} else {
  // Development setup with HTTPS
  connectWithRetry()
    .then(() => {
      try {
        const key = fs.readFileSync('./cert/key.pem');
        const cert = fs.readFileSync('./cert/cert.pem');
        
        https.createServer({ key, cert }, app).listen(PORT, () => {
          console.log(`Dev server running at https://localhost:${PORT}`);
        });
      } catch (error) {
        console.log('SSL certificates not found, falling back to HTTP');
        app.listen(PORT, () => {
          console.log(`Dev server running at http://localhost:${PORT}`);
        });
      }
    })
    .catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

