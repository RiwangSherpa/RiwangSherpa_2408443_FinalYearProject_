import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Send,
  Plus,
  Clock,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  BookOpen,
  ChevronRight,
  Sparkles,
  Loader2,
  X
} from 'lucide-react'
import { tutorApi, goalsApi } from '../lib/api'
import LimitReachedModal from '../components/ui/LimitReachedModal'

interface Session {
  id: number
  title: string
  goal_id?: number
  step_id?: number
  message_count: number
  created_at: string
  updated_at: string
  is_active: boolean
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  model_used?: string
  was_helpful?: boolean
  created_at: string
}

interface Goal {
  id: number
  title: string
}

export default function Tutor() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showNewSessionModal, setShowNewSessionModal] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState<number | undefined>()
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSessions()
    loadGoals()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadSessions = async () => {
    try {
      const response = await tutorApi.getSessions()
      setSessions(response.data.sessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const loadGoals = async () => {
    try {
      const response = await goalsApi.getAll()
      setGoals(response.data)
    } catch (error) {
      console.error('Failed to load goals:', error)
    }
  }

  const loadSessionMessages = async (sessionId: number) => {
    try {
      const response = await tutorApi.getSession(sessionId)
      setMessages(response.data.session.messages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const createNewSession = async () => {
    if (!newSessionTitle.trim()) return
    
    try {
      setIsCreating(true)
      const response = await tutorApi.createSession({
        title: newSessionTitle,
        goal_id: selectedGoalId
      })
      const newSession = response.data.session
      
      setSessions([newSession, ...sessions])
      setActiveSession(newSession)
      setMessages([])
      setShowNewSessionModal(false)
      setNewSessionTitle('')
      setSelectedGoalId(undefined)
    } catch (error: any) {
      console.error('Failed to create session:', error)
      if (error.response?.status === 403) {
        setShowNewSessionModal(false)
        setLimitModalOpen(true)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const selectSession = async (session: Session) => {
    setActiveSession(session)
    await loadSessionMessages(session.id)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeSession || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    
    // Optimistically add user message
    const tempUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])
    
    try {
      setIsLoading(true)
      const response = await tutorApi.sendMessage(activeSession.id, userMessage)
      const aiMessage = response.data.ai_response
      
      setMessages(prev => [...prev, {
        id: aiMessage.id,
        role: 'assistant',
        content: aiMessage.content,
        model_used: aiMessage.model_used,
        created_at: aiMessage.created_at
      }])
      
      // Update session message count
      setActiveSession(prev => prev ? { ...prev, message_count: prev.message_count + 2 } : null)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const rateMessage = async (messageId: number, wasHelpful: boolean) => {
    try {
      await tutorApi.rateMessage(messageId, wasHelpful)
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, was_helpful: wasHelpful } : m
      ))
    } catch (error) {
      console.error('Failed to rate message:', error)
    }
  }

  const closeSession = async (sessionId: number) => {
    try {
      await tutorApi.closeSession(sessionId)
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, is_active: false } : s
      ))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to close session:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-neutral-50 dark:bg-dark-bg-primary transition-colors duration-300">
      {/* Sidebar - Sessions */}
      <div className="w-80 bg-white dark:bg-dark-bg-secondary border-r border-neutral-200 dark:border-dark-border-primary flex flex-col transition-colors duration-300">
        <div className="p-5 border-b border-neutral-200 dark:border-dark-border-primary transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary dark:bg-primary-dark rounded-xl transition-colors">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-primary dark:text-primary-dark font-heading transition-colors">AI Tutor</h2>
            </div>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="p-2.5 bg-primary dark:bg-primary-dark text-white rounded-xl hover:bg-primary-light dark:hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">
            {sessions.filter(s => s.is_active).length} active conversation{sessions.filter(s => s.is_active).length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary-muted dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                <Sparkles className="w-8 h-8 text-primary dark:text-primary-dark transition-colors" />
              </div>
              <p className="text-neutral-600 dark:text-dark-text-secondary font-medium transition-colors">No conversations yet</p>
              <p className="text-neutral-400 dark:text-dark-text-tertiary text-sm mt-1 transition-colors">Start a new session to get help</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    activeSession?.id === session.id
                      ? 'bg-primary-muted dark:bg-primary/20 border border-primary dark:border-primary-dark'
                      : 'hover:bg-neutral-50 dark:hover:bg-dark-hover-primary'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate transition-colors ${
                        activeSession?.id === session.id
                          ? 'text-primary dark:text-primary-dark'
                          : 'text-neutral-900 dark:text-dark-text-primary'
                      }`}>
                        {session.title || 'Untitled Session'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-500 dark:text-dark-text-tertiary transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{session.message_count} message{session.message_count !== 1 ? 's' : ''}</span>
                        <span className="text-neutral-300 dark:text-dark-text-tertiary">•</span>
                        <span>{formatDate(session.updated_at)}</span>
                      </div>
                    </div>
                    {session.is_active && (
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1.5"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-dark-bg-secondary transition-colors duration-300">
        {!activeSession ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="w-24 h-24 bg-primary dark:bg-primary-dark rounded-3xl flex items-center justify-center mx-auto mb-6 transition-colors">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary mb-3 font-heading transition-colors">
                Your AI Study Companion
              </h3>
              <p className="text-neutral-500 dark:text-dark-text-secondary mb-8 leading-relaxed transition-colors">
                Get personalized help with concepts, ask questions, and learn at your own pace with AI-powered tutoring.
              </p>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="px-8 py-4 bg-primary dark:bg-primary-dark text-white rounded-2xl font-semibold hover:bg-primary-light dark:hover:bg-primary/90 transition-colors"
              >
                Start New Session
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary dark:bg-primary-dark rounded-xl flex items-center justify-center transition-colors">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-dark-text-primary transition-colors">
                    {activeSession.title || 'Untitled Session'}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-dark-text-secondary transition-colors">
                    {activeSession.is_active ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Active
                      </span>
                    ) : 'Closed'} • {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeSession.is_active && (
                  <button
                    onClick={() => closeSession(activeSession.id)}
                    className="px-4 py-2 text-sm text-neutral-600 dark:text-dark-text-secondary hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors"
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence>
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-primary-muted dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                      <MessageSquare className="w-8 h-8 text-primary dark:text-primary-dark transition-colors" />
                    </div>
                    <p className="text-neutral-500 dark:text-dark-text-secondary transition-colors">
                      Start the conversation by sending a message below
                    </p>
                  </motion.div>
                )}
                
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`p-5 rounded-2xl transition-colors ${
                          message.role === 'user'
                            ? 'bg-primary dark:bg-primary-dark text-white rounded-br-md'
                            : 'bg-neutral-50 dark:bg-dark-bg-tertiary border border-neutral-200 dark:border-dark-border-primary text-neutral-900 dark:text-dark-text-primary rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      
                      <div className={`flex items-center gap-3 mt-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-neutral-400 dark:text-dark-text-tertiary transition-colors">{formatTime(message.created_at)}</span>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 bg-white dark:bg-dark-bg-tertiary rounded-lg p-1 border border-neutral-200 dark:border-dark-border-primary transition-colors">
                            <button
                              onClick={() => rateMessage(message.id, true)}
                              className={`p-1.5 rounded transition-colors ${
                                message.was_helpful === true
                                  ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'text-neutral-400 dark:text-dark-text-tertiary hover:text-green-500 hover:bg-neutral-50 dark:hover:bg-green-900/20'
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rateMessage(message.id, false)}
                              className={`p-1.5 rounded transition-colors ${
                                message.was_helpful === false
                                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                                  : 'text-neutral-400 dark:text-dark-text-tertiary hover:text-red-500 hover:bg-neutral-50 dark:hover:bg-red-900/20'
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                      <span className="text-sm text-neutral-500">AI is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary transition-colors">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your studies..."
                    rows={1}
                    className="w-full px-5 py-4 bg-neutral-50 dark:bg-dark-bg-tertiary border border-neutral-200 dark:border-dark-border-primary rounded-2xl focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:border-transparent resize-none outline-none transition-all"
                    style={{ minHeight: '56px', maxHeight: '150px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-5 py-4 bg-primary dark:bg-primary-dark text-white rounded-2xl font-semibold hover:bg-primary-light dark:hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-neutral-400 dark:text-dark-text-tertiary mt-3 text-center transition-colors">
                Press Enter to send • Shift + Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 transition-colors">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-dark-bg-secondary rounded-card p-8 max-w-md w-full border border-neutral-200 dark:border-dark-border-primary transition-colors"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary dark:bg-primary-dark rounded-xl transition-colors">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-dark-text-primary font-heading transition-colors">New Session</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2 transition-colors">
                  Session Title
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg-tertiary border border-neutral-200 dark:border-dark-border-primary rounded-xl focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark outline-none transition-all"
                  placeholder="e.g., Help with Calculus Derivatives"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-dark-text-primary mb-2 transition-colors">
                  Link to Goal (Optional)
                </label>
                <select
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg-tertiary border border-neutral-200 dark:border-dark-border-primary rounded-xl focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark outline-none transition-all"
                >
                  <option value="">None</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="flex-1 py-3.5 border border-neutral-300 dark:border-dark-border-primary text-neutral-700 dark:text-dark-text-primary rounded-xl font-semibold hover:bg-neutral-50 dark:hover:bg-dark-hover-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewSession}
                disabled={!newSessionTitle.trim() || isCreating}
                className="flex-1 py-3.5 bg-primary dark:bg-primary-dark text-white rounded-xl font-semibold hover:bg-primary-light dark:hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Start Session'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        feature="AI Tutor"
        limitType="pro_required"
      />
    </div>
  )
}
