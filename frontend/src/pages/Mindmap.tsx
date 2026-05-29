import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent } from 'react'
import dagre from 'dagre'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronRight,
  Crosshair,
  Edit3,
  File,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Link2,
  Loader2,
  MoreVertical,
  Network,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import ToastContainer, { type Toast } from '../components/ui/Toast'
import { brainstormApi, mindmapsApi, notesApi } from '../lib/api'
import { useAchievementNotifications } from '../hooks/useAchievementNotifications'
import type {
  ArtifactSourceType,
  BrainstormFile,
  BrainstormSession,
  Mindmap as MindmapType,
  MindmapEdge,
  MindmapNode,
  Note,
} from '../types'

type SourceKeyType = ArtifactSourceType | 'upload'

type SourceOption = {
  type: SourceKeyType
  id?: number
  label: string
  hint: string
  file?: BrainstormFile
}

type MindmapGraph = MindmapType['graph_data']

type ConceptNodeData = {
  title: string
  description?: string
  category?: string
  level: number
  color: string
  selected: boolean
  muted: boolean
}

type FlowConceptNode = Node<ConceptNodeData, 'concept'>

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx'
const MAX_TITLE_LENGTH = 160
const NODE_WIDTH = 312
const NODE_HEIGHT = 142
const ROOT_WIDTH = 344
const ROOT_HEIGHT = 154
const categoryColors = ['#0F766E', '#4F46E5', '#B45309', '#BE123C', '#6D28D9', '#0369A1']

