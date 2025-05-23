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
const bcrypt = require("bcryptjs");
const User = require("./models/User");

dotenv.config();
const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://seu-frontend.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://nome-do-seu-backend.onrender.com';

app.use(cors({
  origin: [
    FRONTEND_URL,
    BACKEND_URL,
    'http://localhost:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json({ limit: "10mb" }));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
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

const PORT = process.env.PORT || 5000;

// Função para tentar iniciar o servidor em diferentes portas
const startServer = (port) => {
  const portNum = Number(port);
  app.listen(portNum, () => {
    console.log(`Server running on port ${portNum}`);
    console.log(`API URL: https://localhost:${portNum}/api`);
    console.log(`Test URL: https://localhost:${portNum}/api/test`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${portNum} em uso, tentando porta ${portNum + 1}`);
      startServer(portNum + 1);
    } else {
      console.error('Erro ao iniciar o servidor:', err);
    }
  });
};

async function createDefaultAdmin() {
  const adminEmail = "admin@sisa.com";
  const adminPassword = "admin123";
  const adminOccupation = 1; // 1 = Administrador

  const existing = await User.findOne({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: "Administrador",
      email: adminEmail,
      password: hash,
      occupation_id: adminOccupation
    });
    console.log("Usuário admin padrão criado: admin@sisa.com / admin123");
  }
}

createDefaultAdmin();

if (process.env.NODE_ENV === 'production') {
  // Em produção, Render.com já faz HTTPS, então só use HTTP normal
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in production at http://0.0.0.0:${PORT}`);
  });
} else {
  // Em desenvolvimento, usamos HTTPS local com certificados autoassinados
  const key = fs.readFileSync('./cert/key.pem');
  const cert = fs.readFileSync('./cert/cert.pem');

  https.createServer({ key, cert }, app).listen(PORT_HTTPS, () => {
    console.log(`Dev server running at https://localhost:${PORT_HTTPS}`);
  });
}

startServer(PORT_HTTP);
