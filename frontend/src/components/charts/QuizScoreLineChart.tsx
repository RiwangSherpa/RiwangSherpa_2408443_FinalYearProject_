import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface QuizScoreData {
  date: string
  score: number
  topic: string
}

interface QuizScoreLineChartProps {
  data: QuizScoreData[]
}

export default function QuizScoreLineChart({ data }: QuizScoreLineChartProps) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(item.score),
    topic: item.topic,
  }))

  const textColor = '#6B7280'
  const gridColor = '#E5E7EB'
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
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
            fontFamily: 'Inter',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          itemStyle={{ color: '#064E3B' }}
          formatter={(value: any, _name: any, props: any) => [
            `${value ?? 0}%`,
            props?.payload?.topic || 'Score',
          ]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
