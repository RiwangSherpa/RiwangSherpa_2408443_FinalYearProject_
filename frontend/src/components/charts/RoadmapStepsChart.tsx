import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'

interface RoadmapStepsChartProps {
  totalSteps: number
  completedSteps: number
}

export default function RoadmapStepsChart({ totalSteps, completedSteps }: RoadmapStepsChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const remainingSteps = totalSteps - completedSteps

  const data = [
    { name: 'Completed', value: completedSteps },
    { name: 'Remaining', value: remainingSteps },
  ]

  const textColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const colors = ['#10b981', '#6b7280']

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
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${gridColor}`,
            borderRadius: '8px',
          }}
          labelStyle={{ color: textColor }}
        />
        <Legend
          wrapperStyle={{ color: textColor }}
          iconType="circle"
          formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
