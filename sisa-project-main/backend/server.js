const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const studentsRoutes = require("./routes/studentsRoute");
const subjectRoutes = require("./routes/subjectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const http = require('http');
const https = require('https');
const fs = require('fs');

dotenv.config();
const app = express();

const PORT_HTTP = process.env.PORT || 5000;
const PORT_HTTPS = process.env.HTTPS_PORT || 5001;

let useHttps = true;
let options = {};

try {
  const key = fs.readFileSync('./cert/key.pem');
  const cert = fs.readFileSync('./cert/cert.pem');
  options = { key, cert };
} catch (err) {
  console.error("Certificate files not found. Falling back to HTTP mode.");
  useHttps = false;
}

if (process.env.NODE_ENV === 'production') {
  // Force HTTP mode in production
  useHttps = true;
  app.listen(PORT_HTTP, () => {
    console.log(`Server running in production at http://localhost:${PORT_HTTP}`);
  });
} else {
  // Em desenvolvimento, usamos HTTPS local com certificados autoassinados
  if (useHttps) {
    https.createServer(options, app).listen(PORT_HTTPS, () => {
      console.log(`Dev server running at https://localhost:${PORT_HTTPS}`);
    });
  } else {
    app.listen(PORT_HTTP, () => {
      console.log(`Dev server running at http://localhost:${PORT_HTTP}`);
    });
  }
}

// Configuração CORS mais detalhada
app.use(cors({
  origin: ['https://localhost:3000', 'https://127.0.0.1:3000', 'https://amused-friendship-production.up.railway.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json({ limit: "10mb" }));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/documents", documentRoutes);

app.get("/", (req, res) => {
  res.send("SISA API is running.");
});

// Rota de teste
app.get("/api/test", (req, res) => {
  res.json({ message: "API está funcionando!" });
});

app.get("/api", (req, res) => {
  res.json({ message: "Bem-vindo à API do SISA. Use /api/test para verificar o funcionamento." });
});

const PORT = process.env.PORT || 5000;

// Função para tentar iniciar o servidor em diferentes portas
const startServer = (port) => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API URL: https://localhost:${port}/api`);
    console.log(`Test URL: https://localhost:${port}/api/test`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${port} em uso, tentando porta ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Erro ao iniciar o servidor:', err);
    }
  });
};

app.use((err, req, res, next) => {
  console.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    requestPath: req.path,
    requestBody: req.body
  });
  res.status(500).json({ error: "Erro interno do servidor" });
});
