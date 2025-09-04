const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const slowDown = require('express-slow-down')
const hpp = require('hpp')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1)

//  Bezpieczne nagłówki
app.use(helmet())

//  Blokada param dupes
app.use(hpp())

// 🔒 Limity payloadów
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

//  CORS tylko z zaufanych domen
app.use(
	cors({
		origin:
			(process.env.CORS_ORIGIN || '')
				.split(',')
				.map(s => s.trim())
				.filter(Boolean) || '*',
		credentials: true,
	})
)

//  Globalny limiter (dla całego API)
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000, // 15 min
		max: 100, // 100 req / IP
		standardHeaders: true,
		legacyHeaders: false,
	})
)

//  Globalne spowalnianie „spamerów”
app.use(
	slowDown({
		windowMs: 15 * 60 * 1000,
		delayAfter: 30,
		delayMs: 250,
	})
)

// === ROUTES ===
//  Specjalny limiter do logowania/rejestracji
const authLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 min
	max: 10, // max 10 prób z jednego IP
	message: { error: 'Too many login/register attempts. Try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
})

// Wpinamy limiter TYLKO na trasy auth
app.use('/api/auth/login', authLimiter, require('./routes/auth'))
app.use('/api/auth/register', authLimiter, require('./routes/auth'))

// Reszta tras bez zmian
app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/links'))
app.use('/api', require('./routes/projects'))
app.use('/api', require('./routes/airdrops'))
app.use('/api', require('./routes/db-status'))

// Fallback 404
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }))

// Globalny handler błędów
app.use((err, req, res, next) => {
	console.error(err)
	res.status(500).json({ error: 'Internal server error' })
})

// Start
const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API działa na :${PORT}`))
