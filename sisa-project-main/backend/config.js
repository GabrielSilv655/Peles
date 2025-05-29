const { Sequelize } = require("sequelize");
require("dotenv").config();
//maconha
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("As variáveis de ambiente do banco de dados não estão definidas corretamente");
  throw new Error("Falta configuração do banco de dados no arquivo .env");
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  logging: false,
  define: {
    timestamps: true
  },
  pool: {
    max: 5, // Maximum number of connections
    min: 0, // Minimum number of connections
    acquire: 30000, // Maximum time (ms) to acquire a connection
    idle: 10000 // Maximum time (ms) a connection can be idle
  }
});

const connectWithRetry = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("Conexão com o banco de dados estabelecida com sucesso.");
      await sequelize.sync();
      return;
    } catch (error) {
      console.error(`Erro ao conectar ao banco de dados (tentativa ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        throw new Error("Falha ao conectar ao banco de dados após várias tentativas.");
      }
      await new Promise(res => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }
};

connectWithRetry();

module.exports = sequelize;