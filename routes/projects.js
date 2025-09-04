const express = require('express')
const router = express.Router()
const db = require('../db')
const jwt = require('jsonwebtoken')

// Middleware autoryzacji
function authMiddleware(req, res, next) {
	const auth = req.headers.authorization
	if (!auth) return res.status(401).json({ error: 'Brak tokena' })
	try {
		req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
		next()
	} catch {
		res.status(401).json({ error: 'Nieprawidłowy token' })
	}
}

// Pobierz projekty zalogowanego użytkownika
router.get('/projects', authMiddleware, (req, res) => {
	db.query('SELECT * FROM projects WHERE user_id = ?', [req.user.id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json(results)
	})
})

// Dodaj projekt
router.post('/projects', authMiddleware, (req, res) => {
	const { name, image, description, link, extra } = req.body
	if (!name || !image) return res.status(400).json({ error: 'Brak danych' })
	db.query(
		'INSERT INTO projects (user_id, name, image, description, link, extra_info) VALUES (?, ?, ?, ?, ?, ?)',
		[req.user.id, name, image, description, link, extra],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ id: result.insertId, name, image, description, link, extra })
		}
	)
})

router.delete('/projects/:id', authMiddleware, (req, res) => {
	const projectId = req.params.id
	db.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, req.user.id], (err, result) => {
		if (err) return res.status(500).json({ error: err.message })
		if (result.affectedRows === 0) {
			return res.status(404).json({ error: 'Projekt nie znaleziony lub brak uprawnień' })
		}
		res.json({ success: true })
	})
})

module.exports = router
