import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TopicPerformance {
  topic: string
  average_score: number
  quiz_count: number
}

interface QuizScoreBarChartProps {
  data: TopicPerformance[]
}

export default function QuizScoreBarChart({ data }: QuizScoreBarChartProps) {
  const chartData = data
    .slice(0, 10)
    .map((item) => ({
      topic: item.topic.length > 15 ? item.topic.substring(0, 15) + '...' : item.topic,
      score: Math.round(item.average_score),
      fullTopic: item.topic,
      quizCount: item.quiz_count,
    }))
    .sort((a, b) => b.score - a.score)

  const textColor = '#6B7280'
  const gridColor = '#E5E7EB'
  const barColor = '#064E3B'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="topic"
          tick={{ fill: textColor, fontSize: 11, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: textColor, fontSize: 12, fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          label={{
            value: 'Score (%)',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: textColor, fontFamily: 'Inter', fontSize: 12 },
          }}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontFamily: 'Inter',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#064E3B' }}
          formatter={(value: any, _name: any, props: any) => [
            `${value ?? 0}% (${props?.payload?.quizCount} quizzes)`,
            props?.payload?.fullTopic || 'Score',
          ]}
        />
        <Bar dataKey="score" fill={barColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
