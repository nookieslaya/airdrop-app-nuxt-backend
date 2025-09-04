const express = require('express')
const db = require('../db')
const router = express.Router()
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

router.get('/links', authMiddleware, (req, res) => {
	db.query(
		'SELECT id, title, url, type, note, status, date, additional_links, description FROM links WHERE user_id = ?',
		[req.user.id],
		(err, results) => {
			if (err) return res.status(500).json({ error: err.message })
			// Parsujemy additional_links
			const withParsedLinks = results.map(link => ({
				...link,
				additional_links: link.additional_links ? JSON.parse(link.additional_links) : [],
			}))
			res.json(withParsedLinks)
		}
	)
})
router.post('/links', authMiddleware, (req, res) => {
	const { title, url, type, note, status, date, additional_links, description } = req.body
	if (!title || !url) return res.status(400).json({ error: 'Brak danych' })
	db.query(
		'INSERT INTO links (user_id, title, url, type, note, status, date, additional_links, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[
			req.user.id,
			title,
			url,
			type || 'strona',
			note || '',
			status || 'new',
			date || null,
			JSON.stringify(additional_links || []),
			description || '',
		],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({
				id: result.insertId,
				title,
				url,
				type: type || 'strona',
				note: note || '',
				status: status || 'new',
				date: date || null,
				additional_links: additional_links || [],
				description: description || '',
			})
		}
	)
})

router.delete('/links/:id', (req, res) => {
	const { id } = req.params
	db.query('DELETE FROM links WHERE id = ?', [id], (err, result) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json({ success: true })
	})
})
router.put('/links/:id', (req, res) => {
	const { id } = req.params
	const { url } = req.body
	db.query('UPDATE links SET url = ? WHERE id = ? type = ?', [url, id], (err, result) => {
		// tu masz zły SQL
		if (err) return res.status(500).json({ error: err.message })
		res.json({ success: true })
	})
})
router.patch('/links/:id', authMiddleware, (req, res) => {
	const { id } = req.params
	const { title, url, type, note, status, date, additional_links, description } = req.body
	db.query(
		'UPDATE links SET title = ?, url = ?, type = ?, note = ?, status = ?, date = ?, additional_links = ?, description = ? WHERE id = ? AND user_id = ?',
		[
			title,
			url,
			type || 'strona',
			note || '',
			status || 'new',
			date || null,
			JSON.stringify(additional_links || []),
			description || '',
			id,
			req.user.id,
		],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ success: true })
		}
	)
})

module.exports = router
