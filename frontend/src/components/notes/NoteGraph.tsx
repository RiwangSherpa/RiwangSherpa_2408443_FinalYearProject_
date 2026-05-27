import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import Button from '../ui/Button'

interface GraphNode {
  id: number
  title: string
  tag_count: number
  x?: number
  y?: number
}

interface GraphEdge {
  source: number
  target: number
}

interface NoteGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick: (nodeId: number) => void
  onClose: () => void
}

export default function NoteGraph({ nodes, edges, onNodeClick, onClose }: NoteGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)

  const width = 800
  const height = 600
  const nodeRadius = 30

  // Calculate node positions using simple force-directed layout
  const calculatePositions = () => {
    const positions = new Map<number, { x: number; y: number }>()
    const centerX = width / 2
    const centerY = height / 2

    // Position nodes in a circle initially
    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length
      const radius = Math.min(width, height) * 0.3
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      })
    })

    // Simple force simulation
    for (let iteration = 0; iteration < 50; iteration++) {
      // Repulsion between nodes
      nodes.forEach((node1, i) => {
        let fx = 0
        let fy = 0
        const pos1 = positions.get(node1.id)!

        nodes.forEach((node2, j) => {
          if (i === j) return
          const pos2 = positions.get(node2.id)!
          const dx = pos1.x - pos2.x
          const dy = pos1.y - pos2.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 1000 / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        })

        // Attraction along edges
        edges.forEach(edge => {
          if (edge.source === node1.id || edge.target === node1.id) {
            const otherId = edge.source === node1.id ? edge.target : edge.source
            const pos2 = positions.get(otherId)!
            const dx = pos2.x - pos1.x
            const dy = pos2.y - pos1.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = dist * 0.01
            fx += (dx / dist) * force
            fy += (dy / dist) * force
          }
        })

        // Center attraction
        fx += (centerX - pos1.x) * 0.001
        fy += (centerY - pos1.y) * 0.001

        // Update position
        positions.set(node1.id, {
          x: pos1.x + fx * 0.1,
          y: pos1.y + fy * 0.1
        })
      })
    }

    return positions
  }

  const [nodePositions, setNodePositions] = useState(() => calculatePositions())

  useEffect(() => {
    setNodePositions(calculatePositions())
  }, [nodes, edges])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.max(0.5, Math.min(3, zoom + (e.deltaY > 0 ? -0.1 : 0.1)))
    setZoom(newZoom)
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Get connected nodes for highlighting
  const getConnectedNodes = (nodeId: number): Set<number> => {
    const connected = new Set<number>()
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target)
      if (edge.target === nodeId) connected.add(edge.source)
    })
    return connected
  }

  const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : new Set<number>()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-dark-border">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-dark-text-primary">
            Note Graph View
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 0.2)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-sm text-neutral-500 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 0.2)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetView}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 overflow-hidden bg-neutral-50 dark:bg-dark-bg-primary">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((edge, index) => {
                const source = nodePositions.get(edge.source)
                const target = nodePositions.get(edge.target)
                if (!source || !target) return null

                const isHighlighted = hoveredNode &&
                  (edge.source === hoveredNode || edge.target === hoveredNode)
                const isDimmed = hoveredNode && !isHighlighted

                return (
                  <line
                    key={index}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isHighlighted ? '#3b82f6' : '#9ca3af'}
                    strokeWidth={isHighlighted ? 3 : 1}
                    opacity={isDimmed ? 0.2 : isHighlighted ? 1 : 0.6}
                    className="transition-all duration-300"
                  />
                )
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const pos = nodePositions.get(node.id)
                if (!pos) return null

                const isHovered = hoveredNode === node.id
                const isConnected = connectedNodes.has(node.id)
                const isDimmed = hoveredNode && !isHovered && !isConnected
                const radius = nodeRadius + (node.tag_count * 2)

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => onNodeClick(node.id)}
                    className="cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node circle */}
                    <circle
                      r={radius}
                      fill={isHovered ? '#3b82f6' : isConnected ? '#60a5fa' : '#ffffff'}
                      stroke={isHovered ? '#2563eb' : '#6b7280'}
                      strokeWidth={isHovered ? 3 : 2}
                      opacity={isDimmed ? 0.3 : 1}
                      className="transition-all duration-300"
                    />

                    {/* Node label */}
                    <text
                      dy={radius + 15}
                      textAnchor="middle"
                      className="text-xs fill-neutral-700 dark:fill-neutral-300 pointer-events-none"
                      style={{ fontSize: '10px', fontWeight: isHovered ? 'bold' : 'normal' }}
                    >
                      {node.title.length > 20 ? node.title.substring(0, 20) + '...' : node.title}
                    </text>

                    {/* Tag count indicator */}
                    {node.tag_count > 0 && (
                      <circle
                        r={8}
                        cx={radius - 5}
                        cy={-radius + 5}
                        fill="#f59e0b"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-neutral-200 dark:border-dark-border text-sm text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-white border-2 border-gray-400"></span>
              Note
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              Connected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-600"></span>
              Selected
            </span>
            <span className="ml-auto">
              {nodes.length} notes • {edges.length} connections
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
