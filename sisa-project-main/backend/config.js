const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
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
});

// Testar conexão e sincronizar
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com banco estabelecida com sucesso.');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Modelos sincronizados com sucesso.');
  })
  .catch(err => {
    console.error('Erro ao conectar/sincronizar o banco de dados:', err);
  });