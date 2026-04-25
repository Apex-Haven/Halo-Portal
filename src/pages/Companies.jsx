import { useEffect, useMemo, useState } from 'react'
import { Building2, Search, Users, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { buildCompaniesFromTransfers } from '../utils/transferUtils'

const Companies = () => {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7007/api'
        const token = localStorage.getItem('token')
        const headers = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
        const res = await fetch(`${API_BASE_URL}/transfers?limit=500`, { headers }).then((r) => r.json())
        const transfers = res?.success && Array.isArray(res.data) ? res.data : []
        setCompanies(buildCompaniesFromTransfers(transfers))
      } catch (error) {
        console.error('Error fetching companies:', error)
        setCompanies([])
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) =>
      c.companyName.toLowerCase().includes(q) ||
      c.guestNames.some((n) => n.toLowerCase().includes(q))
    )
  }, [companies, query])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Companies coming to the event, with their guests from transfer records.
        </p>
        {!loading && (
          <p className="mt-2 text-sm font-medium text-foreground">
            Total companies: <span className="tabular-nums">{companies.length}</span>
            {query.trim() ? (
              <span className="ml-2 text-muted-foreground font-normal">
                (showing {filtered.length} result{filtered.length === 1 ? '' : 's'})
              </span>
            ) : null}
          </p>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or guest name..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading companies...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-medium text-foreground">No companies found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {companies.length === 0 ? 'No transfer-based company data is available yet.' : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((company) => (
            <div key={company.companyName} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-foreground">{company.companyName}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} /> {company.guestCount} guests
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Truck size={13} /> {company.transferCount} transfers
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/transfers?company=${encodeURIComponent(company.companyName)}`)}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Open transfers
                </button>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guests</p>
                <div className="flex flex-wrap gap-2">
                  {company.guestNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/90"
                      title={name}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Companies
