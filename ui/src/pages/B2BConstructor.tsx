import { useState } from 'react'

const AVAILABLE_MODULES = [
  'inventory', 'pos', 'crm', 'analytics', 'loyalty',
  'kitchen', 'api', 'auth', 'notifications', 'reports',
]

type Step = 1 | 2 | 3 | 4

interface Brief {
  business_type: string
  modules: string[]
  extra_prompt: string
}

interface LogEntry {
  text: string
  type: 'info' | 'success' | 'warn' | 'error' | 'accent'
}

const STEP_LABELS = ['Бизнес', 'Модули', 'Пожелания', 'Запуск']

export default function B2BConstructor() {
  const [step, setStep] = useState<Step>(1)
  const [brief, setBrief] = useState<Brief>({ business_type: '', modules: [], extra_prompt: '' })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const addLog = (text: string, type: LogEntry['type'] = 'info') =>
    setLogs(prev => [...prev, { text, type }])

  const toggleModule = (mod: string) => {
    setBrief(prev => ({
      ...prev,
      modules: prev.modules.includes(mod)
        ? prev.modules.filter(m => m !== mod)
        : [...prev.modules, mod],
    }))
  }

  const next = () => setStep(s => Math.min(s + 1, 4) as Step)
  const back = () => setStep(s => Math.max(s - 1, 1) as Step)

  const launch = async () => {
    setLoading(true)
    setDone(false)
    addLog('🚀 Отправка запроса в Core Mind...', 'accent')

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_type: brief.business_type, modules: brief.modules }),
      })

      if (res.ok) {
        const data = await res.json()
        addLog(`✅ Swarm принял задачу: ${data.message}`, 'success')

        if (brief.extra_prompt) {
          await fetch('/api/v1/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ business_type: brief.business_type, message: brief.extra_prompt }),
          })
          addLog('💬 Дополнительные пожелания отправлены.', 'info')
        }

        // SSE live log stream
        addLog('📡 Подключение к SSE логам...', 'info')
        const evtSource = new EventSource('/api/v1/logs')
        let count = 0
        evtSource.onmessage = e => {
          const msg = e.data as string
          const type = msg.includes('❌') || msg.includes('Error') ? 'error'
            : msg.includes('✅') || msg.includes('Success') ? 'success'
            : msg.includes('⚠️') ? 'warn'
            : msg.includes('🔥') || msg.includes('🚀') ? 'accent'
            : 'info'
          addLog(msg, type)
          count++
          if (count > 40) { evtSource.close(); setDone(true); setLoading(false) }
        }
        evtSource.onerror = () => {
          evtSource.close()
          setDone(true)
          setLoading(false)
          addLog('📡 SSE поток завершён.', 'info')
        }
      } else {
        addLog(`❌ Ошибка API: ${res.status} ${res.statusText}`, 'error')
        setLoading(false)
      }
    } catch (err) {
      addLog(`❌ Core Mind недоступен (localhost:8000). Запустите сервер.`, 'error')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>B2B SaaS Constructor</h2>
        <p>Опиши бизнес — Morph Swarm сгенерирует полноценный SaaS</p>
      </div>

      {/* Wizard Steps */}
      <div className="wizard-steps mb-6">
        {STEP_LABELS.map((label, i) => {
          const num = (i + 1) as Step
          const status = num < step ? 'done' : num === step ? 'active' : 'pending'
          return (
            <div key={num} className="flex items-center gap-2">
              <div className={`wizard-step ${status}`}>
                <div className="wizard-step-num">
                  {status === 'done' ? '✓' : num}
                </div>
                <span className="wizard-step-label">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="wizard-connector" />}
            </div>
          )
        })}
      </div>

      <div className="card animate-in">
        {/* Step 1 — Business Type */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              Какой бизнес разворачиваем?
            </h3>
            <div className="form-group">
              <label className="form-label">Тип бизнеса</label>
              <input
                className="form-input"
                placeholder="Например: Smart Coffee Shop, AI Agency, CRM, Clinic..."
                value={brief.business_type}
                onChange={e => setBrief(b => ({ ...b, business_type: e.target.value }))}
              />
            </div>

            <div className="divider" />
            <p className="text-sm text-muted mb-4">Быстрые пресеты:</p>
            <div className="tag-selector">
              {['Smart Café', 'B2B CRM', 'AI Agency', 'Clinic', 'Restaurant', 'E-commerce'].map(preset => (
                <span
                  key={preset}
                  className={`tag ${brief.business_type === preset ? 'selected' : ''}`}
                  onClick={() => setBrief(b => ({ ...b, business_type: preset }))}
                >{preset}</span>
              ))}
            </div>

            <div className="flex justify-between mt-4" style={{ marginTop: '28px' }}>
              <div />
              <button
                className="btn btn-primary"
                disabled={!brief.business_type.trim()}
                onClick={next}
              >
                Далее →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Modules */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Выберите модули системы
            </h3>
            <p className="text-sm text-secondary mb-4">
              Выбрано: <span className="text-accent">{brief.modules.length}</span>
            </p>

            <div className="tag-selector">
              {AVAILABLE_MODULES.map(mod => (
                <span
                  key={mod}
                  className={`tag ${brief.modules.includes(mod) ? 'selected' : ''}`}
                  onClick={() => toggleModule(mod)}
                >
                  {mod}
                </span>
              ))}
            </div>

            {brief.modules.length > 0 && (
              <div className="card-glass mt-4" style={{ marginTop: '20px', padding: '14px' }}>
                <p className="text-sm text-muted">Выбрано:</p>
                <p className="font-mono text-sm text-accent" style={{ marginTop: '4px' }}>
                  [{brief.modules.join(', ')}]
                </p>
              </div>
            )}

            <div className="flex justify-between" style={{ marginTop: '28px' }}>
              <button className="btn btn-ghost" onClick={back}>← Назад</button>
              <button className="btn btn-primary" onClick={next}>Далее →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Extra prompt */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Дополнительные пожелания
            </h3>
            <p className="text-sm text-secondary mb-4">
              Архитектурные требования, стек, UI-стиль, ограничения. Опционально.
            </p>
            <div className="form-group">
              <label className="form-label">Промпт</label>
              <textarea
                className="form-textarea"
                placeholder="Например: Использовать PostgreSQL, темная тема, REST API + GraphQL, GDPR compliance..."
                value={brief.extra_prompt}
                onChange={e => setBrief(b => ({ ...b, extra_prompt: e.target.value }))}
                style={{ minHeight: '140px' }}
              />
            </div>
            <div className="flex justify-between" style={{ marginTop: '12px' }}>
              <button className="btn btn-ghost" onClick={back}>← Назад</button>
              <button className="btn btn-primary" onClick={next}>Далее →</button>
            </div>
          </div>
        )}

        {/* Step 4 — Confirm & Launch */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
              Подтверждение и запуск
            </h3>

            {/* Summary */}
            <div className="card-glass mb-6" style={{ marginBottom: '24px' }}>
              <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-sm" style={{ width: '110px' }}>Бизнес</span>
                  <span className="font-mono text-sm text-accent">{brief.business_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted text-sm" style={{ width: '110px' }}>Модули</span>
                  <span className="font-mono text-sm" style={{ color: 'var(--teal)' }}>
                    {brief.modules.length ? `[${brief.modules.join(', ')}]` : 'basic_ui'}
                  </span>
                </div>
                {brief.extra_prompt && (
                  <div className="flex gap-3">
                    <span className="text-muted text-sm" style={{ width: '110px', flexShrink: 0 }}>Промпт</span>
                    <span className="text-sm text-secondary">{brief.extra_prompt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Launch button */}
            {!loading && !done && (
              <div className="flex justify-between">
                <button className="btn btn-ghost" onClick={back}>← Назад</button>
                <button className="btn btn-primary btn-lg animate-glow" onClick={launch}>
                  🚀 Запустить Morph Swarm
                </button>
              </div>
            )}

            {/* Logs */}
            {(loading || logs.length > 0) && (
              <div style={{ marginTop: '24px' }}>
                <div className="flex items-center gap-3 mb-4">
                  <h4 style={{ fontWeight: 600 }}>Live Logs</h4>
                  {loading && <div className="spinner" />}
                  {done && <span className="badge badge-green">✓ Завершено</span>}
                </div>
                <div className="log-stream">
                  {logs.map((log, i) => (
                    <div key={i} className={`log-line ${log.type}`}>
                      <span className="text-muted" style={{ userSelect: 'none' }}>
                        {String(i + 1).padStart(3, '0')} │{' '}
                      </span>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
