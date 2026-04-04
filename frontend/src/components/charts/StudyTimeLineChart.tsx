import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StudyTimeData } from '../../types'
import { useTheme } from '../../contexts/ThemeContext'

interface StudyTimeLineChartProps {
  data: StudyTimeData[]
  days: 7 | 30
}

export default function StudyTimeLineChart({ data }: StudyTimeLineChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    minutes: Math.round(item.minutes),
    hours: (item.minutes / 60).toFixed(1),
  }))

  const textColor = isDark ? '#D1D5DB' : '#6B7280'
  const gridColor = isDark ? '#374151' : '#E5E7EB'
  const lineColor = '#064E3B'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          tick={{ fill: textColor, fontSize: 12, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: textColor, fontSize: 12, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          label={{
            value: 'Minutes',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: textColor, fontFamily: 'Inter', fontSize: 12 },
          }}
        />
        <Tooltip
          contentStyle={{
            background: isDark ? '#1F2937' : '#FFFFFF',
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
            fontFamily: 'Inter',
            fontSize: '12px',
          }}
          labelStyle={{ color: textColor, fontWeight: 600 }}
          itemStyle={{ color: lineColor }}
          formatter={(value: number | undefined) => [`${value ?? 0} min (${((value ?? 0) / 60).toFixed(1)}h)`, 'Study Time']}
        />
        <Line
          type="monotone"
          dataKey="minutes"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
