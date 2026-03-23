'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WeekDay { date: string; label: string; count: number }
interface DeckCount { name: string; count: number }

export default function StatsCharts({ weekData, deckData }: { weekData: WeekDay[]; deckData: DeckCount[] }) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Diese Woche gelernt</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekData} barSize={24}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              cursor={false}
              contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 12 }}
              formatter={(val: number) => [val, 'Karten']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {weekData.map((entry) => (
                <Cell key={entry.date} fill={entry.date === today ? '#378ADD' : '#e5e7eb'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Karten pro Stapel</h3>
        {deckData.length === 0 ? (
          <p className="text-sm text-gray-400 mt-8 text-center">Noch keine Stapel.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deckData} layout="vertical" barSize={18}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={90} />
              <Tooltip
                cursor={false}
                contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(val: number) => [val, 'Karten']}
              />
              <Bar dataKey="count" fill="#378ADD" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
