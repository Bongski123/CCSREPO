const mysql = require('mysql2/promise');
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'ncfrepo_new',


});
  
//Database Notify
db.getConnection((err) =>  {

  if (err) {
      console.error('Error connecting to MySQL:', err);

  }else {
      console.log('Connected to  MySQL');
  }
});


  module.exports = db;



