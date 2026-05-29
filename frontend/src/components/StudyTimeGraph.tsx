import { useState } from 'react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import Card from './ui/Card'
import Button from './ui/Button'

interface StudyDataPoint {
  date: string
  minutes: number
  day: string
}

interface StudyTimeGraphProps {
  data: StudyDataPoint[]
  title?: string
}

export default function StudyTimeGraph({ data, title = 'Study Time' }: StudyTimeGraphProps) {
  const [daysRange, setDaysRange] = useState<number>(7)
  const [startIndex, setStartIndex] = useState<number>(0)
  
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const visibleData = sortedData.slice(startIndex, startIndex + daysRange).reverse()
  
  const totalMinutes = visibleData.reduce((sum, d) => sum + d.minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
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
    <Card className="w-full shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="section-heading">{title}</h3>
              <p className="text-sm text-neutral-500 dark:text-dark-text-secondary">
                Total: {hours}h {minutes}m
              </p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-dark-text-secondary">Show:</span>
            <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-dark-bg-tertiary">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setDaysRange(days)
                    setStartIndex(0)
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    daysRange === days
                      ? 'bg-white text-primary shadow-sm dark:bg-dark-bg-secondary dark:text-primary-dark'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
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
          <span className="text-sm text-neutral-500 dark:text-dark-text-secondary">
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
              <AreaChart data={visibleData}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.28}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                  formatter={(value: any) => [`${value} minutes`, 'Study Time']}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#059669" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMinutes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
              No study data available for this period
            </div>
          )}
        </div>
    </Card>
  )
}
