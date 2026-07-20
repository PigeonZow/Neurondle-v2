'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import type { UmapPoint } from '@/types'

interface FeatureSearchProps {
  data: UmapPoint[]
  matchCount: number
  matchCursor: number
  onFilterChange: (query: string) => void
  onJumpToMatch: (direction: 1 | -1) => void
  onJumpToPoint: (point: UmapPoint) => void
}

export function FeatureSearch({
  data,
  matchCount,
  matchCursor,
  onFilterChange,
  onJumpToMatch,
  onJumpToPoint,
}: FeatureSearchProps) {
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

  // Get fuzzy search results, best match first; the dropdown reveals them
  // incrementally as the user scrolls
  const allResults = useMemo(() => {
    if (searchInput.length < 2) return []
    return fuse.search(searchInput).map(r => r.item)
  }, [fuse, searchInput])

  const [visibleCount, setVisibleCount] = useState(6)
  const searchResults = useMemo(
    () => allResults.slice(0, visibleCount),
    [allResults, visibleCount]
  )

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount(c => (c < allResults.length ? c + 6 : c))
    }
  }

  // Total items in dropdown: 1 (filter option) + feature results
  const totalDropdownItems = searchInput.length >= 2 ? 1 + searchResults.length : 0

  // Show dropdown when there's input
  useEffect(() => {
    setShowDropdown(searchInput.length >= 2)
    setSelectedIndex(0)
    setVisibleCount(6)
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
        // Browser-find semantics: with the filter already applied, Enter cycles
        // through matches; if the input changed, Enter applies the new filter.
        if (activeFilter && searchInput === activeFilter) {
          onJumpToMatch(e.shiftKey ? -1 : 1)
        } else {
          applyFilter()
        }
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
    <div className="relative" ref={dropdownRef} data-onboarding="feature-search">
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
          className="w-full bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-white/15 rounded-lg pl-10 pr-9 py-2 2xl:py-2.5 text-sm 2xl:text-base text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown with filter option + feature results */}
      {showDropdown && (
        <div
          onScroll={handleDropdownScroll}
          className="absolute top-full left-0 right-0 mt-1 bg-game-surface border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50"
        >
          {/* Filter option - always first */}
          <button
            onClick={applyFilter}
            className={`w-full text-left px-2 py-1.5 text-xs border-b border-gray-800 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight ${
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
              className={`w-full text-left px-2 py-1.5 text-xs border-b border-gray-800 last:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight ${
                index + 1 === selectedIndex
                  ? 'bg-primary-600/30 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-gray-500 text-xs mr-2">#{point.index}</span>
              <span className="line-clamp-1">{point.description || 'No description'}</span>
            </button>
          ))}

          {allResults.length > visibleCount && (
            <div className="px-2 py-1.5 text-xs text-gray-500 text-center">
              {allResults.length - visibleCount} more — keep scrolling
            </div>
          )}
        </div>
      )}

      {/* Results bar: floats below the header so it never affects its layout */}
      {activeFilter && !showDropdown && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-game-surface/90 backdrop-blur-md border border-white/10 shadow-lg pl-3 pr-1 py-1 text-xs">
          <span className="flex items-center gap-1.5 text-yellow-400/80">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="max-w-[16rem] truncate">&quot;{activeFilter}&quot;</span>
            {/* Invisible sizers reserve the widest label so the pill (and the
                buttons in it) never shift while cycling through matches */}
            <span className="inline-grid text-center tabular-nums text-gray-400">
              <span className="invisible col-start-1 row-start-1" aria-hidden="true">
                {matchCount} matches
              </span>
              <span className="invisible col-start-1 row-start-1" aria-hidden="true">
                {matchCount}/{matchCount}
              </span>
              <span className="col-start-1 row-start-1">
                {matchCount === 0
                  ? 'no matches'
                  : matchCursor === -1
                    ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`
                    : `${matchCursor + 1}/${matchCount}`}
              </span>
            </span>
          </span>
          {matchCount > 0 && (
            <span className="flex items-center">
              <button
                onClick={() => onJumpToMatch(-1)}
                aria-label="Previous match"
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => onJumpToMatch(1)}
                aria-label="Next match"
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </span>
          )}
          <button
            onClick={clearFilter}
            aria-label="Clear filter"
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-game-highlight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
