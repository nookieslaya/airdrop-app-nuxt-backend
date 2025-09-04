const express = require('express')
const router = express.Router()
const db = require('../db') // ścieżka prawidłowa jeśli db.js jest katalog wyżej

router.get('/db-status', (req, res) => {
	res.json({
		allConnections: db._allConnections.length,
		freeConnections: db._freeConnections.length,
		activeConnections: db._allConnections.length - db._freeConnections.length,
		queueLength: db._connectionQueue.length,
	})
})

module.exports = router
