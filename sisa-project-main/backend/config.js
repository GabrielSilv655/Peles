const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    define: {
      timestamps: true
    }
  }
);

// Melhor tratamento de erros
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso');
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados com sucesso');
  } catch (err) {
    console.error('Erro na inicialização do banco:', err);
    process.exit(1); // Encerra a aplicação em caso de erro crítico
  }
};

initDB();

module.exports = sequelize;
