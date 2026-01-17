import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'
import { getTodayDate } from '@/lib/services/puzzles'
import type { Puzzle } from '@/types'

export async function GET() {
  try {
    const supabase = createServerClient()
    const today = getTodayDate()

    const { data: puzzles, error } = await supabase
      .from('puzzles')
      .select('*')
      .eq('date', today)
      .order('round_number', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch puzzles' }, { status: 500 })
    }

    if (!puzzles || puzzles.length === 0) {
      // Return mock puzzles for development if none exist
      return NextResponse.json(getMockPuzzles(today))
    }

    // Transform database rows to Puzzle type
    const formattedPuzzles: Puzzle[] = puzzles.map(p => ({
      id: p.id,
      featureIndex: p.feature_index,
      modelId: p.model_id,
      layer: p.layer,
      date: p.date,
      roundNumber: p.round_number,
      groundTruthLabel: p.ground_truth_label,
      hints: p.hints as Puzzle['hints'],
      answerX: p.answer_x,
      answerY: p.answer_y,
    }))

    return NextResponse.json(formattedPuzzles)
  } catch (error) {
    console.error('Error fetching puzzles:', error)
    // Return mock puzzles if database isn't set up
    return NextResponse.json(getMockPuzzles(getTodayDate()))
  }
}

// Mock puzzles for development/demo
function getMockPuzzles(date: string): Puzzle[] {
  return [
    {
      id: 'mock-1',
      featureIndex: 1234,
      modelId: 'gemma-2-2b',
      layer: '12-gemmascope-res-16k',
      date,
      roundNumber: 1,
      groundTruthLabel: 'references to programming and code',
      hints: [
        {
          id: 'hint_1',
          text: 'The function returns a value',
          score: 12.5,
          tokens: [
            { token: 'The', activation: 0.1 },
            { token: ' function', activation: 8.2 },
            { token: ' returns', activation: 12.5 },
            { token: ' a', activation: 0.3 },
            { token: ' value', activation: 5.1 },
          ],
          level: 1,
        },
        {
          id: 'hint_2',
          text: 'import numpy as np',
          score: 25.3,
          tokens: [
            { token: 'import', activation: 25.3 },
            { token: ' numpy', activation: 18.7 },
            { token: ' as', activation: 2.1 },
            { token: ' np', activation: 15.2 },
          ],
          level: 2,
        },
      ],
      answerX: -2.5,
      answerY: 3.8,
    },
    {
      id: 'mock-2',
      featureIndex: 5678,
      modelId: 'gemma-2-2b',
      layer: '12-gemmascope-res-16k',
      date,
      roundNumber: 2,
      groundTruthLabel: 'references to food and cooking',
      hints: [
        {
          id: 'hint_1',
          text: 'Add salt and pepper to taste',
          score: 18.2,
          tokens: [
            { token: 'Add', activation: 5.1 },
            { token: ' salt', activation: 18.2 },
            { token: ' and', activation: 0.2 },
            { token: ' pepper', activation: 15.8 },
            { token: ' to', activation: 0.1 },
            { token: ' taste', activation: 12.3 },
          ],
          level: 1,
        },
      ],
      answerX: 4.2,
      answerY: -1.5,
    },
    {
      id: 'mock-3',
      featureIndex: 9012,
      modelId: 'gemma-2-2b',
      layer: '12-gemmascope-res-16k',
      date,
      roundNumber: 3,
      groundTruthLabel: 'references to weather and climate',
      hints: [
        {
          id: 'hint_1',
          text: 'The forecast shows rain tomorrow',
          score: 22.1,
          tokens: [
            { token: 'The', activation: 0.2 },
            { token: ' forecast', activation: 22.1 },
            { token: ' shows', activation: 3.5 },
            { token: ' rain', activation: 19.8 },
            { token: ' tomorrow', activation: 8.2 },
          ],
          level: 1,
        },
      ],
      answerX: -0.5,
      answerY: -2.8,
    },
  ]
}
