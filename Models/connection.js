const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PSWD,
  database: process.env.DB_NAME,
  port: "3306"
});

connection.connect((err)=>console.log(err || 'Database Connection Established'))

module.exports = connection;