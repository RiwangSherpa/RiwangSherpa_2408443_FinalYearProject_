import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface RoadmapStepsChartProps {
  totalSteps: number
  completedSteps: number
}

export default function RoadmapStepsChart({ totalSteps, completedSteps }: RoadmapStepsChartProps) {
  const remainingSteps = totalSteps - completedSteps

  const data = [
    { name: 'Completed', value: completedSteps },
    { name: 'Remaining', value: remainingSteps },
  ]

  const gridColor = '#E5E7EB'
  const colors = ['#064E3B', '#E5E7EB']

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
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
        />
        <Legend
          wrapperStyle={{ fontFamily: 'Inter', fontSize: '12px', color: '#6B7280' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
