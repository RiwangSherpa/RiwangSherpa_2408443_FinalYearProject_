import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, RotateCcw, Coffee, Timer, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { productivityApi } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

type TimerState = 'idle' | 'running' | 'paused' | 'completed'

export default function Productivity() {
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [sessionType, setSessionType] = useState<'pomodoro' | 'break'>('pomodoro')
  const intervalRef = useRef<number | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)

  const POMODORO_TIME = 25 * 60
  const BREAK_TIME = 5 * 60

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState])

  const handleStart = async () => {
    if (timerState === 'idle') {
      try {
        const response = await productivityApi.createSession({
          session_type: sessionType,
          duration_minutes: sessionType === 'pomodoro' ? 25 : 5,
        })
        setSessionId(response.data.id)
      } catch (error) {
        console.error('Failed to create session:', error)
      }
    }
    setTimerState('running')
  }

  const handlePause = () => {
    setTimerState('paused')
  }

  const handleResume = () => {
    setTimerState('running')
  }

  const handleReset = () => {
    setTimerState('idle')
    setTimeLeft(sessionType === 'pomodoro' ? POMODORO_TIME : BREAK_TIME)
    setSessionId(null)
  }

  const handleComplete = async () => {
    setTimerState('completed')
    
    if (sessionId) {
      try {
        await productivityApi.completeSession(sessionId)
      } catch (error) {
        console.error('Failed to complete session:', error)
      }
    }

    if (sessionType === 'pomodoro') {
      setTimeout(() => {
        setSessionType('break')
        setTimeLeft(BREAK_TIME)
        setTimerState('idle')
      }, 2000)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = sessionType === 'pomodoro'
    ? ((POMODORO_TIME - timeLeft) / POMODORO_TIME) * 100
    : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100

  return (
    <div className="bg-neutral-50 dark:bg-dark-bg-primary min-h-screen px-6 py-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-primary dark:text-primary-dark mb-2 transition-colors">Productivity Timer</h1>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">Focus with the Pomodoro Technique</p>
        </div>

        {/* Timer Card */}
        <Card className="bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary transition-colors duration-300">
          <div className="text-center py-12">
            {/* Session Type Selector */}
            {timerState === 'idle' && (
              <div className="flex gap-4 justify-center mb-8">
                <Button
                  onClick={() => {
                    setSessionType('pomodoro')
                    setTimeLeft(POMODORO_TIME)
                  }}
                  variant={sessionType === 'pomodoro' ? 'primary' : 'secondary'}
                  size="lg"
                >
                  Pomodoro (25 min)
                </Button>
                <Button
                  onClick={() => {
                    setSessionType('break')
                    setTimeLeft(BREAK_TIME)
                  }}
                  variant={sessionType === 'break' ? 'primary' : 'secondary'}
                  size="lg"
                >
                  Break (5 min)
                </Button>
              </div>
            )}

            {/* Timer Display */}
            <div className="mb-8">
              <div className="relative inline-block mb-6">
                <div className="text-8xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">
                  {formatTime(timeLeft)}
                </div>
              </div>
              
              {/* Progress Circle */}
              <div className="w-64 h-64 mx-auto relative">
                <svg className="transform -rotate-90 w-full h-full">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="none"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke={sessionType === 'pomodoro' ? '#064E3B' : '#4F46E5'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                    initial={false}
                    transition={{ duration: 1 }}
                  />
                </svg>
                {/* Timer Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {sessionType === 'pomodoro' ? (
                    <Target className="w-12 h-12 text-neutral-300 dark:text-dark-text-tertiary transition-colors" />
                  ) : (
                    <Coffee className="w-12 h-12 text-neutral-300 dark:text-dark-text-tertiary transition-colors" />
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {timerState === 'idle' && (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Start
                </Button>
              )}
              
              {timerState === 'running' && (
                <>
                  <Button
                    onClick={handlePause}
                    variant="secondary"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="secondary"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Reset
                  </Button>
                </>
              )}
              
              {timerState === 'paused' && (
                <>
                  <Button
                    onClick={handleResume}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="secondary"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </Button>
                </>
              )}
              
              {timerState === 'completed' && (
                <div className="text-center">
                  <Coffee className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-xl font-bold mb-4 text-neutral-900 font-heading">
                    {sessionType === 'pomodoro' ? 'Time for a break!' : 'Ready to focus again?'}
                  </p>
                  <p className="text-sm text-neutral-500 mb-4">
                    {sessionType === 'pomodoro' ? 'Take a moment to recharge' : 'Start your next pomodoro session'}
                  </p>
                  <Button
                    onClick={handleReset}
                    size="lg"
                  >
                    Start Next Session
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="w-5 h-5 text-primary" />
            <h2 className="section-heading">Productivity Tips</h2>
          </div>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Work for 25 minutes, then take a 5-minute break</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>After 4 pomodoros, take a longer 15-30 minute break</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Eliminate distractions during focus time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Use breaks to stretch, hydrate, or rest your eyes</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
