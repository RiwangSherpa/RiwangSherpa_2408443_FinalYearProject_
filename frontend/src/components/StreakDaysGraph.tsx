import { useState } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'

interface StreakDataPoint {
  date: string
  streakDays: number
  day: string
  studied: boolean
}

interface StreakDaysGraphProps {
  data: StreakDataPoint[]
  title?: string
}

export default function StreakDaysGraph({ data, title = 'Study Streak' }: StreakDaysGraphProps) {
  const [daysRange, setDaysRange] = useState<number>(30)
  const [startIndex, setStartIndex] = useState<number>(0)
  
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const visibleData = sortedData.slice(startIndex, startIndex + daysRange).reverse()
  
  const maxStreak = Math.max(...visibleData.map(d => d.streakDays), 1)
  const currentStreak = visibleData.length > 0 ? visibleData[visibleData.length - 1].streakDays : 0
  
  const canGoBack = startIndex > 0
  const canGoForward = startIndex + daysRange < sortedData.length
  
  const handlePrev = () => {
    if (canGoBack) {
      setStartIndex(Math.max(0, startIndex - daysRange))
    }
  }
  
  const handleNext = () => {
    if (canGoForward) {
      setStartIndex(startIndex + daysRange)
    }
  }
  
  return (
    <Card className="w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">
                Current: {currentStreak} day{currentStreak !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setDaysRange(days)
                    setStartIndex(0)
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    daysRange === days
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={!canGoBack}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            {visibleData.length > 0 && (
              <>
                {new Date(visibleData[0].date).toLocaleDateString()} - {new Date(visibleData[visibleData.length - 1].date).toLocaleDateString()}
              </>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!canGoForward}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Chart */}
        <div className="h-64">
          {visibleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="day" 
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  domain={[0, maxStreak + 1]}
                  label={{ value: 'Streak Days', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  formatter={(value: any, _name: any, props: any) => {
                    const studied = props?.payload?.studied
                    return [`${value} days${studied ? ' ✓' : ''}`, 'Streak']
                  }}
                />
                <Bar dataKey="streakDays" radius={[4, 4, 0, 0]}>
                  {visibleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.studied ? '#F97316' : '#E5E7EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No streak data available for this period
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-600">Studied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span className="text-gray-600">No Study</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
