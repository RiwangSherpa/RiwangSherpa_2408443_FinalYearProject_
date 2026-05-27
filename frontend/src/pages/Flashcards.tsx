import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Brain,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  ThumbsDown,
  Trash2,
} from 'lucide-react'
import { brainstormApi, flashcardsApi, notesApi } from '../lib/api'
import type { ArtifactSourceType, BrainstormSession, Flashcard, FlashcardDeck, Note } from '../types'

type SourceOption = {
  type: ArtifactSourceType
  id?: number
  label: string
  hint: string
}

type CardSessionStat = {
  attempts: number
  again: number
  difficult: number
  known: number
  lastRating: 'again' | 'difficult' | 'known' | null
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

export default function Flashcards() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [sessions, setSessions] = useState<BrainstormSession[]>([])
  const [sourceKey, setSourceKey] = useState('manual:manual')
  const [manualContent, setManualContent] = useState('')
  const [title, setTitle] = useState('')
  const [count, setCount] = useState(12)
  const [queue, setQueue] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [sessionStats, setSessionStats] = useState<Record<number, CardSessionStat>>({})
  const [reviewedCardIds, setReviewedCardIds] = useState<number[]>([])
  const [sessionFinished, setSessionFinished] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setQueue(activeDeck?.cards || [])
    setIndex(0)
    setFlipped(false)
    setSessionStats({})
    setReviewedCardIds([])
    setSessionFinished(false)
  }, [activeDeck])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const currentCard = queue[index]
      if (!currentCard) return
      if (event.key === ' ') {
        event.preventDefault()
        setFlipped((current) => !current)
      }
      if (event.key === '1') {
        event.preventDefault()
        review('again')
      }
      if (event.key === '2') {
        event.preventDefault()
        review('difficult')
      }
      if (event.key === '3') {
        event.preventDefault()
        review('known')
      }
      if (event.key === 'ArrowRight') advance()
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, queue, reviewing])

  const loadData = async () => {
    try {
      setLoading(true)
      const [decksResponse, notesResponse, sessionsResponse] = await Promise.all([
        flashcardsApi.getDecks(),
        notesApi.getAll(),
        brainstormApi.getSessions(),
      ])
      setDecks(decksResponse.data)
      setNotes(notesResponse.data)
      setSessions(sessionsResponse.data)
      if (decksResponse.data[0]) await selectDeck(decksResponse.data[0].id)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load flashcards.')
    } finally {
      setLoading(false)
    }
  }

  const sourceOptions = useMemo<SourceOption[]>(() => [
    { type: 'manual', label: 'Manual context', hint: 'Paste text or notes' },
    ...notes.map((note) => ({ type: 'note' as const, id: note.id, label: note.title, hint: 'Note' })),
    ...sessions.map((session) => ({ type: 'brainstorm_session' as const, id: session.id, label: session.title, hint: 'Brainstorm' })),
  ], [notes, sessions])

  const activeCard = queue[index]
  const progress = queue.length ? Math.round(((index + 1) / queue.length) * 100) : 0
  const activeSource = sourceOptions.find((item) => `${item.type}:${item.id || 'manual'}` === sourceKey)
  const canGenerate = activeSource?.type === 'manual' ? manualContent.trim().length > 40 : Boolean(activeSource?.id)
  const previousDisabled = index === 0 || !queue.length
  const nextDisabled = index >= queue.length - 1 || !queue.length
  const statsList = Object.entries(sessionStats)
  const knownCount = statsList.filter(([, stat]) => stat.lastRating === 'known').length
  const difficultCount = statsList.filter(([, stat]) => stat.lastRating === 'difficult').length
  const againCount = statsList.filter(([, stat]) => stat.lastRating === 'again').length
  const totalReviewed = statsList.length
  const accuracy = totalReviewed ? Math.round((knownCount / totalReviewed) * 100) : 0
  const remainingCards = queue.length
  const weakTopics = buildWeakTopics(activeDeck?.cards || [], sessionStats)

  const selectDeck = async (deckId: number) => {
    try {
      const response = await flashcardsApi.getDeck(deckId)
      setActiveDeck(response.data)
      setStatus(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to open deck.')
    }
  }

  const generateDeck = async () => {
    const option = sourceOptions.find((item) => `${item.type}:${item.id || 'manual'}` === sourceKey)
    if (!option) return
    try {
      setGenerating(true)
      setError(null)
      setStatus('Generating flashcards from your study context...')
      const response = await flashcardsApi.generate({
        source_type: option.type,
        source_id: option.id,
        title: title || `${option.label} Flashcards`,
        content: option.type === 'manual' ? manualContent : undefined,
        count,
      })
      setActiveDeck(response.data)
      setDecks((current) => [response.data, ...current.filter((deck) => deck.id !== response.data.id)])
      setManualContent('')
      setTitle('')
      setStatus(`Built ${response.data.cards?.length || response.data.card_count} usable flashcards.`)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Flashcard generation failed.'
      setError(detail)
      setStatus(detail.toLowerCase().includes('pars') ? 'The model answered, but the backend had trouble cleaning its JSON.' : null)
    } finally {
      setGenerating(false)
    }
  }

  const review = async (rating: 'again' | 'difficult' | 'known') => {
    if (!activeCard || reviewing) return
    try {
      setReviewing(true)
      await flashcardsApi.reviewCard(activeCard.id, rating)
      setReviewedCardIds((current) => current.includes(activeCard.id) ? current : [...current, activeCard.id])
      setSessionStats((current) => {
        const previous = current[activeCard.id] || {
          attempts: 0,
          again: 0,
          difficult: 0,
          known: 0,
          lastRating: null,
        }
        return {
          ...current,
          [activeCard.id]: {
            attempts: previous.attempts + 1,
            again: previous.again + (rating === 'again' ? 1 : 0),
            difficult: previous.difficult + (rating === 'difficult' ? 1 : 0),
            known: previous.known + (rating === 'known' ? 1 : 0),
            lastRating: rating,
          },
        }
      })
      setStatus(
        rating === 'known'
          ? 'Marked as known for a longer interval.'
          : rating === 'difficult'
            ? 'Marked as difficult so it comes back soon.'
            : 'Marked to review again.'
      )
      updateAdaptiveQueue(activeCard, rating)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to record review.')
    } finally {
      setReviewing(false)
    }
  }

  const updateAdaptiveQueue = (card: Flashcard, rating: 'again' | 'difficult' | 'known') => {
    setQueue((current) => {
      const currentIndex = current.findIndex((item) => item.id === card.id)
      if (currentIndex === -1) return current
      const remaining = current.filter((item) => item.id !== card.id)
      let nextQueue = remaining
      if (rating !== 'known') {
        const insertAt = rating === 'again'
          ? Math.min(1, remaining.length)
          : Math.min(3, remaining.length)
        nextQueue = [
          ...remaining.slice(0, insertAt),
          card,
          ...remaining.slice(insertAt),
        ]
      }
      setIndex((currentIndexValue) => {
        if (!nextQueue.length) {
          setSessionFinished(true)
          return 0
        }
        return Math.min(currentIndexValue, nextQueue.length - 1)
      })
      setFlipped(false)
      return nextQueue
    })
  }

  const advance = () => {
    setFlipped(false)
    setIndex((current) => Math.min(queue.length - 1, current + 1))
  }

  const restart = () => {
    setIndex(0)
    setFlipped(false)
    setQueue(activeDeck?.cards || [])
    setSessionStats({})
    setReviewedCardIds([])
    setSessionFinished(false)
    setStatus(null)
  }

  const shuffleDeck = () => {
    setQueue((current) => shuffled(current))
    setIndex(0)
    setFlipped(false)
  }

  const deleteDeck = async (deckId: number) => {
    try {
      await flashcardsApi.deleteDeck(deckId)
      const remaining = decks.filter((deck) => deck.id !== deckId)
      setDecks(remaining)
      if (activeDeck?.id === deckId) {
        setActiveDeck(null)
        if (remaining[0]) await selectDeck(remaining[0].id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete deck.')
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[720px] overflow-hidden rounded-card border border-neutral-200 bg-white shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary">
      <div className="grid h-full grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)_19rem]">
        <aside className="flex min-h-0 flex-col border-b border-neutral-200 dark:border-dark-border-primary xl:border-b-0 xl:border-r">
          <div className="border-b border-neutral-200 p-4 dark:border-dark-border-primary">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary dark:bg-primary/20 dark:text-primary-dark">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                  Flashcards
                </h1>
                <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                  Active recall from your study material
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <DeckSidebarSkeleton />
            ) : decks.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500 dark:text-dark-text-secondary">
                <FileText className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                No decks yet
              </div>
            ) : (
              <div className="space-y-2">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className={`group rounded-lg border transition ${
                      activeDeck?.id === deck.id
                        ? 'border-primary bg-primary-muted dark:bg-primary/20'
                        : 'border-neutral-200 hover:bg-neutral-50 dark:border-dark-border-primary dark:hover:bg-dark-hover-primary'
                    }`}
                  >
                    <button onClick={() => selectDeck(deck.id)} className="w-full p-3 text-left">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
                        {deck.title}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-dark-text-tertiary">
                        {deck.card_count} cards{deck.review_count > 0 ? ` - ${deck.review_count} reviews` : ''}
                      </p>
                      {deck.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500 dark:text-dark-text-secondary">
                          {deck.description}
                        </p>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-neutral-50 dark:bg-dark-bg-primary">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-dark-border-primary dark:bg-dark-bg-secondary">
            <div>
              <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                {activeDeck?.title || 'Review Session'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                {queue.length ? `${index + 1} of ${queue.length} active cards` : sessionFinished ? 'Session complete' : 'Generate or select a deck'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={previousDisabled}
                className="btn-outlined !px-3 disabled:opacity-50"
                title="Previous card"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={advance}
                disabled={nextDisabled}
                className="btn-outlined !px-3 disabled:opacity-50"
                title="Next card"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={shuffleDeck} disabled={!queue.length} className="btn-outlined !px-3 disabled:opacity-50" title="Shuffle">
                <Shuffle className="h-4 w-4" />
              </button>
              <button onClick={restart} disabled={!queue.length} className="btn-outlined !px-3 disabled:opacity-50" title="Restart">
                <RotateCcw className="h-4 w-4" />
              </button>
              {activeDeck && (
                <button onClick={() => deleteDeck(activeDeck.id)} className="btn-outlined !px-3 text-red-600" title="Delete deck">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="h-1 bg-neutral-200 dark:bg-dark-bg-tertiary">
            <div className="h-full bg-primary transition-all dark:bg-primary-dark" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
            {generating ? (
              <FlashcardStageSkeleton status={status} />
            ) : activeCard ? (
              <div className="w-full max-w-3xl">
                <button
                  onClick={() => setFlipped((current) => !current)}
                  className="group block w-full text-left [perspective:1400px]"
                >
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    className="relative min-h-[24rem] w-full [transform-style:preserve-3d]"
                  >
                    <CardFace
                      label="Front"
                      icon={Brain}
                      title={activeCard.front}
                      helper="Click or press Space to reveal"
                    />
                    <CardFace
                      back
                      label="Back"
                      icon={Sparkles}
                      title={activeCard.back}
                      helper={`${activeCard.card_type} - ${activeCard.difficulty}`}
                    />
                  </motion.div>
                </button>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <ReviewButton icon={RotateCcw} label="Again" onClick={() => review('again')} disabled={reviewing} />
                  <ReviewButton icon={ThumbsDown} label="Difficult" onClick={() => review('difficult')} disabled={reviewing} />
                  <ReviewButton icon={CheckCircle2} label="Known" onClick={() => review('known')} disabled={reviewing} />
                </div>
                {status && (
                  <p className="mt-4 text-center text-xs text-neutral-500 dark:text-dark-text-tertiary">{status}</p>
                )}
              </div>
            ) : sessionFinished && activeDeck ? (
              <CompletionSummary
                deck={activeDeck}
                knownCount={knownCount}
                difficultCount={difficultCount}
                againCount={againCount}
                accuracy={accuracy}
                weakTopics={weakTopics}
                reviewedCount={reviewedCardIds.length}
                onRestart={restart}
              />
            ) : (
              <div className="text-center">
                <Layers className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
                <h3 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                  No active deck
                </h3>
                <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-dark-text-secondary">
                  Generate cards from a note, Brainstorm session, or pasted context to start a review.
                </p>
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary xl:border-l xl:border-t-0">
          <div className="border-b border-neutral-200 p-4 dark:border-dark-border-primary">
            <h2 className="font-heading text-sm font-bold text-neutral-900 dark:text-dark-text-primary">
              Generate Deck
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-dark-text-tertiary">
              Build recall cards from your learning context.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {status && !error && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                {status}
              </div>
            )}

            <label className="text-xs font-semibold text-neutral-500 dark:text-dark-text-tertiary">Source</label>
            <select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)} className="input-base mt-2">
              {sourceOptions.map((option) => (
                <option key={`${option.type}:${option.id || 'manual'}`} value={`${option.type}:${option.id || 'manual'}`}>
                  {option.hint}: {option.label}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional deck title"
              className="input-base mt-3"
            />
            <label className="mt-3 block text-xs font-semibold text-neutral-500 dark:text-dark-text-tertiary">
              Card count: {count}
            </label>
            <input
              type="range"
              min={4}
              max={30}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="mt-2 w-full accent-primary"
            />
            {activeSource?.type === 'manual' && (
              <textarea
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="Paste content to turn into recall cards..."
                className="input-base mt-3 min-h-[150px] !h-auto resize-none !py-3"
              />
            )}
            <button
              onClick={generateDeck}
              disabled={!canGenerate || generating}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate Flashcards
            </button>
            <div className="mt-6 rounded-lg border border-neutral-200 p-3 dark:border-dark-border-primary">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                Study Session
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Known</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{knownCount}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Difficult</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{difficultCount}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Again</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{againCount}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Accuracy</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{accuracy}%</p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Remaining</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{remainingCards}</p>
                </div>
                <div className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Reviewed</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">{totalReviewed}</p>
                </div>
              </div>
              {weakTopics.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">Weak areas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weakTopics.slice(0, 4).map((topic) => (
                      <span key={topic.label} className="rounded-pill bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        {topic.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function DeckSidebarSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border border-neutral-200 p-3 dark:border-dark-border-primary">
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-dark-bg-tertiary" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-dark-bg-tertiary" />
          <div className="mt-3 h-10 animate-pulse rounded bg-neutral-100 dark:bg-dark-bg-tertiary" />
        </div>
      ))}
    </div>
  )
}

function FlashcardStageSkeleton({ status }: { status: string | null }) {
  return (
    <div className="w-full max-w-3xl rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary">
      <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-dark-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin text-primary dark:text-primary-dark" />
        {status || 'Generating flashcards...'}
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-dark-bg-tertiary" />
        <div className="h-20 animate-pulse rounded bg-neutral-100 dark:bg-dark-bg-tertiary" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100 dark:bg-dark-bg-tertiary" />
      </div>
    </div>
  )
}

function CompletionSummary({
  deck,
  knownCount,
  difficultCount,
  againCount,
  accuracy,
  weakTopics,
  reviewedCount,
  onRestart,
}: {
  deck: FlashcardDeck
  knownCount: number
  difficultCount: number
  againCount: number
  accuracy: number
  weakTopics: Array<{ label: string; score: number }>
  reviewedCount: number
  onRestart: () => void
}) {
  return (
    <div className="w-full max-w-3xl rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        <h3 className="mt-4 font-heading text-2xl font-bold text-neutral-900 dark:text-dark-text-primary">
          Session complete
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
          You reviewed {reviewedCount} cards from {deck.title}.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Known" value={knownCount} />
        <SummaryStat label="Difficult" value={difficultCount} />
        <SummaryStat label="Again" value={againCount} />
        <SummaryStat label="Accuracy" value={`${accuracy}%`} />
      </div>
      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
        <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">Suggested review areas</p>
        {weakTopics.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {weakTopics.slice(0, 5).map((topic) => (
              <span key={topic.label} className="rounded-pill bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                {topic.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
            Strong work. No obvious weak cluster surfaced in this session.
          </p>
        )}
      </div>
      <div className="mt-6 flex justify-center">
        <button onClick={onRestart} className="btn-primary">
          Review Again
        </button>
      </div>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-center dark:border-dark-border-primary dark:bg-dark-bg-tertiary">
      <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-dark-text-primary">{value}</p>
    </div>
  )
}

function buildWeakTopics(cards: Flashcard[], stats: Record<number, CardSessionStat>) {
  const scores = new Map<string, number>()
  cards.forEach((card) => {
    const stat = stats[card.id]
    if (!stat) return
    const labels = card.tags.length ? card.tags : [card.card_type || 'concept']
    const weight = stat.again * 2 + stat.difficult
    if (!weight) return
    labels.forEach((label) => {
      scores.set(label, (scores.get(label) || 0) + weight)
    })
  })
  return Array.from(scores.entries())
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score)
}

function CardFace({
  label,
  icon: Icon,
  title,
  helper,
  back = false,
}: {
  label: string
  icon: typeof Brain
  title: string
  helper: string
  back?: boolean
}) {
  return (
    <div
      className={`absolute inset-0 flex min-h-[24rem] flex-col justify-between rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary ${
        back ? '[transform:rotateY(180deg)] [backface-visibility:hidden]' : '[backface-visibility:hidden]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-pill bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </div>
      <p className="my-10 whitespace-pre-wrap text-center font-heading text-2xl font-bold leading-relaxed text-neutral-900 dark:text-dark-text-primary">
        {title}
      </p>
      <p className="text-center text-xs text-neutral-500 dark:text-dark-text-tertiary">{helper}</p>
    </div>
  )
}

function ReviewButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Brain
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-dark-border-primary dark:bg-dark-bg-secondary dark:text-dark-text-primary dark:hover:bg-dark-hover-primary"
    >
      <span className="flex items-center justify-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </button>
  )
}
