const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const hpp = require('hpp')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1)

// 🔒 Bezpieczne nagłówki
app.use(helmet())

// 🔒 Anti-parameter-pollution
app.use(hpp())

// 🔒 Limity payloadów
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// 🔒 CORS z whitelistą + fallback w DEV
const allowedOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map(s => s.trim())
	.filter(Boolean)

app.use(
	cors({
		credentials: true,
		origin: (origin, cb) => {
			// Brak origin (np. curl/postman) → wpuszczamy
			if (!origin) return cb(null, true)

			// DEV fallback: jeśli nie ustawiono whitelisty, wpuszczamy wszystko
			if (allowedOrigins.length === 0) return cb(null, true)

			// Produkcja: tylko domeny z ENV
			if (allowedOrigins.includes(origin)) return cb(null, true)

			return cb(new Error('Not allowed by CORS'), false)
		},
	})
)

// 🌍 Globalny limiter
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000, // 15 min
		max: 100, // max 100 req/IP
		standardHeaders: true,
		legacyHeaders: false,
	})
)

// 🐢 Spowalnianie spamerów (zgodnie z express-slow-down v2)
app.use(
	slowDown({
		windowMs: 15 * 60 * 1000,
		delayAfter: 30,
		delayMs: () => 250, // stałe 250 ms po przekroczeniu limitu
		validate: { delayMs: false }, // wyłącza warningi w logach
	})
)

// === ROUTES ===
app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/links'))
app.use('/api', require('./routes/projects'))
app.use('/api', require('./routes/airdrops'))
app.use('/api', require('./routes/db-status'))

// ❗ Fallback 404 (Express 5 — bez '/api/*')
app.use('/api', (req, res) => {
	return res.status(404).json({ error: 'Not found' })
})

// 🌍 Globalny handler błędów
app.use((err, req, res, next) => {
	console.error(err)
	res.status(500).json({ error: 'Internal server error' })
})

// 🚀 Start
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API działa na :${PORT}`))