function sanitizeGraph(input: unknown): MindmapGraph | null {
  if (!input || typeof input !== 'object') return null
  const graph = input as { nodes?: unknown; edges?: unknown }
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null

  const nodes: MindmapNode[] = []
  const seen = new Set<string>()
  for (const item of graph.nodes.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<MindmapNode>
    const id = String(raw.id || '').trim()
    const title = String(raw.title || '').trim()
    if (!id || !title || seen.has(id)) continue
    seen.add(id)
    nodes.push({
      id,
      title: title.slice(0, 100),
      description: raw.description ? String(raw.description).trim().slice(0, 360) : '',
      category: raw.category ? String(raw.category).trim().slice(0, 48) : 'concept',
      level: Number.isFinite(Number(raw.level)) ? Math.max(0, Math.min(8, Number(raw.level))) : 1,
      color: raw.color ? String(raw.color).trim() : undefined,
    })
  }

  if (nodes.length < 2) return null
  const root = nodes.find((node) => node.id === 'root') || nodes.find((node) => node.level === 0) || nodes[0]
  root.level = 0
  nodes.forEach((node) => {
    if (node.id !== root.id && node.level === 0) node.level = 1
  })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: MindmapEdge[] = []
  const edgeKeys = new Set<string>()
  for (const item of graph.edges.slice(0, 80)) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<MindmapEdge>
    const source = String(raw.source || '').trim()
    const target = String(raw.target || '').trim()
    const key = `${source}->${target}`
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target || edgeKeys.has(key)) continue
    edgeKeys.add(key)
    edges.push({
      id: raw.id || `${source}-${target}`,
      source,
      target,
      label: raw.label ? String(raw.label).trim().slice(0, 60) : '',
      relation: raw.relation ? String(raw.relation).trim().slice(0, 40) : 'related_to',
    })
  }

  const inbound = new Set(edges.map((edge) => edge.target))
  nodes.forEach((node) => {
    if (node.id === root.id || inbound.has(node.id)) return
    const key = `${root.id}->${node.id}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({
      id: `${root.id}-${node.id}-local`,
      source: root.id,
      target: node.id,
      label: 'connects to',
      relation: 'related_to',
    })
  })

  return edges.length ? { nodes, edges } : null
}

function cloneGraph(graph: MindmapGraph): MindmapGraph {
  return {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  }
}

function buildFlowGraph(
  graph: MindmapGraph,
  selectedNodeId?: string | null,
) {
  const layoutGraph = new dagre.graphlib.Graph()
  layoutGraph.setDefaultEdgeLabel(() => ({}))
  layoutGraph.setGraph({
    rankdir: 'TB',
    ranksep: 170,
    nodesep: 96,
    edgesep: 34,
    marginx: 130,
    marginy: 120,
    acyclicer: 'greedy',
    ranker: 'tight-tree',
  })

  const connectedNodeIds = new Set<string>()
  graph.edges.forEach((edge) => {
    if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    }
  })

  graph.nodes.forEach((node) => {
    const isRoot = node.level === 0 || node.id === 'root'
    layoutGraph.setNode(node.id, {
      width: isRoot ? ROOT_WIDTH : NODE_WIDTH,
      height: isRoot ? ROOT_HEIGHT : NODE_HEIGHT,
    })
  })
  graph.edges.forEach((edge) => layoutGraph.setEdge(edge.source, edge.target, { minlen: 1, weight: 2 }))
  dagre.layout(layoutGraph)

  const rootId = graph.nodes.find((node) => node.id === 'root')?.id || graph.nodes.find((node) => node.level === 0)?.id
  const rootLayout = rootId ? layoutGraph.node(rootId) : null
  const rootOffsetX = rootLayout ? -rootLayout.x : 0

  const flowNodes: FlowConceptNode[] = graph.nodes.map((node, index) => {
    const layout = layoutGraph.node(node.id) || { x: index * (NODE_WIDTH + 80), y: 0 }
    const isRoot = node.level === 0 || node.id === 'root'
    const width = isRoot ? ROOT_WIDTH : NODE_WIDTH
    const height = isRoot ? ROOT_HEIGHT : NODE_HEIGHT
    const color = node.color || categoryColors[index % categoryColors.length]
    const isSelected = selectedNodeId === node.id
    const isConnected = selectedNodeId ? connectedNodeIds.has(node.id) : false
    const isMuted = Boolean(selectedNodeId) && !isSelected && !isConnected

    return {
      id: node.id,
      type: 'concept',
      position: { x: layout.x + rootOffsetX - width / 2, y: layout.y - height / 2 },
      data: {
        title: node.title,
        description: node.description,
        category: node.category || 'concept',
        level: node.level,
        color,
        selected: isSelected,
        muted: isMuted,
      },
      draggable: true,
    }
  })

  const flowEdges: Edge[] = graph.edges.map((edge, index) => {
    const isSelected = Boolean(selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId))
    const isMuted = Boolean(selectedNodeId) && !isSelected
    return {
      id: edge.id || `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: isSelected && edge.label ? edge.label : undefined,
      animated: isSelected,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isSelected ? '#0F766E' : '#94A3B8',
        width: 18,
        height: 18,
      },
      style: {
        stroke: isSelected ? '#0F766E' : '#94A3B8',
        strokeWidth: isSelected ? 2.4 : 1.45,
        opacity: isMuted ? 0.18 : 0.62,
      },
      labelStyle: {
        fill: '#0F766E',
        fontSize: 12,
        fontWeight: 700,
      },
      labelBgPadding: [8, 5],
      labelBgBorderRadius: 8,
      labelBgStyle: {
        fill: '#FFFFFF',
        stroke: '#CCFBF1',
        strokeWidth: 1,
      },
    }
  })

  return { flowNodes, flowEdges }
}

