const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const studentsRoutes = require("./routes/studentsRoute");
const subjectRoutes = require("./routes/subjectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const http = require('http'); // Usar http para a plataforma

dotenv.config();
const app = express();

// A plataforma fornecerá process.env.PORT
const PORT = process.env.PORT || 5000;

// Configuração CORS
// Certifique-se de adicionar a URL do seu frontend no Render/Railway aqui
app.use(cors({
  origin: [
    'https://localhost:3000', // Para desenvolvimento local
    'https://127.0.0.1:3000', // Para desenvolvimento local
    // Ex: 'https://seu-frontend.onrender.com',
    // process.env.FRONTEND_URL // Ou use uma variável de ambiente
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json({ limit: "10mb" }));

// Log de todas as requisições (opcional, pode ser verboso)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/documents", documentRoutes);

// Rotas básicas
app.get("/", (req, res) => {
  res.send("SISA API is running.");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API está funcionando!" });
});

// Iniciar o servidor HTTP
// A plataforma (Render/Railway) gerencia o HTTPS externamente
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`A aplicação deve estar acessível pela URL da plataforma (HTTPS).`);
  console.log(`Base URL da API: /api`);
  console.log(`Endpoint de teste: /api/test`);
}).on('error', (err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1); // Importante para sinalizar erro à plataforma
});