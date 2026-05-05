import { useState, useMemo } from 'react'
import { Plus, Trash2, CheckSquare, Square, Clock, AlertCircle, ChevronDown, X, Calendar, Edit3, Check } from 'lucide-react'

const STATUSES  = ['Pending', 'In Progress', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High']

const STATUS_STYLE = {
  'Pending':     { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' },
  'In Progress': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)'  },
  'Done':        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)'   },
}
const PRIORITY_STYLE = {
  'Low':    { color: '#64748b', dot: '#64748b' },
  'Medium': { color: '#eab308', dot: '#eab308' },
  'High':   { color: '#ef4444', dot: '#ef4444' },
}

function getDaysInfo(startDate, endDate) {
  const now  = new Date(); now.setHours(0,0,0,0)
  const end  = endDate  ? new Date(endDate)  : null
  const start = startDate ? new Date(startDate) : null
  if (!end) return null
  const diff = Math.round((end - now) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: '#ef4444' }
  if (diff === 0) return { label: 'Due today',                 color: '#f97316' }
  if (diff <= 3)  return { label: `${diff}d left`,             color: '#eab308' }
  return              { label: `${diff}d left`,             color: '#22c55e' }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

const inputStyle = {
  background: '#0d1117', border: '1px solid #1e2533', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: '#d1d5db', outline: 'none',
  width: '100%', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'block' }

function AddTodoModal({ onClose, onAdd, editing }) {
  const [title,       setTitle]       = useState(editing?.title       || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [startDate,   setStartDate]   = useState(editing?.startDate   || '')
  const [endDate,     setEndDate]     = useState(editing?.endDate     || '')
  const [status,      setStatus]      = useState(editing?.status      || 'Pending')
  const [priority,    setPriority]    = useState(editing?.priority    || 'Medium')

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), description: description.trim(), startDate, endDate, status, priority })
    onClose()
  }

  const selStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111620', border: '1px solid #1e2533', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f0f4ff' }}>{editing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Task Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title..." style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={selStyle}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selStyle}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #1e2533', borderRadius: 9, color: '#8b95a8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim()} style={{ padding: '9px 20px', background: title.trim() ? '#4f8ff7' : '#1e2533', border: 'none', borderRadius: 9, color: title.trim() ? '#fff' : '#4a5568', fontSize: 13, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s' }}>
            {editing ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Todo({ todos, onAdd, onUpdate, onDelete }) {
  const [showModal,   setShowModal]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const filtered = useMemo(() => {
    let list = [...todos]
    if (filterStatus)   list = list.filter((t) => t.status   === filterStatus)
    if (filterPriority) list = list.filter((t) => t.priority === filterPriority)
    // Sort: Pending → In Progress → Done, then by endDate
    const order = { 'Pending': 0, 'In Progress': 1, 'Done': 2 }
    list.sort((a, b) => {
      const od = (order[a.status] ?? 0) - (order[b.status] ?? 0)
      if (od !== 0) return od
      if (a.endDate && b.endDate) return a.endDate < b.endDate ? -1 : 1
      return 0
    })
    return list
  }, [todos, filterStatus, filterPriority])

  const counts = useMemo(() => ({
    total:      todos.length,
    pending:    todos.filter((t) => t.status === 'Pending').length,
    inProgress: todos.filter((t) => t.status === 'In Progress').length,
    done:       todos.filter((t) => t.status === 'Done').length,
  }), [todos])

  const handleAdd = (data) => {
    if (editing) {
      onUpdate(editing.id, data)
      setEditing(null)
    } else {
      onAdd({ ...data, id: Date.now().toString(), createdAt: new Date().toISOString().split('T')[0] })
    }
  }

  const cycleStatus = (todo) => {
    const idx  = STATUSES.indexOf(todo.status)
    const next = STATUSES[(idx + 1) % STATUSES.length]
    onUpdate(todo.id, { status: next })
  }

  const selStyle = {
    background: '#0d1117', border: '1px solid #1e2533', borderRadius: 8,
    padding: '7px 10px', fontSize: 12, color: '#8b95a8', outline: 'none',
    cursor: 'pointer', appearance: 'none', fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', margin: 0 }}>Task List</h1>
          <p style={{ fontSize: 13, color: '#4a5568', margin: '4px 0 0' }}>{counts.total} tasks · {counts.done} completed</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#4f8ff7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(79,143,247,0.3)' }}
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pending',     count: counts.pending,    color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
          { label: 'In Progress', count: counts.inProgress, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
          { label: 'Done',        count: counts.done,       color: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
        ].map(({ label, count, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
            <div style={{ fontSize: 12, color: '#8b95a8', fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#111620', border: '1px solid #1e2533', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={selStyle}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filterStatus || filterPriority) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority('') }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <X size={12} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a5568' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#111620', border: '1px solid #1e2533', borderRadius: 12, padding: '48px', textAlign: 'center', color: '#4a5568' }}>
            <CheckSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, color: '#8b95a8', marginBottom: 4 }}>No tasks found</div>
            <div style={{ fontSize: 12 }}>Click "New Task" to add one</div>
          </div>
        ) : (
          filtered.map((todo) => {
            const ss = STATUS_STYLE[todo.status] || STATUS_STYLE['Pending']
            const ps = PRIORITY_STYLE[todo.priority] || PRIORITY_STYLE['Medium']
            const days = getDaysInfo(todo.startDate, todo.endDate)
            const isDone = todo.status === 'Done'

            return (
              <div
                key={todo.id}
                style={{
                  background: '#111620', border: '1px solid #1e2533', borderRadius: 12,
                  padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start',
                  opacity: isDone ? 0.65 : 1, transition: 'opacity 0.2s',
                }}
              >
                {/* Status toggle button */}
                <button
                  onClick={() => cycleStatus(todo)}
                  title={`Click to advance: ${todo.status} →`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 2, color: ss.color, flexShrink: 0 }}
                >
                  {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isDone ? '#4a5568' : '#d1d5db', textDecoration: isDone ? 'line-through' : 'none', flex: 1, minWidth: 0 }}>
                      {todo.title}
                    </span>
                    {/* Priority dot */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: ps.color, flexShrink: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ps.dot, display: 'inline-block' }} />
                      {todo.priority}
                    </span>
                  </div>

                  {todo.description && (
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>{todo.description}</p>
                  )}

                  {/* Dates + status + overdue */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {(todo.startDate || todo.endDate) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4a5568' }}>
                        <Calendar size={11} />
                        {todo.startDate && <span>{fmtDate(todo.startDate)}</span>}
                        {todo.startDate && todo.endDate && <span>→</span>}
                        {todo.endDate   && <span>{fmtDate(todo.endDate)}</span>}
                      </div>
                    )}
                    {days && !isDone && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: days.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} />{days.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 6, padding: '2px 8px' }}>
                      {todo.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditing(todo); setShowModal(true) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', padding: 5, borderRadius: 6, display: 'flex', transition: 'color 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#4f8ff7'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#4a5568'}
                    title="Edit task"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Delete "${todo.title}"?`)) onDelete(todo.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', padding: 5, borderRadius: 6, display: 'flex', transition: 'color 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#4a5568'}
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <AddTodoModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onAdd={handleAdd}
          editing={editing}
        />
      )}
    </div>
  )
}
