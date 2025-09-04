const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const hpp = require('hpp')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1)

// Bezpieczne nagłówki
app.use(helmet())

// Anti-parameter-pollution
app.use(hpp())

// Limity payloadów
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// CORS z whitelisty
app.use(
	cors({
		origin: (process.env.CORS_ORIGIN || '')
			.split(',')
			.map(s => s.trim())
			.filter(Boolean),
		credentials: true,
	})
)

// Globalny limiter
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 100,
		standardHeaders: true,
		legacyHeaders: false,
	})
)

// Spowalnianie (nowe zachowanie ESD v2: stałe 250 ms po przekroczeniu)
app.use(
	slowDown({
		windowMs: 15 * 60 * 1000,
		delayAfter: 30,
		delayMs: () => 250, // 👈 zgodnie z v2 (usuwa warning)
		validate: { delayMs: false }, // 👈 wyłącza ostrzeżenie walidacyjne w logach
	})
)

// === ROUTES ===
app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/links'))
app.use('/api', require('./routes/projects'))
app.use('/api', require('./routes/airdrops'))
app.use('/api', require('./routes/db-status'))

// ❗ Fallback 404 — Express 5: nie używamy '/api/*', tylko mount na '/api'
app.use('/api', (req, res) => {
	return res.status(404).json({ error: 'Not found' })
})

// Globalny handler błędów
app.use((err, req, res, next) => {
	console.error(err)
	res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API działa na :${PORT}`))
