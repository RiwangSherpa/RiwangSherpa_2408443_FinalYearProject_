import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StudyTimeData } from '../../types'
import { useTheme } from '../../contexts/ThemeContext'

interface StudyTimeLineChartProps {
  data: StudyTimeData[]
  days: 7 | 30
}

export default function StudyTimeLineChart({ data, days }: StudyTimeLineChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    minutes: Math.round(item.minutes),
    hours: (item.minutes / 60).toFixed(1),
  }))

  const textColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const lineColor = '#3b82f6'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          stroke={textColor}
          style={{ fontSize: '12px' }}
          tick={{ fill: textColor }}
        />
        <YAxis
          stroke={textColor}
          style={{ fontSize: '12px' }}
          tick={{ fill: textColor }}
          label={{
            value: 'Minutes',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: textColor },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
          }}
          labelStyle={{ color: textColor }}
          formatter={(value: number) => [`${value} min (${(value / 60).toFixed(1)}h)`, 'Study Time']}
        />
        <Line
          type="monotone"
          dataKey="minutes"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
