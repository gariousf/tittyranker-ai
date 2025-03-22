"use server"

import { revalidatePath } from "next/cache"
import redis, { safeRedis } from "@/lib/redis"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

// Key prefixes for Redis
const TOURNAMENT_KEY = "photo_tournament"
const USER_KEY = "photo_user"
const ACTIVE_USERS_KEY = "photo_active_users"
const USER_VOTES_KEY = "photo_user_votes"

// Types
export interface TournamentState {
  isActive: boolean
  startedBy: string
  startedAt: string
  bracket: MatchupProps[]
  currentRound: number
  currentMatchup: number
  roundComplete: boolean
  tournamentComplete: boolean
}

export interface MatchupProps {
  round: number
  match: number
  player1: any
  player2: any | null
  player1Votes: number
  player2Votes: number
  votedUsers: string[]
  winner: any | null
  completed: boolean
}

export interface UserSession {
  id: string
  lastActive: string
  name?: string
}

// Get or create user session
export async function getUserSession(): Promise<UserSession> {
  // Await the cookies() function itself
  const cookieStore = await cookies()
  let userId = cookieStore.get("photo_user_id")?.value

  if (!userId) {
    userId = uuidv4()
    cookieStore.set("photo_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })
  }

  const now = new Date().toISOString()
  const user: UserSession = {
    id: userId,
    lastActive: now,
  }

  // Update user in Redis
  await redis.hset(`${USER_KEY}:${userId}`, user)

  // Update active users
  await updateActiveUser(userId, now)

  return user
}

// Update user activity
async function updateActiveUser(userId: string, timestamp: string) {
  await redis.hset(ACTIVE_USERS_KEY, { [userId]: timestamp })

  // Clean up inactive users (older than 5 minutes)
  const activeUsers = (await redis.hgetall(ACTIVE_USERS_KEY)) as Record<string, string>
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  for (const [id, lastActive] of Object.entries(activeUsers)) {
    if (lastActive < fiveMinutesAgo) {
      await redis.hdel(ACTIVE_USERS_KEY, id)
    }
  }
}

// Get active users
export async function getActiveUsers(): Promise<UserSession[]> {
  const activeUsers = (await redis.hgetall(ACTIVE_USERS_KEY)) as Record<string, string>
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const users: UserSession[] = []
  for (const [id, lastActive] of Object.entries(activeUsers)) {
    if (lastActive >= fiveMinutesAgo) {
      users.push({
        id,
        lastActive,
      })
    } else {
      // Clean up inactive user
      await redis.hdel(ACTIVE_USERS_KEY, id)
    }
  }

  return users
}

// Get current tournament state
export async function getTournamentState(): Promise<TournamentState | null> {
  const tournamentData = await redis.get(TOURNAMENT_KEY)
  return tournamentData as TournamentState | null
}

// Create or update tournament
export async function createOrUpdateTournament(tournamentData: TournamentState): Promise<TournamentState> {
  await redis.set(TOURNAMENT_KEY, tournamentData)
  revalidatePath("/")
  return tournamentData
}

// Initialize a new tournament
export async function initializeTournament(photos: any[]): Promise<TournamentState> {
  const user = await getUserSession()

  // Shuffle photos for random seeding
  const shuffledPhotos = [...photos].sort(() => Math.random() - 0.5)

  // Create first round matchups
  const matchups: MatchupProps[] = []
  for (let i = 0; i < shuffledPhotos.length; i += 2) {
    if (i + 1 < shuffledPhotos.length) {
      matchups.push({
        round: 1,
        match: matchups.length + 1,
        player1: shuffledPhotos[i],
        player2: shuffledPhotos[i + 1],
        player1Votes: 0,
        player2Votes: 0,
        votedUsers: [],
        winner: null,
        completed: false,
      })
    } else {
      // If odd number of photos, give one a bye
      matchups.push({
        round: 1,
        match: matchups.length + 1,
        player1: shuffledPhotos[i],
        player2: null, // Bye
        player1Votes: 0,
        player2Votes: 0,
        votedUsers: [],
        winner: shuffledPhotos[i], // Auto-advance
        completed: true,
      })
    }
  }

  const tournamentData: TournamentState = {
    isActive: true,
    startedBy: user.id,
    startedAt: new Date().toISOString(),
    bracket: matchups,
    currentRound: 1,
    currentMatchup: 0,
    roundComplete: false,
    tournamentComplete: false,
  }

  await createOrUpdateTournament(tournamentData)
  return tournamentData
}

// Vote for a matchup
export async function voteForMatchup(matchupIndex: number, winnerIndex: 0 | 1): Promise<TournamentState | null> {
  const user = await getUserSession()

  // Get current tournament state
  const tournamentData = await getTournamentState()
  if (!tournamentData) return null

  // Check if user has already voted
  if (tournamentData.bracket[matchupIndex].votedUsers.includes(user.id)) {
    return tournamentData
  }

  // Update votes
  if (winnerIndex === 0) {
    tournamentData.bracket[matchupIndex].player1Votes += 1
  } else {
    tournamentData.bracket[matchupIndex].player2Votes += 1
  }

  // Add user to voted users
  tournamentData.bracket[matchupIndex].votedUsers.push(user.id)

  // Store user's vote in their history
  await recordUserVote(user.id, tournamentData.bracket[matchupIndex], winnerIndex)

  // Check if matchup is complete (3 votes minimum)
  const votesNeeded = 3 // Minimum votes needed to complete a matchup
  const totalVotes =
    tournamentData.bracket[matchupIndex].player1Votes + tournamentData.bracket[matchupIndex].player2Votes

  if (totalVotes >= votesNeeded) {
    // Determine winner
    const player1Votes = tournamentData.bracket[matchupIndex].player1Votes
    const player2Votes = tournamentData.bracket[matchupIndex].player2Votes

    if (player1Votes > player2Votes) {
      tournamentData.bracket[matchupIndex].winner = tournamentData.bracket[matchupIndex].player1
    } else if (player2Votes > player1Votes) {
      tournamentData.bracket[matchupIndex].winner = tournamentData.bracket[matchupIndex].player2
    } else {
      // In case of a tie, choose randomly
      tournamentData.bracket[matchupIndex].winner =
        Math.random() < 0.5
          ? tournamentData.bracket[matchupIndex].player1
          : tournamentData.bracket[matchupIndex].player2
    }

    tournamentData.bracket[matchupIndex].completed = true

    // Move to next matchup or complete round
    const currentRoundMatchups = tournamentData.bracket.filter((m) => m.round === tournamentData.currentRound)
    const nextIncompleteMatchupIndex = tournamentData.bracket.findIndex(
      (m, i) => i > matchupIndex && m.round === tournamentData.currentRound && !m.completed,
    )

    if (nextIncompleteMatchupIndex >= 0) {
      tournamentData.currentMatchup = nextIncompleteMatchupIndex
    } else {
      // Check if round is complete
      const allCompleted = currentRoundMatchups.every((m) => m.completed)
      if (allCompleted) {
        tournamentData.roundComplete = true
      }
    }
  }

  // Save updated tournament state
  await createOrUpdateTournament(tournamentData)
  revalidatePath("/")

  return tournamentData
}

// Record user's vote in their history
async function recordUserVote(userId: string, matchup: MatchupProps, winnerIndex: 0 | 1) {
  const voteKey = `${USER_VOTES_KEY}:${userId}`

  const vote = {
    timestamp: new Date().toISOString(),
    round: matchup.round,
    match: matchup.match,
    votedFor: winnerIndex === 0 ? matchup.player1.id : matchup.player2?.id,
    votedForDescription: winnerIndex === 0 ? matchup.player1.description : matchup.player2?.description,
  }

  // Use safeRedis to ensure proper serialization
  await safeRedis.lpush(voteKey, vote)

  // Keep only the last 100 votes
  await redis.ltrim(voteKey, 0, 99)
}

// Get user's vote history
export async function getUserVotes(userId: string, limit = 100) {
  const voteKey = `user:${userId}:votes`
  
  const votes = await redis.lrange(voteKey, 0, limit - 1)
  return votes.map((vote) => {
    // Check if vote is already an object before parsing
    if (typeof vote === 'string') {
      try {
        return JSON.parse(vote)
      } catch (error) {
        console.error('Error parsing vote:', vote, error)
        return null
      }
    } else {
      // It's already an object, return as is
      return vote
    }
  }).filter(Boolean) // Remove any null values from failed parsing
}

export async function getUserVoteHistory(limit = 10): Promise<any[]> {
  const user = await getUserSession()
  const voteKey = `${USER_VOTES_KEY}:${user.id}`

  const votes = await redis.lrange(voteKey, 0, limit - 1)
  return votes.map((vote) => {
    // Check if vote is already an object before parsing
    if (typeof vote === 'string') {
      try {
        return JSON.parse(vote)
      } catch (error) {
        console.error('Error parsing vote:', vote, error)
        return null
      }
    } else {
      // It's already an object, return as is
      return vote
    }
  }).filter(Boolean) // Remove any null values from failed parsing
}

// Check if user has voted in current matchup
export async function hasUserVotedInCurrentMatchup(): Promise<boolean> {
  const user = await getUserSession()
  const tournamentData = await getTournamentState()

  if (!tournamentData || tournamentData.roundComplete || tournamentData.tournamentComplete) {
    return false
  }

  const currentMatchup = tournamentData.bracket[tournamentData.currentMatchup]
  if (!currentMatchup) return false

  return currentMatchup.votedUsers.includes(user.id)
}

// Advance to next tournament round
export async function advanceToNextRound(): Promise<TournamentState | null> {
  const tournamentData = await getTournamentState()
  if (!tournamentData) return null

  const completedMatches = tournamentData.bracket.filter((m) => m.round === tournamentData.currentRound && m.completed)
  const winners = completedMatches.map((m) => m.winner)

  // If only one winner remains, tournament is complete
  if (winners.length === 1) {
    tournamentData.tournamentComplete = true
    await createOrUpdateTournament(tournamentData)
    revalidatePath("/")
    return tournamentData
  }

  // Create next round matchups
  const nextRound = tournamentData.currentRound + 1
  const newMatchups: MatchupProps[] = []

  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      newMatchups.push({
        round: nextRound,
        match: newMatchups.length + 1,
        player1: winners[i],
        player2: winners[i + 1],
        player1Votes: 0,
        player2Votes: 0,
        votedUsers: [],
        winner: null,
        completed: false,
      })
    } else {
      // If odd number of winners, give one a bye
      newMatchups.push({
        round: nextRound,
        match: newMatchups.length + 1,
        player1: winners[i],
        player2: null, // Bye
        player1Votes: 0,
        player2Votes: 0,
        votedUsers: [],
        winner: winners[i], // Auto-advance
        completed: true,
      })
    }
  }

  tournamentData.bracket = [...tournamentData.bracket, ...newMatchups]
  tournamentData.currentRound = nextRound
  tournamentData.currentMatchup = tournamentData.bracket.length - newMatchups.length
  tournamentData.roundComplete = false

  await createOrUpdateTournament(tournamentData)
  revalidatePath("/")

  return tournamentData
}

