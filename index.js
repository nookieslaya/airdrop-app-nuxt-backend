const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const app = express()
app.set('trust proxy', 1)

// lekkie nagłówki bezpieczeństwa – nie rusza tras
app.use(helmet())

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

app.use(express.json())

app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/links'))
app.use('/api', require('./routes/projects'))
app.use('/api', require('./routes/airdrops'))
app.use('/api', require('./routes/db-status'))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API działa na :${PORT}`))
