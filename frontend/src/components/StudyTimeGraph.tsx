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
  
  // Sort data by date descending (newest first)
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Get visible data based on range and start index (start from most recent)
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
    <Card className="w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">
                Total: {hours}h {minutes}m
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
                      ? 'bg-white text-blue-600 shadow-sm'
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
              <AreaChart data={visibleData}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
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
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMinutes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No study data available for this period
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
