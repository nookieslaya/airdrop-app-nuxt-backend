// db.js
const mysql = require('mysql2')
require('dotenv').config()

// Tworzymy pulę połączeń (zalecane!)
const pool = mysql.createPool({
	host: process.env.DB_HOST, // przykład: 'mysql123456.hostinger.pl'
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
	port: process.env.DB_PORT || 3306,
	waitForConnections: true,
	connectionLimit: 10, // Możesz zmienić, jeśli masz dużo zapytań naraz
	queueLimit: 0,
})

// Test połączenia przy starcie (opcjonalnie)
pool.getConnection((err, connection) => {
	if (err) {
		console.error('Błąd połączenia z MySQL:', err.message)
	} else {
		console.log('Połączono z bazą MySQL!')
		connection.release() // Zwracamy połączenie do puli
	}
})

module.exports = pool
