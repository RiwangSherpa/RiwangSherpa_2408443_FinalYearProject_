import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Network,
  GitBranch,
  ArrowLeft,
  Loader2,
  Tag,
  Eye,
  Edit3,
  Link as LinkIcon,
  MoreHorizontal,
  Info,
  Calendar,
  X,
  PanelRightOpen,
  PanelRightClose,
  Columns,
} from 'lucide-react'
import { notesApi, goalsApi, mindmapsApi, flashcardsApi } from '../lib/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import InputDialog from '../components/ui/InputDialog'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NoteGraph from '../components/notes/NoteGraph'
import MindMap from '../components/notes/MindMap'
import { useToast } from '../components/ui/ToastContext'
import { useAchievementNotifications } from '../hooks/useAchievementNotifications'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface Note {
  id: number
  user_id: number
  goal_id?: number
  title: string
  content: string
  tags: string[]
  is_auto_generated: boolean
  source_type?: string
  created_at: string
  updated_at: string
  outgoing_links?: Note[]
  incoming_links?: Note[]
}

export default function Notes() {
  const { noteId } = useParams<{ noteId?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { checkForAchievements } = useAchievementNotifications()

  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [showGraph, setShowGraph] = useState(false)
  const [backlinks, setBacklinks] = useState<{ id: number; title: string; preview: string }[]>([])
  const [showLinkAutocomplete, setShowLinkAutocomplete] = useState(false)
  const [linkSuggestions, setLinkSuggestions] = useState<{ id: number; title: string }[]>([])
  const [goals, setGoals] = useState<{ id: number; title: string }[]>([])
  const [graphData, setGraphData] = useState<{ nodes: Array<{id: number; title: string; tag_count: number}>; edges: Array<{source: number; target: number}> } | null>(null)
  const [showMindMap, setShowMindMap] = useState(false)
  const [artifactLoading, setArtifactLoading] = useState<'mindmap' | 'flashcards' | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingNote, setCreatingNote] = useState(false)
  const [createError, setCreateError] = useState('')
  const [renameTarget, setRenameTarget] = useState<Note | null>(null)
  const [renamingNote, setRenamingNote] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState(false)
  const [showDetailsPanel, setShowDetailsPanel] = useState(true)
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false)
  const [noteMenuOpenId, setNoteMenuOpenId] = useState<number | null>(null)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotes()
    loadGoals()
  }, [searchQuery, selectedTag])

  useEffect(() => {
    if (noteId) {
      loadNote(parseInt(noteId))
    } else {
      setCurrentNote(null)
    }
  }, [noteId])

  useEffect(() => {
    if (showGraph) {
      loadGraphData()
    }
  }, [showGraph])

  useEffect(() => {
    if (!currentNote) return
    setToolbarMenuOpen(false)
    setNoteMenuOpenId(null)
    setShowDetailsPanel(Boolean(currentNote.outgoing_links?.length || backlinks.length))
  }, [currentNote?.id, currentNote?.outgoing_links?.length, backlinks.length])

  const loadNotes = async () => {
    try {
      const response = await notesApi.getAll({
        search: searchQuery || undefined,
        tag: selectedTag || undefined
      })
      setNotes(response.data)
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setIsLoading(false)
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

  const loadNote = async (id: number) => {
    try {
      const response = await notesApi.getById(id)
      setCurrentNote(response.data)
      loadBacklinks(id)
    } catch (error) {
      console.error('Failed to load note:', error)
    }
  }

  const loadBacklinks = async (id: number) => {
    try {
      const response = await notesApi.getBacklinks(id)
      setBacklinks(response.data)
    } catch (error) {
      console.error('Failed to load backlinks:', error)
    }
  }

  const loadGraphData = async () => {
    try {
      const response = await notesApi.getGraph()
      setGraphData(response.data)
    } catch (error) {
      console.error('Failed to load graph:', error)
    }
  }

  const createNote = () => {
    setCreateError('')
    setCreateDialogOpen(true)
  }

  const confirmCreateNote = async (title: string) => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setCreateError('Note title is required.')
      return
    }
    try {
      setCreatingNote(true)
      const response = await notesApi.create({ title: trimmedTitle, content: '' })
      setNotes((current) => [response.data, ...current.filter((note) => note.id !== response.data.id)])
      setCurrentNote(response.data)
      setCreateDialogOpen(false)
      navigate(`/notes/${response.data.id}`)
      await Promise.allSettled([loadNotes(), checkForAchievements()])
      toast.success('Note created.')
    } catch (error: any) {
      console.error('Failed to create note:', error)
      setCreateError(error.response?.data?.detail || 'Failed to create note. Title might already exist.')
    } finally {
      setCreatingNote(false)
    }
  }

  const renameNote = (note: Note) => {
    setRenameError('')
    setRenameTarget(note)
  }

  const confirmRenameNote = async (nextTitle: string) => {
    if (!renameTarget) return
    const trimmedTitle = nextTitle.trim()
    if (!trimmedTitle) {
      setRenameError('Note title is required.')
      return
    }
    if (trimmedTitle === renameTarget.title) {
      setRenameTarget(null)
      return
    }
    try {
      setRenamingNote(true)
      const response = await notesApi.update(renameTarget.id, { title: trimmedTitle })
      if (currentNote?.id === renameTarget.id) {
        setCurrentNote((prev) => (prev ? { ...prev, ...response.data } : prev))
      }
      setRenameTarget(null)
      await loadNotes()
      toast.success('Note renamed.')
    } catch (error: any) {
      console.error('Failed to rename note:', error)
      setRenameError(error.response?.data?.detail || 'Failed to rename note. A note with that title may already exist.')
    } finally {
      setRenamingNote(false)
    }
  }

  const updateNote = async (updates: Partial<Note>) => {
    if (!currentNote) return

    setIsSaving(true)
    try {
      const response = await notesApi.update(currentNote.id, updates)
      setCurrentNote({ ...currentNote, ...response.data })
      loadNotes()
    } catch (error) {
      console.error('Failed to update note:', error)
      toast.error('Failed to save note changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteNote = (note: Note) => {
    setDeleteTarget(note)
  }

  const confirmDeleteNote = async () => {
    if (!deleteTarget) return
    try {
      setDeletingNote(true)
      await notesApi.delete(deleteTarget.id)
      if (currentNote?.id === deleteTarget.id) {
        navigate('/notes')
      }
      setNotes((current) => current.filter((note) => note.id !== deleteTarget.id))
      setDeleteTarget(null)
      await loadNotes()
      toast.success('Note deleted.')
    } catch (error: any) {
      console.error('Failed to delete note:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete note.')
    } finally {
      setDeletingNote(false)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    setCurrentNote(prev => prev ? { ...prev, content } : null)

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = content.substring(0, cursorPosition)
    const match = textBeforeCursor.match(/\[\[([^\]]*)$/)

    if (match) {
      setShowLinkAutocomplete(true)
      loadLinkSuggestions(match[1])
    } else {
      setShowLinkAutocomplete(false)
    }
  }

  const loadLinkSuggestions = async (query: string) => {
    if (!query) {
      setLinkSuggestions([])
      return
    }
    try {
      const response = await notesApi.autocomplete(query)
      setLinkSuggestions(response.data.filter((n: { id: number }) => n.id !== currentNote?.id))
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }

  const insertLink = (title: string) => {
    if (!editorRef.current || !currentNote) return

    const textarea = editorRef.current
    const cursorPosition = textarea.selectionStart
    const content = currentNote.content

    const textBeforeCursor = content.substring(0, cursorPosition)
    const match = textBeforeCursor.match(/\[\[([^\]]*)$/)

    if (match) {
      const newTextBefore = textBeforeCursor.substring(0, match.index) + `[[${title}]]`
      const newContent = newTextBefore + content.substring(cursorPosition)

      setCurrentNote(prev => prev ? { ...prev, content: newContent } : null)
      updateNote({ content: newContent })
    }

    setShowLinkAutocomplete(false)
    textarea.focus()
  }

  const generateMindmapFromNote = async () => {
    if (!currentNote || artifactLoading) return
    try {
      setArtifactLoading('mindmap')
      await mindmapsApi.generate({
        source_type: 'note',
        source_id: currentNote.id,
        title: `${currentNote.title} Mindmap`,
      })
      await checkForAchievements()
      navigate('/mindmap')
    } catch (error) {
      console.error('Failed to generate mindmap:', error)
      toast.error('Failed to generate mindmap from this note.')
    } finally {
      setArtifactLoading(null)
    }
  }

  const generateFlashcardsFromNote = async () => {
    if (!currentNote || artifactLoading) return
    try {
      setArtifactLoading('flashcards')
      await flashcardsApi.generate({
        source_type: 'note',
        source_id: currentNote.id,
        title: `${currentNote.title} Flashcards`,
        count: 12,
      })
      await checkForAchievements()
      navigate('/flashcards')
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
      toast.error('Failed to generate flashcards from this note.')
    } finally {
      setArtifactLoading(null)
    }
  }

  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('[[') && href?.endsWith(']]')) {
              const title = href.slice(2, -2)
              const linkedNote = notes.find(n => n.title.toLowerCase() === title.toLowerCase())
              return (
                <button
                  onClick={() => linkedNote && navigate(`/notes/${linkedNote.id}`)}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {children}
                </button>
              )
            }
            return <a href={href} className="text-primary-600 hover:underline">{children}</a>
          }
        }}
      >
        {content.replace(/\[\[([^\]]+)\]\]/g, '[[[$1]]]')}
      </ReactMarkdown>
    )
  }

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)))
  const hasLinkedNotes = Boolean(currentNote?.outgoing_links?.length || backlinks.length)
  const notePreview = (note: Note) => note.content.replace(/\s+/g, ' ').trim().slice(0, 110)
  const formatNoteDate = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-card border border-neutral-200 bg-neutral-50 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-primary lg:grid lg:grid-cols-[20rem_minmax(0,1fr)_auto]">
      {/* Sidebar */}
      <div className="flex max-h-[22rem] flex-col border-b border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="border-b border-neutral-200 p-4 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-dark-text-primary flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <FileText className="w-5 h-5" />
              </span>
              Notes
            </h1>
            <Button variant="primary" size="sm" onClick={createNote} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline lg:hidden xl:inline">New</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-neutral-500 dark:border-dark-border-primary dark:bg-dark-bg-tertiary dark:text-dark-text-tertiary">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold text-neutral-800 dark:text-dark-text-primary">No notes yet</p>
              <p className="mt-1 text-sm">Capture ideas and connect them as you study.</p>
              <Button variant="primary" size="sm" onClick={createNote} className="mt-4">
                Create your first note
              </Button>
            </div>
          ) : (
            notes.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative rounded-lg border p-3 cursor-pointer transition-all ${
                  currentNote?.id === note.id
                    ? 'border-primary bg-primary-muted/60 shadow-sm dark:border-primary-dark dark:bg-primary/10'
                    : 'border-transparent bg-white hover:border-neutral-200 hover:bg-neutral-50 dark:bg-dark-bg-secondary dark:hover:border-dark-border-primary dark:hover:bg-dark-bg-tertiary'
                }`}
                onClick={() => {
                  setNoteMenuOpenId(null)
                  navigate(`/notes/${note.id}`)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 font-semibold text-neutral-900 dark:text-dark-text-primary">
                      {note.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500 dark:text-dark-text-tertiary">
                      {notePreview(note) || 'No content'}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNoteMenuOpenId(noteMenuOpenId === note.id ? null : note.id)
                      }}
                      className="rounded-md p-1.5 text-neutral-400 opacity-100 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-dark-bg-primary dark:hover:text-dark-text-primary sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`More actions for ${note.title}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-neutral-400 dark:text-dark-text-tertiary">
                    {formatNoteDate(note.updated_at)}
                  </span>
                  {note.is_auto_generated && (
                    <Badge variant="info" size="sm">Auto</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 overflow-hidden">
                  {note.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                  ))}
                </div>
                {noteMenuOpenId === note.id && (
                  <div
                    className="absolute right-3 top-10 z-20 w-44 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-dark-border-primary dark:bg-dark-bg-secondary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNoteMenuOpenId(null)
                        renameNote(note)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                    >
                      <Edit3 className="h-4 w-4" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNoteMenuOpenId(null)
                        deleteNote(note)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {allTags.length > 0 && (
          <div className="hidden border-t border-neutral-200 p-4 dark:border-dark-border-primary lg:block">
            <h4 className="text-xs font-medium text-neutral-500 dark:text-dark-text-tertiary mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    selectedTag === tag
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-neutral-100 dark:bg-dark-bg-tertiary text-neutral-600 dark:text-dark-text-secondary hover:bg-neutral-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentNote ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-dark-border-primary dark:bg-dark-bg-secondary">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-lg font-bold text-neutral-950 dark:text-dark-text-primary">
                    {currentNote.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-400 dark:text-dark-text-tertiary">
                    Updated {formatNoteDate(currentNote.updated_at) || 'recently'}
                  </p>
                </div>
                {isSaving && (
                  <span className="hidden items-center gap-1 text-xs text-neutral-400 sm:flex">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewMode === 'edit'
                        ? 'bg-white text-primary shadow-sm dark:bg-dark-bg-secondary dark:text-primary-dark'
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-dark-text-primary'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewMode === 'split'
                        ? 'bg-white text-primary shadow-sm dark:bg-dark-bg-secondary dark:text-primary-dark'
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-dark-text-primary'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-white text-primary shadow-sm dark:bg-dark-bg-secondary dark:text-primary-dark'
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-dark-text-primary'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsPanel((value) => !value)}
                  className="hidden xl:inline-flex"
                  title={showDetailsPanel ? 'Hide linked notes' : 'Show linked notes'}
                >
                  {showDetailsPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setToolbarMenuOpen((value) => !value)}
                    title="More note actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  {toolbarMenuOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-dark-border-primary dark:bg-dark-bg-secondary">
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          renameNote(currentNote)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                      >
                        <Edit3 className="h-4 w-4" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          setShowGraph(true)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                      >
                        <Network className="h-4 w-4" />
                        Open graph
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          setShowMindMap(true)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                      >
                        <GitBranch className="h-4 w-4" />
                        Open note map
                      </button>
                      <div className="my-1 border-t border-neutral-100 dark:border-dark-border-primary" />
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          generateMindmapFromNote()
                        }}
                        disabled={artifactLoading !== null}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                      >
                        {artifactLoading === 'mindmap' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                        Generate mindmap
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          generateFlashcardsFromNote()
                        }}
                        disabled={artifactLoading !== null}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
                      >
                        {artifactLoading === 'flashcards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Generate flashcards
                      </button>
                      <div className="my-1 border-t border-neutral-100 dark:border-dark-border-primary" />
                      <button
                        type="button"
                        onClick={() => {
                          setToolbarMenuOpen(false)
                          deleteNote(currentNote)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden bg-neutral-50 dark:bg-dark-bg-primary">
              <div className={`h-full ${viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2' : 'flex'}`}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`relative min-h-[34rem] ${viewMode === 'split' ? 'border-b border-neutral-200 dark:border-dark-border-primary lg:border-b-0 lg:border-r' : 'flex-1'}`}>
                  <textarea
                    ref={editorRef}
                    value={currentNote.content}
                    onChange={handleContentChange}
                    onBlur={() => updateNote({ content: currentNote.content })}
                    placeholder="Start writing your note..."
                    className="h-full min-h-[34rem] w-full resize-none bg-white p-6 font-mono text-sm leading-7 text-neutral-900 outline-none dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                    spellCheck={false}
                  />

                  {/* Link Autocomplete */}
                  <AnimatePresence>
                    {showLinkAutocomplete && linkSuggestions.length > 0 && (
                      <motion.div
                        ref={autocompleteRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-4 left-4 right-4 bg-white dark:bg-dark-bg-secondary rounded-lg shadow-lg border border-neutral-200 dark:border-dark-border max-h-48 overflow-y-auto z-50"
                      >
                        {linkSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id}
                            onClick={() => insertLink(suggestion.title)}
                            className={`w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary flex items-center gap-2 ${
                              index === 0 ? 'rounded-t-lg' : ''
                            }`}
                          >
                            <LinkIcon className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-900 dark:text-dark-text-primary">
                              {suggestion.title}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-bg-secondary">
                  <div className="prose prose-sm max-w-none p-6 dark:prose-invert">
                    {currentNote.content ? (
                      renderMarkdown(currentNote.content)
                    ) : (
                      <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center not-prose dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                        <Eye className="mb-4 h-12 w-12 text-neutral-300 dark:text-dark-text-tertiary" />
                        <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">Nothing to preview yet</h3>
                        <p className="mt-2 max-w-sm text-sm text-neutral-500 dark:text-dark-text-secondary">
                          Switch to Edit mode and start writing your note.
                        </p>
                        <Button className="mt-5" size="sm" onClick={() => setViewMode('edit')}>
                          Start Editing
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-white dark:bg-dark-bg-secondary">
            <div className="max-w-sm rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
              <FileText className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <p className="font-semibold text-neutral-900 dark:text-dark-text-primary">No note selected</p>
              <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-tertiary">
                Select a note or create a new one
              </p>
              <Button className="mt-5" onClick={createNote}>
                <Plus className="mr-2 h-4 w-4" />
                Create note
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Backlinks & Info */}
      {currentNote && showDetailsPanel && (
        <div className="hidden w-[20rem] flex-col border-l border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary xl:flex">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-dark-border-primary">
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-dark-text-primary flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary dark:text-primary-dark" />
                Linked Notes
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-dark-text-secondary">
                Connections and note details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDetailsPanel(false)}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-dark-bg-tertiary dark:hover:text-dark-text-primary"
              aria-label="Hide linked notes panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!hasLinkedNotes && (
              <div className="mb-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
                <LinkIcon className="mx-auto mb-3 h-8 w-8 text-neutral-300 dark:text-dark-text-tertiary" />
                <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">No linked notes yet</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-dark-text-secondary">
                  Use [[note name]] to connect notes.
                </p>
              </div>
            )}

            {/* Outgoing Links */}
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                Outgoing Links ({currentNote.outgoing_links?.length || 0})
              </h4>
              {currentNote.outgoing_links && currentNote.outgoing_links.length > 0 ? (
                <div className="space-y-2">
                  {currentNote.outgoing_links.map(linkedNote => (
                    <button
                      key={linkedNote.id}
                      onClick={() => navigate(`/notes/${linkedNote.id}`)}
                      className="w-full rounded-lg border border-neutral-100 p-2 text-left text-sm text-primary transition hover:border-primary-muted hover:bg-primary-muted/50 dark:border-dark-border-primary dark:text-primary-dark dark:hover:bg-primary/10"
                    >
                      <LinkIcon className="mr-1 inline h-3 w-3" />
                      {linkedNote.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-dark-text-secondary">No outgoing links.</p>
              )}
            </div>

            {/* Backlinks */}
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                Backlinks ({backlinks.length})
              </h4>
              {backlinks.length > 0 ? (
                <div className="space-y-2">
                  {backlinks.map(backlink => (
                    <button
                      key={backlink.id}
                      onClick={() => navigate(`/notes/${backlink.id}`)}
                      className="w-full rounded-lg border border-neutral-100 p-2 text-left transition hover:border-primary-muted hover:bg-neutral-50 dark:border-dark-border-primary dark:hover:bg-dark-bg-tertiary"
                    >
                      <p className="text-sm font-medium text-primary dark:text-primary-dark">
                        <LinkIcon className="mr-1 inline h-3 w-3" />
                        {backlink.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mt-1 line-clamp-2">
                        {backlink.preview}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-dark-text-secondary">No backlinks yet.</p>
              )}
            </div>

            {/* Metadata */}
            <div className="border-t border-neutral-200 pt-4 dark:border-dark-border-primary">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                <Info className="h-3.5 w-3.5" />
                Metadata
              </h4>
              <div className="space-y-3 text-xs text-neutral-600 dark:text-dark-text-tertiary">
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  Created {new Date(currentNote.created_at).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  Updated {new Date(currentNote.updated_at).toLocaleDateString()}
                </p>
                {currentNote.goal_id && (
                  <p>Goal: {goals.find(g => g.id === currentNote.goal_id)?.title || 'Unknown'}</p>
                )}
                {currentNote.is_auto_generated && (
                  <p className="text-amber-600">Auto-generated</p>
                )}
                {currentNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {currentNote.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graph View Modal */}
      {showGraph && graphData && (
        <NoteGraph
          nodes={graphData.nodes}
          edges={graphData.edges}
          onNodeClick={(id) => {
            navigate(`/notes/${id}`)
            setShowGraph(false)
          }}
          onClose={() => setShowGraph(false)}
        />
      )}

      {/* Mind Map Modal */}
      {showMindMap && currentNote && (
        <MindMap
          rootNote={{ id: currentNote.id, title: currentNote.title }}
          linkedNotes={currentNote.outgoing_links || []}
          onNodeClick={(id) => {
            navigate(`/notes/${id}`)
            setShowMindMap(false)
          }}
          onClose={() => setShowMindMap(false)}
        />
      )}

      <InputDialog
        isOpen={createDialogOpen}
        title="Create New Note"
        inputLabel="Note title"
        placeholder="e.g., React Hooks Summary"
        confirmLabel="Create Note"
        loading={creatingNote}
        validationError={createError}
        onConfirm={confirmCreateNote}
        onCancel={() => {
          if (!creatingNote) setCreateDialogOpen(false)
        }}
      />

      <InputDialog
        isOpen={Boolean(renameTarget)}
        title="Rename Note"
        description="Give this note a clear, searchable title."
        inputLabel="Note title"
        defaultValue={renameTarget?.title || ''}
        confirmLabel="Rename"
        loading={renamingNote}
        validationError={renameError}
        onConfirm={confirmRenameNote}
        onCancel={() => {
          if (!renamingNote) setRenameTarget(null)
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete note?"
        description={`This will permanently delete "${deleteTarget?.title || 'this note'}" and remove its note links.`}
        confirmLabel="Delete"
        destructive
        loading={deletingNote}
        onConfirm={confirmDeleteNote}
        onCancel={() => {
          if (!deletingNote) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
