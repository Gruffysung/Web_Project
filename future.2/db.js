const mysql = require('mysql')

// MySQL connection
const dbConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_mfu',
    port: '3306'
})

dbConnection.connect((err) => {
    if (err) {
        console.log('Error Connection to MySQL database = ', err);
        return;
    }
    console.log('MySQL successfully connected!');
})

module.exports = dbConnection;

