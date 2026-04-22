const router = require('express').Router()
const { batchReadAll } = require('../lib/sheets')

// GET /api/data/all — fetches all tabs in one batchGet call
router.get('/all', async (_req, res) => {
  try {
    const data = await batchReadAll()
    res.json({ ok: true, ...data })
  } catch (e) {
    console.error('[data GET /all]', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
})

module.exports = router
