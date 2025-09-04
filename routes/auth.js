const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

router.post('/register', async (req, res) => {
	const { name, email, password } = req.body
	if (!name || !email || !password) return res.status(400).json({ error: 'Wszystkie pola są wymagane!' })

	db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		if (results.length > 0) return res.status(409).json({ error: 'Użytkownik o tym email już istnieje.' })

		const hashedPassword = await bcrypt.hash(password, 10)
		db.query(
			'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
			[name, email, hashedPassword],
			(err, result) => {
				if (err) return res.status(500).json({ error: err.message })
				res.json({ success: true, message: 'Użytkownik zarejestrowany!' })
			}
		)
	})
})

router.post('/login', (req, res) => {
	const { email, password } = req.body
	if (!email || !password) return res.status(400).json({ error: 'Email i hasło są wymagane!' })

	db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		if (results.length === 0) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło.' })

		const user = results[0]
		const isMatch = await bcrypt.compare(password, user.password)
		if (!isMatch) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło.' })

		const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1d' })
		res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
	})
})

module.exports = router