// Record casual vote
export async function recordCasualVote(photoId: number, photoDescription: string): Promise<void> {
  const user = await getUserSession()
  const voteKey = `${USER_VOTES_KEY}:${user.id}`

  const vote = {
    timestamp: new Date().toISOString(),
    type: "casual",
    photoId,
    photoDescription,
  }

  // Use safeRedis to ensure proper serialization
  await safeRedis.lpush(voteKey, vote)

  // Keep only the last 100 votes
  await redis.ltrim(voteKey, 0, 99)

  // Increment photo's win count
  await redis.hincrby("photo_wins", photoId.toString(), 1)
}

// Get photo rankings
export async function getPhotoRankings(): Promise<any[]> {
  const wins = (await redis.hgetall("photo_wins")) as Record<string, string>

  // Convert to array of objects
  const rankings = Object.entries(wins).map(([id, wins]) => ({
    id: Number.parseInt(id),
    wins: Number.parseInt(wins),
  }))

  // Sort by wins (descending)
  return rankings.sort((a, b) => b.wins - a.wins)
}

// When storing votes
export async function storeVote(userId: string, vote: any) {
  const voteKey = `user:${userId}:votes`
  // Make sure vote is serialized before storing
  const serializedVote = typeof vote === 'string' ? vote : JSON.stringify(vote)
  await redis.lpush(voteKey, serializedVote)
}

