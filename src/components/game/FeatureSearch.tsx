'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import type { UmapPoint } from '@/types'

interface FeatureSearchProps {
  data: UmapPoint[]
  onFilterChange: (query: string) => void
  onJumpToPoint: (point: UmapPoint) => void
}

type SearchMode = 'filter' | 'jump'

export function FeatureSearch({ data, onFilterChange, onJumpToPoint }: FeatureSearchProps) {
  const [searchInput, setSearchInput] = useState('')
  const [mode, setMode] = useState<SearchMode>('filter')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Build Fuse index once
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: ['description'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    })
  }, [data])

  // Get fuzzy search results for jump mode
  const searchResults = useMemo(() => {
    if (mode !== 'jump' || searchInput.length < 2) return []
    const results = fuse.search(searchInput, { limit: 8 })
    return results.map(r => r.item)
  }, [fuse, searchInput, mode])

  // Debounced filter change
  useEffect(() => {
    if (mode !== 'filter') {
      onFilterChange('')
      return
    }

    const timer = setTimeout(() => {
      onFilterChange(searchInput)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchInput, mode, onFilterChange])

  // Show dropdown when in jump mode with results
  useEffect(() => {
    setShowDropdown(mode === 'jump' && searchResults.length > 0 && searchInput.length >= 2)
    setSelectedIndex(0)
  }, [mode, searchResults.length, searchInput])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'jump' && showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
        e.preventDefault()
        handleSelectResult(searchResults[selectedIndex])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    }
  }

  const handleSelectResult = (point: UmapPoint) => {
    onJumpToPoint(point)
    setShowDropdown(false)
    setSearchInput('')
  }

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode)
    setSearchInput('')
    if (newMode === 'filter') {
      onFilterChange('')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Mode toggle */}
      <div className="flex mb-2 bg-game-bg rounded-lg p-1">
        <button
          onClick={() => handleModeChange('filter')}
          className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors ${
            mode === 'filter'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Highlight
        </button>
        <button
          onClick={() => handleModeChange('jump')}
          className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors ${
            mode === 'jump'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Jump to
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => mode === 'jump' && searchResults.length > 0 && setShowDropdown(true)}
          placeholder={mode === 'filter' ? 'Highlight matching features...' : 'Search for a feature...'}
          className="w-full bg-game-bg border border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput('')
              onFilterChange('')
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Jump mode dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-game-surface border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
          {searchResults.map((point, index) => (
            <button
              key={point.index}
              onClick={() => handleSelectResult(point)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-gray-800 last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-600/30 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-gray-500 text-xs mr-2">#{point.index}</span>
              <span className="line-clamp-1">{point.description || 'No description'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter mode indicator */}
      {mode === 'filter' && searchInput && (
        <p className="text-xs text-gray-500 mt-1">
          Highlighting features containing &quot;{searchInput}&quot;
        </p>
      )}
    </div>
  )
}
