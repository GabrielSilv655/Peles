const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// ...existing code (rotas, middlewares, etc)...

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
