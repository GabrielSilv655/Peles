const { DataTypes } = require('sequelize');
const sequelize = require('../config');

const Subject = sequelize.define('Subjects', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  description: DataTypes.TEXT
}, {
  tableName: 'subjects',
  timestamps: false
});

module.exports = Subject; 