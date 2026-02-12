import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'

interface TopicPerformance {
  topic: string
  average_score: number
  quiz_count: number
}

interface QuizScoreBarChartProps {
  data: TopicPerformance[]
}

export default function QuizScoreBarChart({ data }: QuizScoreBarChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Format data for chart (limit to top 10 topics)
  const chartData = data
    .slice(0, 10)
    .map((item) => ({
      topic: item.topic.length > 15 ? item.topic.substring(0, 15) + '...' : item.topic,
      score: Math.round(item.average_score),
      fullTopic: item.topic,
      quizCount: item.quiz_count,
    }))
    .sort((a, b) => b.score - a.score)

  const textColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const barColor = '#8b5cf6'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="topic"
          stroke={textColor}
          style={{ fontSize: '11px' }}
          tick={{ fill: textColor }}
          angle={-45}
          textAnchor="end"
          height={80}
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
            `${value}% (${payload?.[0]?.payload?.quizCount} quizzes)`,
            payload?.[0]?.payload?.fullTopic || 'Score',
          ]}
        />
        <Bar dataKey="score" fill={barColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
