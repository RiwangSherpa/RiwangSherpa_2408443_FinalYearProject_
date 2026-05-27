import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  decimals?: number
}

export default function AnimatedCounter({ value, suffix = '', decimals = 0 }: AnimatedCounterProps) {
  const counter = useMotionValue(0)
  const formatted = useTransform(counter, (latest) => `${latest.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    const controls = animate(counter, value, {
      duration: 1.4,
      ease: 'easeOut',
    })

    return () => controls.stop()
  }, [counter, value])

  return <motion.span>{formatted}</motion.span>
}