function ConceptNode({ data }: NodeProps<FlowConceptNode>) {
  const root = data.level === 0
  return (
    <div
      className={`concept-flow-node ${root ? 'concept-flow-node-root' : ''}`}
      style={{
        '--node-color': data.color,
        opacity: data.muted ? 0.38 : 1,
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      } as CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-2 !border-white !bg-[var(--node-color)]" />
      <div className="flex items-start gap-3">
        <div
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{
            backgroundColor: `${data.color}14`,
            borderColor: `${data.color}33`,
            color: data.color,
          }}
        >
          {root ? <Brain className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="whitespace-normal break-words text-[15px] font-bold leading-6 text-neutral-950 dark:text-dark-text-primary">
            {data.title}
          </p>
          {data.description && (
            <p className="mt-2 line-clamp-3 whitespace-normal break-words text-[12px] leading-5 text-neutral-600 dark:text-dark-text-secondary">
              {data.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-neutral-500 dark:text-dark-text-tertiary">
            <span className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-dark-bg-tertiary">{data.category || 'concept'}</span>
            <span className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-dark-bg-tertiary">Level {data.level}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-2 !border-white !bg-[var(--node-color)]" />
    </div>
  )
}

const nodeTypes = { concept: ConceptNode }

function formatDate(date: string) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function sourceKey(option: SourceOption) {
  return `${option.type}:${option.id || 'new'}`
}

export default function Mindmap() {
  const { checkForAchievements } = useAchievementNotifications()
  const [mindmaps, setMindmaps] = useState<MindmapType[]>([])
  const [selected, setSelected] = useState<MindmapType | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [sessions, setSessions] = useState<BrainstormSession[]>([])
  const [brainstormFiles, setBrainstormFiles] = useState<BrainstormFile[]>([])
  const [source, setSource] = useState('manual:new')
  const [manualContent, setManualContent] = useState('')
  const [title, setTitle] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSelection, setUploadSelection] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftGraph, setDraftGraph] = useState<MindmapGraph | null>(null)
  const [newNodeTitle, setNewNodeTitle] = useState('')
  const [newNodeDescription, setNewNodeDescription] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuId, setMenuId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MindmapType | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((current) => [...current, { id, message, type }])
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [mindmapsResponse, notesResponse, sessionsResponse] = await Promise.all([
        mindmapsApi.getAll(),
        notesApi.getAll(),
        brainstormApi.getSessions(),
      ])
      const loadedMindmaps: MindmapType[] = mindmapsResponse.data
      const loadedSessions: BrainstormSession[] = sessionsResponse.data
      const sessionDetails = await Promise.all(
        loadedSessions
          .filter((session) => session.file_count > 0)
          .map((session) => brainstormApi.getSession(session.id).then((response) => response.data).catch(() => null)),
      )
      const files = sessionDetails.flatMap((session) => session?.files || []).filter((file: BrainstormFile) => file.upload_status === 'ready')

      setMindmaps(loadedMindmaps)
      setSelected((current) => {
        if (current && loadedMindmaps.some((item) => item.id === current.id)) {
          return loadedMindmaps.find((item) => item.id === current.id) || current
        }
        return loadedMindmaps[0] || null
      })
      setNotes(notesResponse.data)
      setSessions(loadedSessions)
      setBrainstormFiles(files)
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Failed to load mindmaps.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const sourceOptions = useMemo<SourceOption[]>(() => [
    { type: 'manual', label: 'Manual text', hint: 'Text' },
    { type: 'upload', label: 'Upload file', hint: 'File' },
    ...notes.map((note) => ({ type: 'note' as const, id: note.id, label: note.title, hint: 'Note' })),
    ...sessions.map((session) => ({ type: 'brainstorm_session' as const, id: session.id, label: session.title, hint: 'Brainstorm' })),
    ...brainstormFiles.map((file) => ({
      type: 'brainstorm_file' as const,
      id: file.id,
      label: file.original_filename,
      hint: 'Uploaded file',
      file,
    })),
  ], [brainstormFiles, notes, sessions])

  const activeSource = sourceOptions.find((option) => sourceKey(option) === source)
  const selectedGraph = useMemo(() => sanitizeGraph(selected?.graph_data), [selected])
  const displayedGraph = editMode && draftGraph ? draftGraph : selectedGraph
  const selectedNode = displayedGraph?.nodes.find((node) => node.id === selectedNodeId) || displayedGraph?.nodes[0] || null

  useEffect(() => {
    if (!displayedGraph) {
      setSelectedNodeId(null)
      return
    }
    setSelectedNodeId((current) => displayedGraph.nodes.some((node) => node.id === current) ? current : displayedGraph.nodes[0]?.id || null)
  }, [displayedGraph, selected?.id])

  useEffect(() => {
    if (!selected) {
      setEditMode(false)
      setDraftGraph(null)
      setDraftTitle('')
      return
    }
    setEditMode(false)
    setDraftGraph(null)
    setDraftTitle(selected.title)
  }, [selected?.id])

  const { flowNodes, flowEdges } = useMemo(
    () => displayedGraph ? buildFlowGraph(displayedGraph, selectedNode?.id) : { flowNodes: [], flowEdges: [] },
    [displayedGraph, selectedNode?.id],
  )

  useEffect(() => {
    if (!reactFlowInstance || !flowNodes.length) return
    const timeout = window.setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.28,
        duration: 520,
        maxZoom: 1.05,
      })
    }, 90)
    return () => window.clearTimeout(timeout)
  }, [reactFlowInstance, flowNodes, selected?.id, editMode])

  const canGenerate =
    activeSource?.type === 'manual'
      ? manualContent.trim().length > 40
      : activeSource?.type === 'upload'
        ? uploadSelection.length > 0
        : Boolean(activeSource?.id)

  const relatedEdges = displayedGraph && selectedNode
    ? displayedGraph.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
    : []

  const relatedNodes = displayedGraph && selectedNode
    ? relatedEdges
        .map((edge) => edge.source === selectedNode.id ? edge.target : edge.source)
        .map((nodeId) => displayedGraph.nodes.find((node) => node.id === nodeId))
        .filter((node): node is MindmapNode => Boolean(node))
    : []

  const generateMindmap = async () => {
    if (!activeSource || !canGenerate) return
    try {
      setGenerating(true)
      setUploading(activeSource.type === 'upload')
      setUploadProgress(activeSource.type === 'upload' ? 1 : 0)
      setError(null)

      const response = activeSource.type === 'upload'
        ? await mindmapsApi.uploadGenerate(uploadSelection, title, (event) => {
            if (event.total) setUploadProgress(Math.round((event.loaded * 100) / event.total))
          })
        : await mindmapsApi.generate({
            source_type: activeSource.type,
            source_id: activeSource.id,
            title: title || activeSource.label,
            content: activeSource.type === 'manual' ? manualContent : undefined,
          })

      const generated: MindmapType = response.data
      const graph = sanitizeGraph(generated.graph_data)
      if (!graph) throw new Error('Generated mindmap did not contain a valid graph.')
      const safeMindmap = { ...generated, graph_data: graph }

      setSelected(safeMindmap)
      setMindmaps((current) => [safeMindmap, ...current.filter((item) => item.id !== safeMindmap.id)])
      setSelectedNodeId(graph.nodes[0]?.id || null)
      setManualContent('')
      setUploadSelection([])
      setTitle('')
      addToast('Mindmap generated.', 'success')
      await checkForAchievements()
      await loadData()
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || 'Mindmap generation failed.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setGenerating(false)
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startEdit = () => {
    if (!selected || !selectedGraph) return
    setEditMode(true)
    setDraftTitle(selected.title)
    setDraftGraph(cloneGraph(selectedGraph))
  }

  const cancelEdit = () => {
    setEditMode(false)
    setDraftTitle(selected?.title || '')
    setDraftGraph(selectedGraph ? cloneGraph(selectedGraph) : null)
    setNewNodeTitle('')
    setNewNodeDescription('')
  }

  const saveEdit = async () => {
    if (!selected || !draftGraph) return
    const graph = sanitizeGraph(draftGraph)
    if (!graph) {
      setError('Mindmap edits need at least two concepts and valid relationships.')
      return
    }

    try {
      setSaving(true)
      const response = await mindmapsApi.update(selected.id, {
        title: draftTitle.trim() || selected.title,
        graph_data: graph,
      })
      const saved: MindmapType = response.data
      const safeGraph = sanitizeGraph(saved.graph_data) || graph
      const safeMindmap = { ...saved, graph_data: safeGraph }
      setSelected(safeMindmap)
      setMindmaps((current) => current.map((item) => item.id === safeMindmap.id ? safeMindmap : item))
      setEditMode(false)
      setDraftGraph(null)
      addToast('Mindmap saved.', 'success')
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Failed to save mindmap.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveRename = async (mindmap: MindmapType) => {
    const nextTitle = renameValue.trim()
    if (!nextTitle) {
      setError('Mindmap title cannot be empty.')
      return
    }
    if (nextTitle.length > MAX_TITLE_LENGTH) {
      setError(`Mindmap title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
      return
    }
    if (nextTitle === mindmap.title) {
      setRenamingId(null)
      return
    }

    const previousMindmaps = mindmaps
    const previousSelected = selected
    const renamed = { ...mindmap, title: nextTitle, updated_at: new Date().toISOString() }
    setMindmaps((current) => current.map((item) => item.id === mindmap.id ? renamed : item))
    if (selected?.id === mindmap.id) setSelected({ ...selected, title: nextTitle })
    setRenamingId(null)

    try {
      const response = await mindmapsApi.update(mindmap.id, { title: nextTitle })
      const saved: MindmapType = response.data
      setMindmaps((current) => current.map((item) => item.id === saved.id ? saved : item))
      if (selected?.id === saved.id) setSelected(saved)
      addToast('Mindmap renamed.', 'success')
    } catch (err: any) {
      setMindmaps(previousMindmaps)
      setSelected(previousSelected)
      const message = err?.response?.data?.detail || 'Failed to rename mindmap.'
      setError(message)
      addToast(message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await mindmapsApi.delete(deleteTarget.id)
      const remaining = mindmaps.filter((item) => item.id !== deleteTarget.id)
      setMindmaps(remaining)
      if (selected?.id === deleteTarget.id) setSelected(remaining[0] || null)
      setDeleteTarget(null)
      addToast('Mindmap deleted.', 'success')
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Failed to delete mindmap.'
      setError(message)
      addToast(message, 'error')
    }
  }

  const updateDraftNode = (patch: Partial<MindmapNode>) => {
    if (!selectedNode || !draftGraph) return
    setDraftGraph({
      ...draftGraph,
      nodes: draftGraph.nodes.map((node) => node.id === selectedNode.id ? { ...node, ...patch } : node),
    })
  }

  const deleteDraftNode = () => {
    if (!selectedNode || !draftGraph || selectedNode.level === 0 || selectedNode.id === 'root') return
    const nextNodes = draftGraph.nodes.filter((node) => node.id !== selectedNode.id)
    const nextEdges = draftGraph.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    setDraftGraph({ nodes: nextNodes, edges: nextEdges })
    setSelectedNodeId(nextNodes[0]?.id || null)
  }

  const deleteDraftEdge = (edgeId: string | undefined, sourceId: string, targetId: string) => {
    if (!draftGraph) return
    setDraftGraph({
      ...draftGraph,
      edges: draftGraph.edges.filter((edge) => (edge.id || `${edge.source}-${edge.target}`) !== (edgeId || `${sourceId}-${targetId}`)),
    })
  }

  const addLinkedNode = () => {
    if (!selectedNode || !draftGraph || !newNodeTitle.trim()) return
    const baseId = newNodeTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concept'
    const existingIds = new Set(draftGraph.nodes.map((node) => node.id))
    let id = baseId
    let suffix = 2
    while (existingIds.has(id)) {
      id = `${baseId}-${suffix}`
      suffix += 1
    }
    const node: MindmapNode = {
      id,
      title: newNodeTitle.trim().slice(0, 80),
      description: newNodeDescription.trim().slice(0, 260),
      category: 'concept',
      level: Math.min(8, (selectedNode.level || 0) + 1),
    }
    const edge: MindmapEdge = {
      id: `${selectedNode.id}-${id}`,
      source: selectedNode.id,
      target: id,
      label: 'expands',
      relation: 'contains',
    }
    setDraftGraph({ nodes: [...draftGraph.nodes, node], edges: [...draftGraph.edges, edge] })
    setSelectedNodeId(id)
    setNewNodeTitle('')
    setNewNodeDescription('')
  }

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setSelectedNodeId(node.id)
  }, [])

  const focusNode = (nodeId: string) => {
    if (!reactFlowInstance) return
    reactFlowInstance.fitView({
      nodes: [{ id: nodeId }],
      padding: 0.86,
      duration: 420,
      maxZoom: 1.15,
    })
  }

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) setUploadSelection(Array.from(event.target.files))
  }

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') setDragActive(true)
    if (event.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    if (event.dataTransfer.files?.length) setUploadSelection(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[720px] overflow-hidden bg-neutral-50 dark:bg-dark-bg-primary">
      <div className="grid h-full grid-cols-1 overflow-hidden rounded-card border border-neutral-200 bg-white shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary xl:grid-cols-[15.5rem_minmax(0,1fr)_20rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_21rem]">
        <aside className="flex min-h-0 flex-col border-b border-neutral-200 dark:border-dark-border-primary xl:border-b-0 xl:border-r">
          <div className="border-b border-neutral-200 p-3 dark:border-dark-border-primary">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-light text-secondary dark:bg-secondary/20 dark:text-secondary-dark">
                  <Network className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-sm font-bold text-neutral-900 dark:text-dark-text-primary">
                    Mindmaps
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                    {mindmaps.length} saved
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelected(null)
                  setSource('manual:new')
                }}
                className="rounded-lg bg-secondary p-1.5 text-white transition hover:bg-secondary/90"
                title="New mindmap"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : mindmaps.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500 dark:text-dark-text-secondary">
                <GitBranch className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                No mindmaps yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {mindmaps.map((mindmap) => {
                  const graph = sanitizeGraph(mindmap.graph_data)
                  return (
                    <motion.div
                      key={mindmap.id}
                      layout
                      className={`group relative rounded-lg border transition ${
                        selected?.id === mindmap.id
                          ? 'border-secondary bg-secondary-light dark:bg-secondary/20'
                          : 'border-transparent hover:bg-neutral-100 dark:hover:bg-dark-hover-primary'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (renamingId !== mindmap.id) setSelected({ ...mindmap, graph_data: graph || mindmap.graph_data })
                        }}
                        className="w-full p-2.5 pr-9 text-left"
                      >
                        {renamingId === mindmap.id ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            maxLength={MAX_TITLE_LENGTH}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onBlur={() => saveRename(mindmap)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') saveRename(mindmap)
                              if (event.key === 'Escape') setRenamingId(null)
                            }}
                            className="input-base !h-8 !px-2 !py-1"
                          />
                        ) : (
                          <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-dark-text-primary">
                            {mindmap.title}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-dark-text-tertiary">
                          <span>{graph?.nodes.length || 0} concepts</span>
                          <span>{formatDate(mindmap.updated_at)}</span>
                        </div>
                      </button>

                      <div className="absolute right-1.5 top-1.5">
                        {renamingId === mindmap.id ? (
                          <div className="flex items-center gap-1">
                            <button onMouseDown={(event) => event.preventDefault()} onClick={() => saveRename(mindmap)} className="rounded-md p-1.5 hover:bg-white/70 dark:hover:bg-dark-bg-secondary" title="Save title">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onMouseDown={(event) => event.preventDefault()} onClick={() => setRenamingId(null)} className="rounded-md p-1.5 hover:bg-white/70 dark:hover:bg-dark-bg-secondary" title="Cancel rename">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                setMenuId((current) => current === mindmap.id ? null : mindmap.id)
                              }}
                              className="rounded-md p-1.5 text-neutral-400 opacity-100 transition hover:bg-white hover:text-neutral-800 dark:hover:bg-dark-bg-secondary dark:hover:text-dark-text-primary sm:opacity-0 sm:group-hover:opacity-100"
                              title="Mindmap actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {menuId === mindmap.id && (
                              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-dark-border-primary dark:bg-dark-bg-secondary">
                                <button
                                  onClick={() => {
                                    setMenuId(null)
                                    setRenamingId(mindmap.id)
                                    setRenameValue(mindmap.title)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-dark-hover-primary"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Rename
                                </button>
                                <button
                                  onClick={() => {
                                    setMenuId(null)
                                    setDeleteTarget(mindmap)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="relative min-h-0 bg-neutral-50 dark:bg-dark-bg-primary">
          {selected && displayedGraph ? (
            <>
              <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border border-neutral-200 bg-white/95 px-4 py-3 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary/95">
                <Brain className="h-4 w-4 shrink-0 text-secondary dark:text-secondary-dark" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
                    {editMode ? draftTitle : selected.title}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-dark-text-tertiary">
                    {displayedGraph.nodes.length} concepts and {displayedGraph.edges.length} relationships
                  </p>
                </div>
              </div>
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm dark:border-dark-border-primary dark:bg-dark-bg-secondary/95">
                <button onClick={() => selectedNode && focusNode(selectedNode.id)} disabled={!selectedNode} className="btn-outlined !px-3 !py-2 disabled:opacity-50" title="Focus selected concept">
                  <Crosshair className="h-4 w-4" />
                </button>
                <button onClick={() => reactFlowInstance?.fitView({ padding: 0.28, duration: 420, maxZoom: 1.05 })} className="btn-outlined !px-3 !py-2" title="Fit view">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                fitView
                fitViewOptions={{ padding: 0.28, maxZoom: 1.05 }}
                minZoom={0.28}
                maxZoom={1.55}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                nodeOrigin={[0, 0]}
                className="studybuddy-flow"
              >
                <Background gap={30} size={1} color="#D7DEE9" />
                <Controls />
                <MiniMap pannable zoomable nodeStrokeWidth={3} />
              </ReactFlow>
            </>
          ) : selected && !displayedGraph ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
                <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-dark-text-primary">
                  This mindmap needs repair
                </h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-dark-text-secondary">
                  The saved graph data is incomplete, so it was not rendered.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <Sparkles className="mx-auto mb-4 h-14 w-14 text-secondary dark:text-secondary-dark" />
                <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-dark-text-primary">
                  Generate a learning map
                </h2>
                <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-dark-text-secondary">
                  Choose a source on the right and StudyBuddy will build the concept graph here.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary xl:border-l xl:border-t-0">
          <div className="border-b border-neutral-200 p-4 dark:border-dark-border-primary">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-sm font-bold text-neutral-900 dark:text-dark-text-primary">
                  Generate
                </h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-dark-text-tertiary">
                  Text, Notes, Brainstorm, or files.
                </p>
              </div>
              {selected && (
                <div className="flex items-center gap-1">
                  {editMode ? (
                    <>
                      <button onClick={saveEdit} disabled={saving} className="btn-outlined !px-2.5 !py-2" title="Save edits">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </button>
                      <button onClick={cancelEdit} disabled={saving} className="btn-outlined !px-2.5 !py-2" title="Cancel edits">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={startEdit} disabled={!selectedGraph} className="btn-outlined !px-2.5 !py-2" title="Edit mindmap">
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRenamingId(selected.id)
                      setRenameValue(selected.title)
                    }}
                    className="btn-outlined !px-2.5 !py-2"
                    title="Rename mindmap"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(selected)} className="btn-outlined !px-2.5 !py-2 text-red-600" title="Delete mindmap">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
              </div>
            )}

            <label className="text-xs font-semibold text-neutral-500 dark:text-dark-text-tertiary">Source</label>
            <select value={source} onChange={(event) => setSource(event.target.value)} className="input-base mt-2">
              {sourceOptions.map((option) => (
                <option key={sourceKey(option)} value={sourceKey(option)}>
                  {option.hint}: {option.label}
                </option>
              ))}
            </select>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
              className="input-base mt-3"
            />

            {activeSource?.type === 'manual' && (
              <textarea
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="Paste study text, notes, or a rough outline..."
                className="input-base mt-3 min-h-[160px] !h-auto resize-none !py-3"
              />
            )}

            {activeSource?.type === 'upload' && (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`mt-3 rounded-lg border border-dashed p-3 transition-colors ${
                  dragActive
                    ? 'border-secondary bg-secondary-light dark:bg-secondary/20'
                    : 'border-neutral-300 bg-neutral-50 hover:border-secondary/70 dark:border-dark-border-secondary dark:bg-dark-bg-tertiary'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  className="hidden"
                  onChange={handleUploadChange}
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-dark-border-primary dark:bg-dark-bg-secondary">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-secondary" /> : <UploadCloud className="h-5 w-5 text-secondary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-dark-text-primary">
                      Upload context
                    </p>
                    <p className="truncate text-xs text-neutral-500 dark:text-dark-text-tertiary">
                      PDF, image, text, markdown, DOCX
                    </p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-outlined !px-3 !py-2">
                    Browse
                  </button>
                </div>
                {uploadSelection.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {uploadSelection.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-md bg-white px-2.5 py-2 text-xs dark:bg-dark-bg-secondary">
                        {file.type.startsWith('image/') ? <ImageIcon className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />}
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-dark-bg-primary">
                      <div className="h-full bg-secondary transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-dark-text-tertiary">
                      Uploading and extracting... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={generateMindmap}
              disabled={!canGenerate || generating}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate Mindmap
            </button>

            {editMode && selected && (
              <div className="mt-5 rounded-lg border border-neutral-200 p-3 dark:border-dark-border-primary">
                <label className="text-xs font-semibold text-neutral-500 dark:text-dark-text-tertiary">Title</label>
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="input-base mt-2" />
              </div>
            )}

            <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-dark-border-primary">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                Selected Concept
              </h3>
              {selectedNode ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-dark-border-primary">
                  {editMode ? (
                    <div className="space-y-3">
                      <input
                        value={selectedNode.title}
                        onChange={(event) => updateDraftNode({ title: event.target.value.slice(0, 80) })}
                        className="input-base"
                      />
                      <textarea
                        value={selectedNode.description || ''}
                        onChange={(event) => updateDraftNode({ description: event.target.value.slice(0, 260) })}
                        className="input-base min-h-[96px] !h-auto resize-none !py-3"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={selectedNode.category || 'concept'}
                          onChange={(event) => updateDraftNode({ category: event.target.value.slice(0, 40) })}
                          className="input-base"
                        />
                        <input
                          type="number"
                          min={0}
                          max={8}
                          value={selectedNode.level}
                          onChange={(event) => updateDraftNode({ level: Math.max(0, Math.min(8, Number(event.target.value))) })}
                          className="input-base"
                        />
                      </div>
                      <button
                        onClick={deleteDraftNode}
                        disabled={selectedNode.level === 0 || selectedNode.id === 'root'}
                        className="btn-outlined flex w-full items-center justify-center gap-2 !px-3 text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Concept
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="break-words font-semibold text-neutral-900 dark:text-dark-text-primary">{selectedNode.title}</p>
                      <p className="mt-2 break-words text-sm leading-6 text-neutral-600 dark:text-dark-text-secondary">
                        {selectedNode.description || 'No description yet.'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-dark-text-tertiary">
                        <span>{selectedNode.category || 'concept'}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>Level {selectedNode.level}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>{relatedEdges.length} links</span>
                      </div>
                    </>
                  )}

                  {relatedNodes.length > 0 && (
                    <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-dark-border-primary">
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                        Relationships
                      </p>
                      <div className="mt-3 space-y-2">
                        {relatedEdges.slice(0, 8).map((edge) => {
                          const nodeId = edge.source === selectedNode.id ? edge.target : edge.source
                          const node = displayedGraph?.nodes.find((item) => item.id === nodeId)
                          if (!node) return null
                          return (
                            <div key={edge.id || `${edge.source}-${edge.target}`} className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-dark-bg-tertiary">
                              <button
                                onClick={() => {
                                  setSelectedNodeId(node.id)
                                  window.setTimeout(() => focusNode(node.id), 60)
                                }}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-dark-text-primary">
                                  {node.title}
                                </p>
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-dark-text-secondary">
                                  <Link2 className="h-3 w-3" />
                                  <span className="truncate">{edge.label || edge.relation || 'related'}</span>
                                </p>
                              </button>
                              {editMode && (
                                <button
                                  onClick={() => deleteDraftEdge(edge.id, edge.source, edge.target)}
                                  className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                  title="Delete relationship"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {editMode && (
                    <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-dark-border-primary">
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-dark-text-tertiary">
                        Add Linked Concept
                      </p>
                      <input
                        value={newNodeTitle}
                        onChange={(event) => setNewNodeTitle(event.target.value)}
                        placeholder="Concept title"
                        className="input-base mt-3"
                      />
                      <textarea
                        value={newNodeDescription}
                        onChange={(event) => setNewNodeDescription(event.target.value)}
                        placeholder="Short description"
                        className="input-base mt-2 min-h-[76px] !h-auto resize-none !py-3"
                      />
                      <button onClick={addLinkedNode} disabled={!newNodeTitle.trim()} className="btn-outlined mt-3 flex w-full items-center justify-center gap-2 !px-3 disabled:opacity-50">
                        <Plus className="h-4 w-4" />
                        Add Concept
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500 dark:text-dark-text-secondary">
                  Click a node to inspect it.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDeleteModal mindmap={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  )
}

function ConfirmDeleteModal({
  mindmap,
  onCancel,
  onConfirm,
}: {
  mindmap: MindmapType | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {mindmap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-xl dark:border-dark-border-primary dark:bg-dark-bg-secondary"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
                  Delete mindmap?
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-dark-text-secondary">
                  This will remove "{mindmap.title}" from your saved mindmaps.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onCancel} className="btn-outlined">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
