const express = require('express')
const rateLimit = require('express-rate-limit')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

// 🔐 Limiter prób logowania: 10 prób / 10 min z jednego IP
const loginLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Za dużo prób logowania. Spróbuj ponownie za kilka minut.' },
	skipSuccessfulRequests: true, // nie licz udanych logowań
})

// 🔐 Limiter rejestracji: 5 prób / 60 min z jednego IP
const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie później.' },
	skipSuccessfulRequests: true,
})

// 🔎 Prosta walidacja (lekka ochrona przed pustymi/zbyt długimi polami)
const isValidEmail = email => typeof email === 'string' && email.length <= 254 && /\S+@\S+\.\S+/.test(email)
const isValidPassword = pwd => typeof pwd === 'string' && pwd.length >= 6 && pwd.length <= 100
const isValidName = name => typeof name === 'string' && name.trim().length >= 2 && name.length <= 100

router.post('/register', registerLimiter, async (req, res) => {
	try {
		const { name, email, password } = req.body
		if (!isValidName(name) || !isValidEmail(email) || !isValidPassword(password)) {
			return res.status(400).json({ error: 'Nieprawidłowe dane rejestracji.' })
		}

		db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
			if (err) return res.status(500).json({ error: err.message })
			if (results.length > 0) return res.status(409).json({ error: 'Użytkownik o tym email już istnieje.' })

			const hashedPassword = await bcrypt.hash(password, 10)
			db.query(
				'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
				[name.trim(), email, hashedPassword],
				err2 => {
					if (err2) return res.status(500).json({ error: err2.message })
					res.json({ success: true, message: 'Użytkownik zarejestrowany!' })
				}
			)
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: 'Internal server error' })
	}
})

router.post('/login', loginLimiter, (req, res) => {
	try {
		const { email, password } = req.body
		if (!isValidEmail(email) || !isValidPassword(password)) {
			return res.status(400).json({ error: 'Email i hasło są wymagane i muszą być prawidłowe.' })
		}
		if (!JWT_SECRET) {
			return res.status(500).json({ error: 'Brak JWT_SECRET w konfiguracji serwera.' })
		}

		db.query('SELECT id, name, email, password FROM users WHERE email = ?', [email], async (err, results) => {
			if (err) return res.status(500).json({ error: err.message })
			if (results.length === 0) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło.' })

			const user = results[0]
			const isMatch = await bcrypt.compare(password, user.password)
			if (!isMatch) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło.' })

			const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1d' })

			res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: 'Internal server error' })
	}
})

module.exports = router
