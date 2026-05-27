import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'

interface MindMapNode {
  id: number
  title: string
  children?: MindMapNode[]
}

interface MindMapProps {
  rootNote: {
    id: number
    title: string
  }
  linkedNotes: Array<{
    id: number
    title: string
    outgoing_links?: Array<{ id: number; title: string }>
  }>
  onNodeClick: (nodeId: number) => void
  onClose: () => void
}

export default function MindMap({ rootNote, linkedNotes, onNodeClick, onClose }: MindMapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([rootNote.id]))

  // Build tree structure from linked notes
  const treeData = useMemo(() => {
    const buildTree = (noteId: number, visited: Set<number> = new Set()): MindMapNode | null => {
      if (visited.has(noteId)) return null
      visited.add(noteId)

      const note = linkedNotes.find(n => n.id === noteId)
      if (!note) {
        return { id: noteId, title: rootNote.title }
      }

      const children = note.outgoing_links
        ?.map(link => buildTree(link.id, new Set(visited)))
        .filter((n): n is MindMapNode => n !== null) || []

      return {
        id: note.id,
        title: note.title,
        children: children.length > 0 ? children : undefined
      }
    }

    return buildTree(rootNote.id) || { id: rootNote.id, title: rootNote.title }
  }, [rootNote, linkedNotes])

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const TreeNode = ({ node, depth = 0 }: { node: MindMapNode; depth?: number }) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const isRoot = depth === 0

    return (
      <div className="relative">
        {/* Connection line */}
        {!isRoot && (
          <div
            className="absolute left-0 top-0 w-8 h-px bg-neutral-300 dark:bg-neutral-600"
            style={{ transform: 'translateX(-100%)', top: '20px' }}
          />
        )}

        {/* Node */}
        <div className="flex items-start">
          <div
            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
              isRoot
                ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                : 'bg-white dark:bg-dark-bg-tertiary hover:bg-neutral-50 dark:hover:bg-dark-bg-secondary border border-neutral-200 dark:border-dark-border'
            }`}
            onClick={() => onNodeClick(node.id)}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-dark-bg-secondary rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            )}

            <span className={`font-medium ${isRoot ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
              {node.title}
            </span>

            <ExternalLink className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 mt-2 space-y-2"
            >
              {/* Vertical line */}
              <div
                className="absolute left-0 top-12 w-px bg-neutral-300 dark:bg-neutral-600"
                style={{
                  height: `calc(100% - 48px)`,
                  transform: 'translateX(-32px)'
                }}
              />

              {node.children!.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-dark-border">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
              Mind Map View
            </h2>
            <p className="text-sm text-neutral-500">
              Visual hierarchy of connected notes
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tree View */}
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-max">
            <TreeNode node={treeData} />
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-900/30 border border-primary-500"></span>
              Root Note
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-white dark:bg-dark-bg-tertiary border border-neutral-300"></span>
              Linked Note
            </span>
            <span className="ml-auto">
              {linkedNotes.length + 1} notes shown
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
