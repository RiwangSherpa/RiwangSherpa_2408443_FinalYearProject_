import { type ElementType, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Network,
  Layers,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import StudyMarkdownRenderer from '../components/brainstorm/StudyMarkdownRenderer'
import { brainstormApi, flashcardsApi, mindmapsApi } from '../lib/api'
import type { BrainstormFile, BrainstormMessage, BrainstormSession } from '../types'

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.txt,.md,.docx'
const MAX_TITLE_LENGTH = 80

type BrainstormAction = 'summarize' | 'notes' | 'mindmap' | 'flashcards'
type ResponseLength = 'short' | 'balanced' | 'detailed'

function getApiErrorDetails(err: any): { message: string; partialContent?: string } {
  const payload = err?.response?.data
  const message =
    payload?.detail ||
    payload?.error?.message ||
    err?.message ||
    'Request failed.'
  const partialContent =
    typeof payload?.partial_content === 'string' && payload.partial_content.trim()
      ? payload.partial_content
      : undefined
  return { message, partialContent }
}

export default function Brainstorm() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<BrainstormSession[]>([])
  const [activeSession, setActiveSession] = useState<BrainstormSession | null>(null)
  const [messages, setMessages] = useState<BrainstormMessage[]>([])
  const [files, setFiles] = useState<BrainstormFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([])
  const [input, setInput] = useState('')
  const [responseLength, setResponseLength] = useState<ResponseLength>('balanced')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [actionLoading, setActionLoading] = useState<BrainstormAction | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [sessionMenuId, setSessionMenuId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BrainstormSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingId])

  const readyFiles = useMemo(
    () => files.filter((file) => file.upload_status === 'ready'),
    [files]
  )

  const contextLabel = selectedFileIds.length
    ? `${selectedFileIds.length} selected`
    : readyFiles.length
      ? `${readyFiles.length} ready`
      : 'No context'

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const response = await brainstormApi.getSessions()
      const loadedSessions: BrainstormSession[] = response.data
      setSessions(loadedSessions)
      if (!activeSession && loadedSessions.length > 0) {
        await loadSession(loadedSessions[0].id)
      }
    } catch (err) {
      console.error('Failed to load Brainstorm sessions:', err)
      setError('Failed to load Brainstorm sessions.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSession = async (sessionId: number) => {
    try {
      const response = await brainstormApi.getSession(sessionId)
      setActiveSession(response.data)
      setMessages(response.data.messages || [])
      const loadedFiles = response.data.files || []
      setSelectedFileIds((previous) =>
        previous.filter((id) => loadedFiles.some((file: BrainstormFile) => file.id === id))
      )
      setFiles(loadedFiles)
    } catch (err) {
      console.error('Failed to load Brainstorm session:', err)
      setError('Failed to open the selected Brainstorm session.')
    }
  }

  const createSession = async (): Promise<BrainstormSession | null> => {
    try {
      const title = `Brainstorm ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      const response = await brainstormApi.createSession({ title })
      const session: BrainstormSession = response.data
      setSessions((current) => [session, ...current])
      setActiveSession(session)
      setMessages([])
      setFiles([])
      setSelectedFileIds([])
      return session
    } catch (err) {
      console.error('Failed to create Brainstorm session:', err)
      setError('Failed to create a Brainstorm session.')
      return null
    }
  }

  const startRename = (session: BrainstormSession) => {
    setSessionMenuId(null)
    setRenamingId(session.id)
    setRenameValue(session.title)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const saveRename = async (session: BrainstormSession) => {
    const title = renameValue.trim()
    if (!title) {
      setError('Session title cannot be empty.')
      return
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setError(`Session title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
      return
    }
    if (title === session.title) {
      cancelRename()
      return
    }

    const previousSessions = sessions
    const previousActive = activeSession
    const renamed = { ...session, title, updated_at: new Date().toISOString() }
    setSessions((current) => current.map((item) => (item.id === session.id ? renamed : item)))
    if (activeSession?.id === session.id) setActiveSession({ ...activeSession, title })
    cancelRename()

    try {
      const response = await brainstormApi.updateSession(session.id, { title })
      const saved: BrainstormSession = response.data
      setSessions((current) => current.map((item) => (item.id === session.id ? saved : item)))
      if (activeSession?.id === session.id) setActiveSession((current) => current ? { ...current, ...saved } : saved)
    } catch (err: any) {
      setSessions(previousSessions)
      setActiveSession(previousActive)
      setError(err.response?.data?.detail || 'Failed to rename session.')
    }
  }

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return
    try {
      setDeletingSessionId(deleteTarget.id)
      await brainstormApi.deleteSession(deleteTarget.id)
      const remaining = sessions.filter((session) => session.id !== deleteTarget.id)
      setSessions(remaining)
      setDeleteTarget(null)
      if (activeSession?.id === deleteTarget.id) {
        setMessages([])
        setFiles([])
        setSelectedFileIds([])
        setActiveSession(null)
        if (remaining[0]) await loadSession(remaining[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete session.')
    } finally {
      setDeletingSessionId(null)
    }
  }

  const uploadFiles = async (incomingFiles: FileList | File[]) => {
    let targetSession = activeSession
    if (!targetSession) {
      targetSession = await createSession()
    }
    const fileList = Array.from(incomingFiles)
    if (!targetSession || fileList.length === 0) return

    try {
      setError(null)
      setIsUploading(true)
      setUploadProgress(1)
      await brainstormApi.upload(targetSession.id, fileList, (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total))
        }
      })
      await loadSession(targetSession.id)
      await loadSessions()
    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const sendMessage = async () => {
    const message = input.trim()
    if (!message || !activeSession || isSending) return

    const fileIds = selectedFileIds.length ? selectedFileIds : undefined
    const tempMessage: BrainstormMessage = {
      id: -Date.now(),
      session_id: activeSession.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }

    setInput('')
    setMessages((current) => [...current, tempMessage])

    try {
      setIsSending(true)
      const response = await brainstormApi.chat(activeSession.id, message, fileIds, responseLength)
      setMessages((current) => [
        ...current.filter((item) => item.id !== tempMessage.id),
        response.data.user_message,
        response.data.ai_response,
      ])
      await loadSessions()
    } catch (err: any) {
      console.error('Brainstorm chat failed:', err)
      const { message, partialContent } = getApiErrorDetails(err)
      if (partialContent) {
        const recoveredMessage: BrainstormMessage = {
          id: -Date.now() - 1,
          session_id: activeSession.id,
          role: 'assistant',
          content: partialContent,
          created_at: new Date().toISOString(),
        }
        setMessages((current) => [...current.filter((item) => item.id !== tempMessage.id), recoveredMessage])
        setError(`Recovered partial output: ${message}`)
      } else {
        setError(message || 'Brainstorm chat failed.')
        setMessages((current) => current.filter((item) => item.id !== tempMessage.id))
      }
    } finally {
      setIsSending(false)
    }
  }

  const runAction = async (action: BrainstormAction) => {
    if (!activeSession || actionLoading) return

    const fileId = selectedFileIds.length === 1 ? selectedFileIds[0] : undefined
    const fileIds = selectedFileIds.length > 1 ? selectedFileIds : undefined
    try {
      setActionLoading(action)
      if (action === 'summarize') {
        await brainstormApi.summarize(activeSession.id, 'detailed', fileId, fileIds, responseLength)
      } else if (action === 'notes') {
        await brainstormApi.generateNotes(activeSession.id, {
          file_id: fileId,
          file_ids: fileIds,
          response_length: responseLength,
        })
      } else if (action === 'mindmap') {
        await mindmapsApi.generate({
          source_type: 'brainstorm_session',
          source_id: activeSession.id,
          title: `${activeSession.title} Mindmap`,
        })
        navigate('/mindmap')
        return
      } else {
        await flashcardsApi.generate({
          source_type: 'brainstorm_session',
          source_id: activeSession.id,
          title: `${activeSession.title} Flashcards`,
          count: responseLength === 'detailed' ? 18 : responseLength === 'short' ? 8 : 12,
        })
        navigate('/flashcards')
        return
      }
      await loadSession(activeSession.id)
      await loadSessions()
    } catch (err: any) {
      console.error('Brainstorm action failed:', err)
      const { message, partialContent } = getApiErrorDetails(err)
      if (partialContent && activeSession) {
        const recoveredMessage: BrainstormMessage = {
          id: -Date.now() - 2,
          session_id: activeSession.id,
          role: 'assistant',
          content: partialContent,
          created_at: new Date().toISOString(),
        }
        setMessages((current) => [...current, recoveredMessage])
        setError(`Recovered partial output: ${message}`)
      } else {
        setError(message || 'Generation failed.')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const deleteFile = async (fileId: number) => {
    if (!activeSession) return
    try {
      await brainstormApi.deleteFile(fileId)
      setSelectedFileIds((current) => current.filter((id) => id !== fileId))
      await loadSession(activeSession.id)
      await loadSessions()
    } catch (err: any) {
      console.error('Failed to delete file:', err)
      setError(getApiErrorDetails(err).message || 'Failed to delete file.')
    }
  }

  const toggleFile = (fileId: number) => {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId]
    )
  }

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') setDragActive(true)
    if (event.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (event.dataTransfer.files?.length) uploadFiles(event.dataTransfer.files)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const formatFileSize = (size: number) => {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[720px] overflow-hidden bg-neutral-50 dark:bg-dark-bg-primary">
      <div className="h-full grid grid-cols-1 xl:grid-cols-[14.5rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[15rem_minmax(0,1fr)_19rem] border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary rounded-card overflow-hidden shadow-sm transition-[grid-template-columns] duration-200">
        <aside className="min-h-0 border-b xl:border-b-0 xl:border-r border-neutral-200 dark:border-dark-border-primary flex flex-col">
          <div className="p-3 border-b border-neutral-200 dark:border-dark-border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary dark:bg-primary-dark text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-neutral-900 dark:text-dark-text-primary font-heading">
                    Brainstorm
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                    {sessions.length} session{sessions.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                onClick={createSession}
                className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-light dark:bg-primary-dark dark:hover:bg-primary/90 transition-colors"
                title="New Brainstorm session"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
            {isLoading ? (
              <SessionSkeleton />
            ) : sessions.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500 dark:text-dark-text-secondary">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-dark-text-tertiary" />
                <button onClick={createSession} className="btn-primary mt-2">
                  Start Brainstorm
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className={`group relative rounded-lg border transition-colors ${
                      activeSession?.id === session.id
                        ? 'border-primary bg-primary-muted dark:border-primary-dark dark:bg-primary/15'
                        : 'border-transparent hover:bg-neutral-100 dark:hover:bg-dark-hover-primary'
                    }`}
                  >
                    <button
                      onClick={() => renamingId !== session.id && loadSession(session.id)}
                      className="w-full text-left p-2.5 pr-9"
                    >
                      {renamingId === session.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          maxLength={MAX_TITLE_LENGTH}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={() => saveRename(session)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveRename(session)
                            if (event.key === 'Escape') cancelRename()
                          }}
                          className="input-base !h-8 !py-1 !px-2"
                        />
                      ) : (
                        <p className="font-semibold text-[13px] text-neutral-900 dark:text-dark-text-primary truncate">
                          {session.title}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-dark-text-tertiary">
                        <span>{session.message_count} msgs</span>
                        <span>{session.file_count} files</span>
                        <span>{formatDate(session.updated_at)}</span>
                      </div>
                    </button>

                    <div className="absolute right-1.5 top-1.5">
                      {renamingId === session.id ? (
                        <div className="flex items-center gap-1">
                          <button onMouseDown={(e) => e.preventDefault()} onClick={() => saveRename(session)} className="p-1.5 rounded-md hover:bg-white/70 dark:hover:bg-dark-bg-secondary" title="Save title">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onMouseDown={(e) => e.preventDefault()} onClick={cancelRename} className="p-1.5 rounded-md hover:bg-white/70 dark:hover:bg-dark-bg-secondary" title="Cancel rename">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              setSessionMenuId((current) => current === session.id ? null : session.id)
                            }}
                            className="p-1.5 rounded-md text-neutral-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-neutral-800 hover:bg-white dark:hover:bg-dark-bg-secondary dark:hover:text-dark-text-primary transition"
                            title="Session actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {sessionMenuId === session.id && (
                            <div className="absolute right-0 mt-1 w-32 rounded-lg border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg z-20 overflow-hidden">
                              <button onClick={() => startRename(session)} className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-dark-hover-primary flex items-center gap-2">
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              <button onClick={() => { setSessionMenuId(null); setDeleteTarget(session) }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>

        <main className="min-h-0 flex flex-col bg-neutral-50 dark:bg-dark-bg-primary">
          {activeSession ? (
            <>
              <div className="px-7 py-4 border-b border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary truncate">
                    {activeSession.title}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                    Context: {contextLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <LengthControl value={responseLength} onChange={setResponseLength} />
                  <ActionButton icon={FileText} label="Summary" loading={actionLoading === 'summarize'} onClick={() => runAction('summarize')} />
                  <ActionButton icon={FileText} label="Notes" loading={actionLoading === 'notes'} onClick={() => runAction('notes')} />
                  <ActionButton icon={Network} label="Mindmap" loading={actionLoading === 'mindmap'} onClick={() => runAction('mindmap')} />
                  <ActionButton icon={Layers} label="Cards" loading={actionLoading === 'flashcards'} onClick={() => runAction('flashcards')} />
                </div>
              </div>

              <ErrorBanner error={error} onClose={() => setError(null)} />

              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-7 sm:px-8 lg:px-10 space-y-7">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-secondary-light dark:bg-secondary/20 text-secondary dark:text-secondary-dark flex items-center justify-center">
                        <Bot className="w-8 h-8" />
                      </div>
                      <h3 className="font-heading font-bold text-neutral-900 dark:text-dark-text-primary">
                        Ready when you are
                      </h3>
                      <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
                        Upload context or start with a rough idea. Brainstorm will help shape it into useful understanding.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}

                {isSending && <ThinkingSkeleton />}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary px-6 py-4 sm:px-8 lg:px-10">
                <div className="mx-auto flex max-w-5xl items-end gap-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask about your uploads or explore an idea..."
                    className="flex-1 min-h-[48px] max-h-36 resize-none input-base !h-auto !py-3"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isSending}
                    className="h-12 w-12 rounded-lg bg-primary dark:bg-primary-dark text-white flex items-center justify-center hover:bg-primary-light dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    title="Send message"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <Sparkles className="w-16 h-16 mx-auto mb-5 text-primary dark:text-primary-dark" />
                <h2 className="text-2xl font-heading font-bold text-neutral-900 dark:text-dark-text-primary">
                  Brainstorm Workspace
                </h2>
                <button onClick={createSession} className="btn-primary mt-6">
                  Start Brainstorm
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="min-h-0 border-t xl:border-t-0 xl:border-l border-neutral-200 dark:border-dark-border-primary flex flex-col bg-white dark:bg-dark-bg-secondary">
          <div className="p-3 border-b border-neutral-200 dark:border-dark-border-primary">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(event) => event.target.files && uploadFiles(event.target.files)}
            />
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`rounded-lg border border-dashed p-3 transition-colors ${
                dragActive
                  ? 'border-secondary bg-secondary-light dark:bg-secondary/20'
                  : 'border-neutral-300 dark:border-dark-border-secondary bg-neutral-50 dark:bg-dark-bg-tertiary hover:border-secondary/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border-primary flex items-center justify-center shrink-0">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary dark:text-primary-dark" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-primary dark:text-primary-dark" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
                    Upload context
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary truncate">
                    PDF, image, text, markdown, DOCX. Max 15 MB.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeSession || isUploading}
                  className="btn-outlined !px-2.5 !py-2 disabled:opacity-50"
                >
                  Browse
                </button>
              </div>
              {isUploading && (
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-dark-bg-primary overflow-hidden">
                    <div className="h-full bg-primary dark:bg-primary-dark transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-neutral-500 dark:text-dark-text-tertiary">
                    Uploading and extracting context... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-b border-neutral-200 dark:border-dark-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-heading !text-base">Context Files</h3>
                <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                  Select files to narrow AI context.
                </p>
              </div>
              {selectedFileIds.length > 0 && (
                <button
                  onClick={() => setSelectedFileIds([])}
                  className="text-xs font-semibold text-primary dark:text-primary-dark hover:underline"
                >
                  Use all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
            {files.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500 dark:text-dark-text-secondary">
                <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-dark-text-tertiary" />
                No uploads yet
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    selected={selectedFileIds.includes(file.id)}
                    onToggle={() => toggleFile(file.id)}
                    onDelete={() => deleteFile(file.id)}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDeleteModal
        session={deleteTarget}
        loading={deletingSessionId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSession}
      />
    </div>
  )
}

function LengthControl({
  value,
  onChange,
}: {
  value: ResponseLength
  onChange: (value: ResponseLength) => void
}) {
  return (
    <div className="flex items-center rounded-lg border border-neutral-200 dark:border-dark-border-primary bg-neutral-50 dark:bg-dark-bg-tertiary p-1">
      {(['short', 'balanced', 'detailed'] as ResponseLength[]).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`px-2 py-1.5 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-semibold capitalize transition-colors ${
            value === option
              ? 'bg-white dark:bg-dark-bg-secondary text-neutral-900 dark:text-dark-text-primary shadow-sm'
              : 'text-neutral-500 dark:text-dark-text-tertiary hover:text-neutral-900 dark:hover:text-dark-text-primary'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: ElementType
  label: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-tertiary text-neutral-700 dark:text-dark-text-primary hover:bg-neutral-100 dark:hover:bg-dark-hover-primary disabled:opacity-60 transition-colors px-3 py-2"
      title={label}
    >
      <span className="flex items-center justify-center gap-2 text-xs font-semibold">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </span>
    </button>
  )
}

function MessageBubble({ message }: { message: BrainstormMessage }) {
  const isAssistant = message.role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`${isAssistant ? 'w-full max-w-5xl' : 'max-w-[82%] lg:max-w-[64%]'} ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-3 border ${
            message.role === 'user'
              ? 'bg-primary text-white border-primary dark:bg-primary-dark dark:border-primary-dark'
              : 'bg-white dark:bg-dark-bg-secondary border-neutral-200 dark:border-dark-border-primary text-neutral-900 dark:text-dark-text-primary shadow-sm px-5 py-5 sm:px-6 sm:py-6'
          }`}
        >
          {message.role === 'assistant' ? (
            <StudyMarkdownRenderer
              className="prose-custom prose-brainstorm dark:prose-invert"
              content={message.content}
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
          )}
        </div>
        <p className={`mt-1.5 text-xs text-neutral-400 ${message.role === 'user' ? 'text-right' : ''}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}

function ThinkingSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary px-4 py-3 min-w-[16rem]">
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-dark-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-primary dark:text-primary-dark" />
          Thinking through the context...
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded bg-neutral-200 dark:bg-dark-bg-tertiary animate-pulse" />
          <div className="h-2 w-3/4 rounded bg-neutral-200 dark:bg-dark-bg-tertiary animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function SessionSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-neutral-100 dark:border-dark-border-primary p-3">
          <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-dark-bg-tertiary animate-pulse" />
          <div className="mt-3 h-3 w-1/2 rounded bg-neutral-100 dark:bg-dark-bg-tertiary animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ErrorBanner({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-5 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FileCard({
  file,
  selected,
  onToggle,
  onDelete,
  formatFileSize,
}: {
  file: BrainstormFile
  selected: boolean
  onToggle: () => void
  onDelete: () => void
  formatFileSize: (size: number) => string
}) {
  const Icon = isImageFile(file) ? ImageIcon : file.file_type === 'pdf' ? FileText : File
  const failed = file.upload_status === 'failed'
  const processing = file.upload_status === 'processing'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={`rounded-lg border p-2.5 transition-colors ${
        selected
          ? 'border-secondary bg-secondary-light dark:bg-secondary/20'
          : 'border-neutral-200 dark:border-dark-border-primary bg-neutral-50 dark:bg-dark-bg-tertiary hover:border-neutral-300 dark:hover:border-dark-border-secondary'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
            selected
              ? 'bg-secondary text-white border-secondary'
              : 'bg-white dark:bg-dark-bg-secondary border-neutral-200 dark:border-dark-border-primary text-neutral-500 dark:text-dark-text-secondary'
          }`}
          title={selected ? 'Selected for context' : 'Select for context'}
        >
          <Icon className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-900 dark:text-dark-text-primary truncate">
            {file.original_filename}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-neutral-500 dark:text-dark-text-tertiary">
            <span className="uppercase">{file.file_type}</span>
            <span aria-hidden="true">·</span>
            <span>{formatFileSize(file.file_size)}</span>
            {file.chunk_count > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{file.chunk_count} chunks</span>
              </>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
            {file.upload_status === 'ready' && (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Extracted
              </span>
            )}
            {processing && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Extracting
              </span>
            )}
            {failed && (
              <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Extraction failed
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete file"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {file.extracted_text_preview && !isImageFile(file) && (
        <p className="mt-2 pl-10 text-[11px] leading-relaxed text-neutral-500 dark:text-dark-text-tertiary line-clamp-2">
          {file.extracted_text_preview}
        </p>
      )}
    </motion.div>
  )
}

function ConfirmDeleteModal({
  session,
  loading,
  onCancel,
  onConfirm,
}: {
  session: BrainstormSession | null
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-neutral-950/40 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            className="w-full max-w-md rounded-lg border border-neutral-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                  Delete session?
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-dark-text-secondary">
                  This will remove "{session.title}", its messages, uploaded file links, extracted chunks, and stored files.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onCancel} disabled={loading} className="btn-outlined">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function isImageFile(file: BrainstormFile) {
  return ['png', 'jpg', 'jpeg'].includes(file.file_type)
}
