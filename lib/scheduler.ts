// Scheduler utility for tournament timing
import { getTournamentState, initializeTournament } from "@/app/actions/tournament-actions"

// Constants for tournament timing
export const TOURNAMENT_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
export const TOURNAMENT_DURATION_MS = 30 * 60 * 1000 // 30 minutes

// Check if a tournament should be started
export async function shouldStartTournament(): Promise<boolean> {
  const currentTournament = await getTournamentState()
  
  // If no tournament exists, start one
  if (!currentTournament) return true
  
  // If tournament exists but is not active, start a new one
  if (!currentTournament.isActive) return true
  
  // Check if the current tournament has exceeded its duration
  const startedAt = new Date(currentTournament.startedAt).getTime()
  const now = Date.now()
  const elapsed = now - startedAt
  
  return elapsed >= TOURNAMENT_DURATION_MS
}

// Check if it's time for a new tournament based on the interval
export function isTimeForNewTournament(lastTournamentTime: number): boolean {
  const now = Date.now()
  return now - lastTournamentTime >= TOURNAMENT_INTERVAL_MS
} 