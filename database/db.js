const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'mysql-181872-0.cloudclusters.net',
    user: 'admin',
    password: 'nkGLZXAo',
    database: 'ncfrepo_new',
    port: 10062, // Default MySQL port

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



