require('dotenv').config()

const express = require('express')
const cors    = require('cors')

const app = express()

// Allow any origin — frontend + backend are on same Vercel domain
app.use(cors({ origin: true, credentials: true }))

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})

app.use('/api/candidates', require('../server/routes/candidates'))
app.use('/api/tabs',       require('../server/routes/tabs'))
app.use('/api/drive',      require('../server/routes/drive'))
app.use('/api/data',       require('../server/routes/data'))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    sheet: Boolean(process.env.GOOGLE_SHEET_ID),
    serviceAccount: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
  })
})

app.use((err, _req, res, _next) => {
  console.error('[error]', err.message)
  res.status(500).json({ ok: false, error: err.message })
})

module.exports = app
