import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Edit2, Check, X, RefreshCw, Users } from 'lucide-react'

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID

const ROLE_COLORS = [
  '#4f8ff7', '#f59e0b', '#10b981', '#f85149', '#a78bfa',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#d946ef', '#fbbf24', '#fb7185', '#34d399', '#60a5fa',
]

function PieChart({ data }) {
  const [hovered, setHovered] = useState(null)
  if (!data || data.length === 0) return null

  const total = data.reduce((s, d) => s + d.count, 0)
  const cx = 75, cy = 75, r = 60, innerR = 30

  let angle = -90
  const slices = data.slice(0, 12).map((item, i) => {
    const sweep = (item.count / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...item, start, end, color: ROLE_COLORS[i % ROLE_COLORS.length], pct: Math.round((item.count / total) * 100) }
  })

  function toXY(deg) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function innerXY(deg) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + innerR * Math.cos(rad), y: cy + innerR * Math.sin(rad) }
  }

  function arcPath(start, end) {
    if (end - start >= 359.9) {
      const a = toXY(start)
      const b = toXY(start + 180)
      const ia = innerXY(start)
      const ib = innerXY(start + 180)
      return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y} Z`
        + ` M ${ia.x} ${ia.y} A ${innerR} ${innerR} 0 1 0 ${ib.x} ${ib.y} A ${innerR} ${innerR} 0 1 0 ${ia.x} ${ia.y} Z`
    }
    const s = toXY(start), e = toXY(end)
    const is_ = innerXY(start), ie = innerXY(end)
    const large = end - start > 180 ? 1 : 0
    return `M ${is_.x} ${is_.y} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y} Z`
  }

  const hov = hovered !== null ? slices[hovered] : null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="150" height="150" viewBox="0 0 150 150">
          {slices.map((s, i) => (
            <path
              key={i}
              d={arcPath(s.start, s.end)}
              fill={s.color}
              stroke="#111620"
              strokeWidth="1.5"
              style={{ cursor: 'pointer', opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {hov ? (
            <>
              <text x="75" y="70" textAnchor="middle" fontSize="11" fill="#e6edf3" fontWeight="600">{hov.pct}%</text>
              <text x="75" y="84" textAnchor="middle" fontSize="9" fill="#8b949e">{hov.count} cand.</text>
            </>
          ) : (
            <>
              <text x="75" y="70" textAnchor="middle" fontSize="13" fill="#e6edf3" fontWeight="700">{total}</text>
              <text x="75" y="84" textAnchor="middle" fontSize="9" fill="#8b949e">total</text>
            </>
          )}
        </svg>
      </div>
      <div className="w-full flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
        {slices.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs cursor-default rounded px-1 py-0.5 transition-colors"
            style={{ background: hovered === i ? '#1e2533' : 'transparent' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="truncate flex-1" style={{ color: '#c9d1d9' }}>{s.role || 'Unknown'}</span>
            <span className="flex-shrink-0 font-mono" style={{ color: '#8b949e' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CandidateDatabase({ accessToken, onRequestToken }) {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [savingRow, setSavingRow] = useState(null)
  const [error, setError] = useState('')
  const tableRef = useRef(null)
  const topScrollRef = useRef(null)
  const [tableContentWidth, setTableContentWidth] = useState(0)
  const syncing = useRef(false)

  useEffect(() => {
    if (!tableRef.current) return
    const obs = new ResizeObserver(() => {
      const tbl = tableRef.current?.querySelector('table')
      if (tbl) setTableContentWidth(tbl.scrollWidth)
    })
    obs.observe(tableRef.current)
    return () => obs.disconnect()
  }, [candidates])

  const syncFromTop = () => {
    if (syncing.current || !tableRef.current) return
    syncing.current = true
    tableRef.current.scrollLeft = topScrollRef.current.scrollLeft
    syncing.current = false
  }
  const syncFromTable = () => {
    if (syncing.current || !topScrollRef.current) return
    syncing.current = true
    topScrollRef.current.scrollLeft = tableRef.current.scrollLeft
    syncing.current = false
  }

  const fetchCandidates = useCallback(async (token) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Candidates!A:I`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 401) { setError('Session expired. Please re-authenticate.'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const rows = json.values || []
      const data = rows.slice(2).map((row, i) => ({
        sheetRow: i + 3,
        timestamp: row[0] || '',
        name: row[1] || '',
        contact: row[2] || '',
        email: row[3] || '',
        role: row[4] || '',
        experience: row[5] || '',
        education: row[6] || '',
        location: row[7] || '',
        notes: row[8] || '',
      }))
      setCandidates(data)
    } catch (e) {
      setError('Failed to load candidates.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (accessToken) fetchCandidates(accessToken)
  }, [accessToken, fetchCandidates])

  const filtered = candidates.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.contact.includes(q)
    )
  })

  const roleData = Object.entries(
    candidates.reduce((acc, c) => {
      const role = (c.role || '').trim() || 'Unknown'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})
  )
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)

  const saveNote = async (candidate, newNote) => {
    if (!accessToken) return
    setSavingRow(candidate.sheetRow)
    setError('')
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Candidates!I${candidate.sheetRow}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [[newNote]] }),
        }
      )
      if (!res.ok) throw new Error('Save failed')
      setCandidates(prev =>
        prev.map(c => c.sheetRow === candidate.sheetRow ? { ...c, notes: newNote } : c)
      )
      setEditingNote(null)
    } catch {
      setError('Failed to save note. Try again.')
    } finally {
      setSavingRow(null)
    }
  }

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#8b949e',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #1e2533',
    background: '#111620',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  }

  const tdStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid #161b22',
    color: '#c9d1d9',
    fontSize: '13px',
    verticalAlign: 'top',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 49px)', padding: '16px', gap: '16px' }}>

      {/* Top bar: search + pie chart */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Left: title + search + count */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: '#e6edf3', fontWeight: '700', fontSize: '18px', marginBottom: '12px' }}>
            Candidate Database
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', maxWidth: '380px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#8b949e' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, role, location, email…"
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  background: '#111620',
                  border: '1px solid #1e2533',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  fontSize: '13px',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#4f8ff7')}
                onBlur={e => (e.target.style.borderColor = '#1e2533')}
              />
            </div>

            {/* Result count */}
            <div style={{ fontSize: '13px', color: '#8b949e', whiteSpace: 'nowrap' }}>
              {search.trim() ? (
                <>
                  <span style={{ color: '#4f8ff7', fontWeight: '700' }}>{filtered.length}</span>
                  {' '}result{filtered.length !== 1 ? 's' : ''} found
                </>
              ) : (
                <>
                  <span style={{ color: '#4f8ff7', fontWeight: '700' }}>{candidates.length}</span>
                  {' '}candidate{candidates.length !== 1 ? 's' : ''}
                </>
              )}
            </div>

            <button
              onClick={() => accessToken ? fetchCandidates(accessToken) : onRequestToken()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', background: '#1e2533', border: '1px solid #2d3748',
                borderRadius: '8px', color: '#c9d1d9', fontSize: '12px', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2d3748')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1e2533')}
            >
              <RefreshCw style={{ width: '13px', height: '13px' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Right: Pie chart */}
        <div style={{
          flexShrink: 0,
          background: '#111620',
          border: '1px solid #1e2533',
          borderRadius: '14px',
          padding: '14px',
          minWidth: '200px',
          maxWidth: '220px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Users style={{ width: '13px', height: '13px', color: '#8b949e' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Role Distribution
            </span>
          </div>
          {roleData.length > 0
            ? <PieChart data={roleData} />
            : <p style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
          }
        </div>
      </div>

      {error && (
        <div style={{ fontSize: '13px', color: '#f85149', background: '#1a0e0e', border: '1px solid #3d1515', borderRadius: '8px', padding: '8px 12px' }}>
          {error}
          {error.includes('expired') && (
            <button
              onClick={onRequestToken}
              style={{ marginLeft: '10px', color: '#4f8ff7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Re-authenticate
            </button>
          )}
        </div>
      )}

      {!accessToken ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p style={{ color: '#8b949e', fontSize: '14px' }}>Sign in with Google to access the candidate database.</p>
          <button
            onClick={onRequestToken}
            style={{
              padding: '9px 20px', background: '#4f8ff7', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Connect Google Account
          </button>
        </div>
      ) : loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8b949e', fontSize: '14px' }}>Loading candidates…</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Top horizontal scrollbar */}
          <div
            ref={topScrollRef}
            onScroll={syncFromTop}
            className="top-scroll"
            style={{ overflowX: 'auto', overflowY: 'hidden', height: '12px', marginBottom: '2px' }}
          >
            <div style={{ width: tableContentWidth, height: '1px' }} />
          </div>

          {/* Table */}
          <div
            ref={tableRef}
            onScroll={syncFromTable}
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'auto',
              border: '1px solid #1e2533',
              borderRadius: '12px',
            }}
          >
            <table style={{ minWidth: '100%', borderCollapse: 'collapse', width: 'max-content' }}>
              <thead>
                <tr>
                  {['#', 'Name', 'Contact', 'Email', 'Role', 'Experience', 'Education', 'Location', 'Notes'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: '#8b949e' }}>
                      {search ? 'No candidates match your search.' : 'No candidates found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, i) => (
                    <tr
                      key={c.sheetRow}
                      style={{ background: i % 2 === 0 ? 'transparent' : '#0f1419' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#151e2d')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#0f1419')}
                    >
                      <td style={{ ...tdStyle, color: '#6e7681', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#e6edf3', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{c.contact}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', whiteSpace: 'nowrap', color: '#8b949e' }}>{c.email}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {c.role && (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            background: '#1e2f4a',
                            color: '#4f8ff7',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            border: '1px solid #2d4875',
                          }}>
                            {c.role}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '220px', minWidth: '140px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', title: c.experience }}>
                          {c.experience}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{c.education}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{c.location}</td>

                      {/* Editable Notes column */}
                      <td style={{ ...tdStyle, minWidth: '220px', maxWidth: '300px' }}>
                        {editingNote?.sheetRow === c.sheetRow ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <textarea
                              autoFocus
                              value={editingNote.value}
                              onChange={e => setEditingNote(prev => ({ ...prev, value: e.target.value }))}
                              rows={3}
                              style={{
                                width: '100%',
                                background: '#0d1117',
                                border: '1px solid #4f8ff7',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                color: '#e6edf3',
                                fontSize: '12px',
                                resize: 'vertical',
                                outline: 'none',
                                fontFamily: 'inherit',
                              }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => saveNote(c, editingNote.value)}
                                disabled={savingRow === c.sheetRow}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  padding: '4px 10px',
                                  background: savingRow === c.sheetRow ? '#2d3748' : '#4f8ff7',
                                  color: 'white', border: 'none', borderRadius: '6px',
                                  fontSize: '11px', cursor: 'pointer', fontWeight: '600',
                                }}
                              >
                                <Check style={{ width: '11px', height: '11px' }} />
                                {savingRow === c.sheetRow ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingNote(null)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  padding: '4px 10px',
                                  background: '#1e2533', color: '#c9d1d9',
                                  border: '1px solid #2d3748', borderRadius: '6px',
                                  fontSize: '11px', cursor: 'pointer',
                                }}
                              >
                                <X style={{ width: '11px', height: '11px' }} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingNote({ sheetRow: c.sheetRow, value: c.notes })}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', cursor: 'pointer', group: true }}
                            title="Click to edit note"
                          >
                            <span style={{
                              flex: 1,
                              fontSize: '12px',
                              color: c.notes ? '#c9d1d9' : '#3d4451',
                              fontStyle: c.notes ? 'normal' : 'italic',
                              lineHeight: '1.5',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {c.notes || 'Click to add note…'}
                            </span>
                            <Edit2 style={{ width: '12px', height: '12px', color: '#3d4451', flexShrink: 0, marginTop: '2px' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#4f8ff7')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#3d4451')}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
