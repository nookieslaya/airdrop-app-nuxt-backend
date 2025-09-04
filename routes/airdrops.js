// airdrops.js
const express = require('express')
const router = express.Router()
const db = require('../db')
const jwt = require('jsonwebtoken')

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

// Lista airdropów
router.get('/airdrops', authMiddleware, (req, res) => {
	db.query('SELECT * FROM airdrops WHERE user_id = ?', [req.user.id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json(results)
	})
})

// Dodaj nowy airdrop
router.post('/airdrops', authMiddleware, (req, res) => {
	const { title, blocks } = req.body
	if (!title || !blocks) return res.status(400).json({ error: 'Brak danych' })
	db.query(
		'INSERT INTO airdrops (user_id, title, blocks, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
		[req.user.id, title, JSON.stringify(blocks)],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ id: result.insertId, title, blocks })
		}
	)
})

// Pobierz pojedyczny airdrop
router.get('/airdrops/:id', authMiddleware, (req, res) => {
	db.query('SELECT * FROM airdrops WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		if (!results.length) return res.status(404).json({ error: 'Nie znaleziono' })
		res.json(results[0])
	})
})

// Edytuj airdrop
router.put('/airdrops/:id', authMiddleware, (req, res) => {
	const { title, blocks } = req.body
	db.query(
		'UPDATE airdrops SET title = ?, blocks = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
		[title, JSON.stringify(blocks), req.params.id, req.user.id],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ success: true })
		}
	)
})

// Usuń airdrop
router.delete('/airdrops/:id', authMiddleware, (req, res) => {
	db.query('DELETE FROM airdrops WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, result) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json({ success: true })
	})
})

module.exports = router
