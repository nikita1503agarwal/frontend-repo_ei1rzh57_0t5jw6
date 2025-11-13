import { useEffect, useMemo, useRef, useState } from 'react'

function useBuzzer() {
  const ctxRef = useRef(null)
  const gainRef = useRef(null)

  const init = () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const gain = ctx.createGain()
      gain.gain.value = 0.05
      gain.connect(ctx.destination)
      ctxRef.current = ctx
      gainRef.current = gain
    }
  }

  const buzz = (duration = 600, frequency = 800) => {
    try {
      init()
      const ctx = ctxRef.current
      const gain = gainRef.current
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = frequency
      osc.connect(gain)
      osc.start()
      setTimeout(() => {
        try { osc.stop() } catch {}
      }, duration)
    } catch {}
  }

  return buzz
}

function StatCard({ label, value, sub }) {
  return (
    <div className="p-4 rounded-xl bg-white/70 backdrop-blur shadow flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-500 mt-1">{sub}</span>}
    </div>
  )
}

function Bar({ value = 0, max = 1, label = '', color = 'bg-emerald-500' }) {
  const width = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export default function App() {
  const [vehicleId, setVehicleId] = useState('car-001')
  const [distance, setDistance] = useState('10')
  const [fuelUsed, setFuelUsed] = useState('')
  const [efficiency, setEfficiency] = useState('15')
  const [fuelType, setFuelType] = useState('petrol')
  const [avgSpeed, setAvgSpeed] = useState('40')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [weekly, setWeekly] = useState(null)
  const [wLoading, setWLoading] = useState(false)

  const buzz = useBuzzer()

  const backend = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        vehicle_id: vehicleId,
        distance_km: parseFloat(distance) || 0,
        fuel_used_l: fuelUsed !== '' ? parseFloat(fuelUsed) : null,
        efficiency_km_per_l: efficiency !== '' ? parseFloat(efficiency) : null,
        fuel_type: fuelType,
        avg_speed_kmh: avgSpeed !== '' ? parseFloat(avgSpeed) : null,
      }
      const res = await fetch(`${backend}/api/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = await res.json()
      setResult(data)
      if (data.alert) buzz(700, 900)
      // refresh weekly after a submission
      fetchWeekly(vehicleId)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeekly = async (vehId = '') => {
    setWLoading(true)
    try {
      const url = new URL(`${backend}/api/weekly-analysis`)
      if (vehId) url.searchParams.set('vehicle_id', vehId)
      const res = await fetch(url.toString())
      const data = await res.json()
      setWeekly(data)
    } catch (e) {
      setWeekly({ summary: { total_trips: 0, total_co_g: 0, total_co2_kg: 0, avg_co_g: 0, avg_co2_kg: 0, alerts: 0 }, by_day: [] })
    } finally {
      setWLoading(false)
    }
  }

  useEffect(() => {
    fetchWeekly(vehicleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxCo = weekly?.by_day?.reduce((m, d) => Math.max(m, d.co_g || 0), 0) || 1
  const maxCo2 = weekly?.by_day?.reduce((m, d) => Math.max(m, d.co2_kg || 0), 0) || 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white grid place-items-center font-bold">E</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">EcoDrive</h1>
            <p className="text-sm text-gray-500">Estimate emissions, get alerts, and track weekly impact</p>
          </div>
        </div>
        <a href="/test" className="text-sm text-emerald-700 hover:underline">System Check</a>
      </header>

      <main className="px-6 pb-16 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white/70 backdrop-blur rounded-2xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Trip Estimator</h2>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Vehicle ID</label>
              <input value={vehicleId} onChange={e=>setVehicleId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="e.g., car-001" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Distance (km)</label>
              <input type="number" min="0" step="0.1" value={distance} onChange={e=>setDistance(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fuel Used (L)</label>
              <input type="number" min="0" step="0.01" value={fuelUsed} onChange={e=>setFuelUsed(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Leave empty if using efficiency" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Efficiency (km/L)</label>
              <input type="number" min="0" step="0.1" value={efficiency} onChange={e=>setEfficiency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Used if Fuel Used is empty" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fuel Type</label>
              <select value={fuelType} onChange={e=>setFuelType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Average Speed (km/h)</label>
              <input type="number" min="0" step="1" value={avgSpeed} onChange={e=>setAvgSpeed(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && (
              <div className="md:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>
            )}
            <div className="md:col-span-2 flex gap-3">
              <button disabled={loading} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Estimating...' : 'Estimate Emissions'}
              </button>
              <button type="button" onClick={()=>{setResult(null); setError('')}} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Reset</button>
            </div>
          </form>

          {result && (
            <div className="mt-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800">Results</h3>
                {result.alert ? (
                  <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">Alert: {result.reason}</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">Good: Within thresholds</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <StatCard label="CO (g)" value={result.co_g} />
                <StatCard label="CO2 (kg)" value={result.co2_kg} />
                <StatCard label="CO2 Intensity (g/km)" value={result.co2_g_per_km} />
              </div>
              {result.alert && (
                <p className="mt-3 text-sm text-red-700">A buzzer was triggered to alert high emissions. Consider smoother driving or maintenance.</p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white/70 backdrop-blur rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Weekly Analysis</h2>
            <button onClick={()=>fetchWeekly(vehicleId)} className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-black disabled:opacity-60" disabled={wLoading}>{wLoading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Filter by Vehicle</label>
            <input value={vehicleId} onChange={e=>setVehicleId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          {weekly ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatCard label="Trips" value={weekly.summary.total_trips} />
                <StatCard label="Alerts" value={weekly.summary.alerts} />
                <StatCard label="Total CO (g)" value={weekly.summary.total_co_g} />
                <StatCard label="Total CO2 (kg)" value={weekly.summary.total_co2_kg} />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">CO by Day (g)</h3>
                {weekly.by_day.map(d => (
                  <Bar key={`co-${d.day}`} label={d.day} value={d.co_g} max={maxCo} color="bg-orange-500" />
                ))}
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-gray-700">CO2 by Day (kg)</h3>
                {weekly.by_day.map(d => (
                  <Bar key={`co2-${d.day}`} label={d.day} value={d.co2_kg} max={maxCo2} color="bg-emerald-500" />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">Loading weekly analysis...</p>
          )}
        </section>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-gray-500">EcoDrive helps you drive cleaner. Tip: Keep steady speeds and maintain tire pressure to lower emissions.</footer>
    </div>
  )
}
