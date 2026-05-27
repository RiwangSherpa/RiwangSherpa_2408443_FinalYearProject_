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
  Link as LinkIcon
} from 'lucide-react'
import { notesApi, goalsApi, mindmapsApi, flashcardsApi } from '../lib/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import NoteGraph from '../components/notes/NoteGraph'
import MindMap from '../components/notes/MindMap'
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

  const createNote = async () => {
    const title = prompt('Enter note title:')
    if (!title) return

    try {
      const response = await notesApi.create({ title, content: '' })
      navigate(`/notes/${response.data.id}`)
      loadNotes()
    } catch (error) {
      console.error('Failed to create note:', error)
      alert('Failed to create note. Title might already exist.')
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
    } finally {
      setIsSaving(false)
    }
  }

  const deleteNote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await notesApi.delete(id)
      if (currentNote?.id === id) {
        navigate('/notes')
      }
      loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
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
      navigate('/mindmap')
    } catch (error) {
      console.error('Failed to generate mindmap:', error)
      alert('Failed to generate mindmap from this note.')
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
      navigate('/flashcards')
    } catch (error) {
      console.error('Failed to generate flashcards:', error)
      alert('Failed to generate flashcards from this note.')
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg-primary flex">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-dark-bg-secondary border-r border-neutral-200 dark:border-dark-border flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-dark-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes
            </h1>
            <Button variant="primary" size="sm" onClick={createNote} className="!p-2">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-dark-bg-tertiary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-dark-text-tertiary">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notes yet</p>
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
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentNote?.id === note.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
                    : 'hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary'
                }`}
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-neutral-900 dark:text-dark-text-primary line-clamp-1">
                    {note.title}
                  </h3>
                  {note.is_auto_generated && (
                    <Badge variant="info" size="sm">Auto</Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mt-1 line-clamp-2">
                  {note.content.substring(0, 100) || 'No content'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {note.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {allTags.length > 0 && (
          <div className="p-4 border-t border-neutral-200 dark:border-dark-border">
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
            <div className="h-14 border-b border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <input
                  type="text"
                  value={currentNote.title}
                  onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                  onBlur={() => updateNote({ title: currentNote.title })}
                  className="font-semibold text-neutral-900 dark:text-dark-text-primary bg-transparent border-none focus:outline-none focus:ring-0 min-w-[200px]"
                />
                {isSaving && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-neutral-100 dark:bg-dark-bg-tertiary rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'edit'
                        ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'split'
                        ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    Preview
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGraph(true)}
                  className={showGraph ? 'text-primary-600' : ''}
                >
                  <Network className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMindMap(true)}
                  className={showMindMap ? 'text-primary-600' : ''}
                >
                  <GitBranch className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateMindmapFromNote}
                  disabled={artifactLoading !== null}
                >
                  {artifactLoading === 'mindmap' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateFlashcardsFromNote}
                  disabled={artifactLoading !== null}
                >
                  {artifactLoading === 'flashcards' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => deleteNote(currentNote.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`relative ${viewMode === 'split' ? 'w-1/2 border-r' : 'flex-1'} border-neutral-200 dark:border-dark-border`}>
                  <textarea
                    ref={editorRef}
                    value={currentNote.content}
                    onChange={handleContentChange}
                    onBlur={() => updateNote({ content: currentNote.content })}
                    placeholder="Start writing... Use [[note title]] to link notes"
                    className="w-full h-full p-4 resize-none focus:outline-none bg-white dark:bg-dark-bg-primary text-neutral-900 dark:text-dark-text-primary font-mono text-sm leading-relaxed"
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
                <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto`}>
                  <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                    {currentNote.content ? (
                      renderMarkdown(currentNote.content)
                    ) : (
                      <p className="text-neutral-400 italic">Nothing to preview yet...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-500 dark:text-dark-text-tertiary">
                Select a note or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Backlinks & Info */}
      {currentNote && (
        <div className="w-72 bg-white dark:bg-dark-bg-secondary border-l border-neutral-200 dark:border-dark-border flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-dark-border">
            <h3 className="font-medium text-neutral-900 dark:text-dark-text-primary flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Linked Notes
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Outgoing Links */}
            {currentNote.outgoing_links && currentNote.outgoing_links.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-neutral-500 dark:text-dark-text-tertiary mb-2">
                  Outgoing Links ({currentNote.outgoing_links.length})
                </h4>
                <div className="space-y-2">
                  {currentNote.outgoing_links.map(linkedNote => (
                    <button
                      key={linkedNote.id}
                      onClick={() => navigate(`/notes/${linkedNote.id}`)}
                      className="w-full text-left p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary text-sm text-primary-600 dark:text-primary-400"
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" />
                      {linkedNote.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Backlinks */}
            {backlinks.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-neutral-500 dark:text-dark-text-tertiary mb-2">
                  Backlinks ({backlinks.length})
                </h4>
                <div className="space-y-2">
                  {backlinks.map(backlink => (
                    <button
                      key={backlink.id}
                      onClick={() => navigate(`/notes/${backlink.id}`)}
                      className="w-full text-left p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-bg-tertiary"
                    >
                      <p className="text-sm text-primary-600 dark:text-primary-400">
                        <LinkIcon className="w-3 h-3 inline mr-1" />
                        {backlink.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary mt-1 line-clamp-2">
                        {backlink.preview}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-neutral-200 dark:border-dark-border pt-4">
              <h4 className="text-xs font-medium text-neutral-500 dark:text-dark-text-tertiary mb-2">
                Metadata
              </h4>
              <div className="space-y-1 text-xs text-neutral-600 dark:text-dark-text-tertiary">
                <p>Created: {new Date(currentNote.created_at).toLocaleDateString()}</p>
                <p>Updated: {new Date(currentNote.updated_at).toLocaleDateString()}</p>
                {currentNote.goal_id && (
                  <p>Goal: {goals.find(g => g.id === currentNote.goal_id)?.title || 'Unknown'}</p>
                )}
                {currentNote.is_auto_generated && (
                  <p className="text-amber-600">Auto-generated</p>
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
    </div>
  )
}
