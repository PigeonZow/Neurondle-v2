'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import type { UmapPoint } from '@/types'

interface FeatureSearchProps {
  data: UmapPoint[]
  onFilterChange: (query: string) => void
  onJumpToPoint: (point: UmapPoint) => void
}

export function FeatureSearch({ data, onFilterChange, onJumpToPoint }: FeatureSearchProps) {
  const [searchInput, setSearchInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeFilter, setActiveFilter] = useState('')
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

  // Get fuzzy search results
  const searchResults = useMemo(() => {
    if (searchInput.length < 2) return []
    const results = fuse.search(searchInput, { limit: 6 })
    return results.map(r => r.item)
  }, [fuse, searchInput])

  // Total items in dropdown: 1 (filter option) + feature results
  const totalDropdownItems = searchInput.length >= 2 ? 1 + searchResults.length : 0

  // Show dropdown when there's input
  useEffect(() => {
    setShowDropdown(searchInput.length >= 2)
    setSelectedIndex(0)
  }, [searchInput])

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

  // Apply filter action
  const applyFilter = () => {
    if (searchInput.length < 2) return
    setActiveFilter(searchInput)
    onFilterChange(searchInput)
    setShowDropdown(false)
  }

  // Jump to feature action
  const jumpToFeature = (point: UmapPoint) => {
    onJumpToPoint(point)
    setShowDropdown(false)
    setSearchInput('')
  }

  // Clear filter
  const clearFilter = () => {
    setSearchInput('')
    setActiveFilter('')
    onFilterChange('')
    setShowDropdown(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter' && searchInput.length >= 2) {
        applyFilter()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, totalDropdownItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex === 0) {
        // First item = filter option
        applyFilter()
      } else {
        // Feature result
        const featureIndex = selectedIndex - 1
        if (searchResults[featureIndex]) {
          jumpToFeature(searchResults[featureIndex])
        }
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchInput.length >= 2 && setShowDropdown(true)}
          placeholder="Search features..."
          className="w-full bg-game-bg border border-gray-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
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
            onClick={clearFilter}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown with filter option + feature results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-game-surface border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
          {/* Filter option - always first */}
          <button
            onClick={applyFilter}
            className={`w-full text-left px-2 py-1.5 text-xs border-b border-gray-800 transition-colors flex items-center gap-2 ${
              selectedIndex === 0
                ? 'bg-primary-600/30 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Highlight labels containing &quot;{searchInput}&quot;</span>
          </button>

          {/* Feature results */}
          {searchResults.map((point, index) => (
            <button
              key={point.index}
              onClick={() => jumpToFeature(point)}
              className={`w-full text-left px-2 py-1.5 text-xs border-b border-gray-800 last:border-b-0 transition-colors ${
                index + 1 === selectedIndex
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

      {/* Active filter indicator */}
      {activeFilter && !showDropdown && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-yellow-400/80 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Highlighting labes containing &quot;{activeFilter}&quot;
          </span>
          <button
            onClick={clearFilter}
            className="text-gray-500 hover:text-white text-xs"
          >
            (clear)
          </button>
        </div>
      )}
    </div>
  )
}
