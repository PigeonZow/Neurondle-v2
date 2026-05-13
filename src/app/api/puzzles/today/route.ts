import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/supabase'
import { getTodayDate } from '@/lib/services/puzzles'
import type { Puzzle, Hint, TokenActivation } from '@/types'

export async function GET() {
  try {
    const supabase = createServerClient()
    const today = getTodayDate()

    const { data: latest } = await supabase
      .from('puzzles')
      .select('date')
      .lte('date', today)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latest?.date) {
      return NextResponse.json(getMockPuzzles(today))
    }

    const { data: puzzles, error } = await supabase
      .from('puzzles')
      .select('*')
      .eq('date', latest.date)
      .order('round_number', { ascending: true })

    if (error || !puzzles || puzzles.length === 0) {
      console.error('Database error:', error)
      return NextResponse.json(getMockPuzzles(today))
    }

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
    return NextResponse.json(getMockPuzzles(getTodayDate()))
  }
}

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h
}

function tokenize(text: string): string[] {
  return text.match(/\s*\S+/g) ?? []
}

function makeHint(level: number, text: string, peakWords: string[]): Hint {
  const tokens = tokenize(text)
  const peakSet = new Set(peakWords.map(w => w.toLowerCase()))
  const score = 6 + level * 2.4

  const tokenActivations: TokenActivation[] = tokens.map((tok, i) => {
    const word = tok.toLowerCase().replace(/[^a-z0-9]/g, '')
    const isPeak = peakSet.has(word)
    const noise = (djb2(`${tok}|${i}|${level}`) % 1000) / 1000
    const activation = isPeak
      ? score * (0.7 + noise * 0.3)
      : score * 0.12 * noise
    return { token: tok, activation: Number(activation.toFixed(2)) }
  })

  const maxScore = Math.max(...tokenActivations.map(t => t.activation))

  return {
    id: `hint_${level}`,
    text,
    score: Number(maxScore.toFixed(2)),
    tokens: tokenActivations,
    level,
  }
}

const ROUND_1_HINTS: [string, string[]][] = [
  ['She turned the page and continued reading the book by the window.', ['page']],
  ['The team gathered around the whiteboard to sketch out the architecture.', ['architecture', 'sketch']],
  ['He opened the editor and started typing the first line of the script.', ['editor', 'script', 'typing']],
  ['Loop through the array and apply the transformation to each element.', ['loop', 'array', 'transformation', 'element']],
  ['The compiler raised a syntax error on line forty two of the source file.', ['compiler', 'syntax', 'error', 'source', 'file']],
  ['import numpy as np from collections import defaultdict, Counter', ['import', 'numpy', 'np', 'collections', 'defaultdict', 'counter']],
  ['def quicksort(arr): if len(arr) <= 1: return arr; pivot = arr[0]', ['def', 'quicksort', 'arr', 'return', 'pivot', 'len']],
  ['The function returns a Promise that resolves to the parsed JSON response.', ['function', 'returns', 'promise', 'resolves', 'parsed', 'json', 'response']],
  ['Use git commit -m "fix bug" and then push to the remote repository.', ['git', 'commit', 'push', 'remote', 'repository', 'fix', 'bug']],
  ['class UserController extends BaseController { async create(req, res) { const user = await User.create(req.body); res.json(user); } }', ['class', 'usercontroller', 'extends', 'basecontroller', 'async', 'create', 'await', 'json']],
]

const ROUND_2_HINTS: [string, string[]][] = [
  ['The restaurant on the corner has been there for thirty years now.', ['restaurant']],
  ['She set the table while he poured the wine into the glasses.', ['table', 'wine', 'glasses']],
  ['Preheat the oven to three hundred and fifty degrees before starting.', ['preheat', 'oven', 'degrees']],
  ['Add a pinch of salt and a tablespoon of olive oil to the mixture.', ['salt', 'olive', 'oil', 'tablespoon', 'pinch']],
  ['Whisk the eggs until light and fluffy, then fold in the flour gently.', ['whisk', 'eggs', 'flour', 'fold']],
  ['Saute the garlic and onions in butter until they are golden brown and fragrant.', ['saute', 'garlic', 'onions', 'butter', 'golden', 'fragrant']],
  ['Combine the flour, sugar, baking powder, and salt in a large mixing bowl.', ['flour', 'sugar', 'baking', 'powder', 'salt', 'bowl']],
  ['Simmer the sauce on low heat for at least twenty minutes, stirring occasionally.', ['simmer', 'sauce', 'heat', 'stirring', 'minutes']],
  ['Marinate the chicken in soy sauce, ginger, and garlic for several hours.', ['marinate', 'chicken', 'soy', 'sauce', 'ginger', 'garlic']],
  ['Roast the vegetables with thyme, rosemary, and a drizzle of balsamic vinegar.', ['roast', 'vegetables', 'thyme', 'rosemary', 'balsamic', 'vinegar', 'drizzle']],
]

const ROUND_3_HINTS: [string, string[]][] = [
  ['He stepped outside and noticed the change in the air this morning.', ['air']],
  ['The wind picked up suddenly as they walked along the empty beach.', ['wind', 'beach']],
  ['Dark clouds gathered over the mountains as the afternoon went on.', ['clouds', 'mountains']],
  ['The forecast predicts heavy rain and possible thunderstorms by evening.', ['forecast', 'rain', 'thunderstorms', 'evening']],
  ['Temperatures will drop below freezing overnight with a chance of snow.', ['temperatures', 'freezing', 'snow', 'overnight']],
  ['A severe weather warning was issued for the coastal counties this afternoon.', ['weather', 'warning', 'coastal', 'severe']],
  ['The humidity climbed throughout the day, making the heat feel oppressive.', ['humidity', 'heat', 'oppressive', 'climbed']],
  ['Hurricane season brings strong winds, heavy rainfall, and dangerous storm surges.', ['hurricane', 'winds', 'rainfall', 'storm', 'surges', 'season']],
  ['Climate models predict rising sea levels and more frequent extreme weather events.', ['climate', 'sea', 'levels', 'weather', 'extreme', 'models']],
  ['The blizzard dumped over two feet of snow, with subzero temperatures and gale force winds.', ['blizzard', 'snow', 'subzero', 'temperatures', 'gale', 'winds']],
]

function buildHints(rows: [string, string[]][]): Hint[] {
  return rows.map(([text, peaks], i) => makeHint(i + 1, text, peaks))
}

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
      hints: buildHints(ROUND_1_HINTS),
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
      hints: buildHints(ROUND_2_HINTS),
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
      hints: buildHints(ROUND_3_HINTS),
      answerX: -0.5,
      answerY: -2.8,
    },
  ]
}
