import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'

interface QuizScoreData {
  date: string
  score: number
  topic: string
}

interface QuizScoreLineChartProps {
  data: QuizScoreData[]
}

export default function QuizScoreLineChart({ data }: QuizScoreLineChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(item.score),
    topic: item.topic,
  }))

  const textColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const lineColor = '#10b981'

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
          domain={[0, 100]}
          stroke={textColor}
          style={{ fontSize: '12px' }}
          tick={{ fill: textColor }}
          label={{
            value: 'Score (%)',
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
          formatter={(value: number, payload: any) => [
            `${value}%`,
            payload?.[0]?.payload?.topic || 'Score',
          ]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
