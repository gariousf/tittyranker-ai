// This file simulates a backend service for tournament management
// In a real application, this would be replaced with API calls to a backend server

// Use localStorage for persistence in this demo
// In a real app, this would be a database

// Helper to safely access localStorage (avoid SSR issues)
const getLocalStorage = () => {
  if (typeof window !== "undefined") {
    return window.localStorage
  }
  return null
}

// Generate a unique user ID or retrieve existing one
export const getUserId = async (): Promise<string> => {
  const storage = getLocalStorage()
  if (!storage) return Math.random().toString(36).substring(2, 15)

  let userId = storage.getItem("photo_tournament_user_id")
  if (!userId) {
    userId = Math.random().toString(36).substring(2, 15)
    storage.setItem("photo_tournament_user_id", userId)
  }

  // Update last active timestamp
  updateUserActivity()

  return userId
}

// Update user activity timestamp
export const updateUserActivity = async (): Promise<void> => {
  const storage = getLocalStorage()
  if (!storage) return

  const userId = await getUserId()
  const now = new Date().toISOString()

  // Get active users
  let activeUsers = JSON.parse(storage.getItem("photo_tournament_active_users") || "[]")

  // Update or add this user
  const userIndex = activeUsers.findIndex((u: any) => u.id === userId)
  if (userIndex >= 0) {
    activeUsers[userIndex].lastActive = now
  } else {
    activeUsers.push({ id: userId, lastActive: now })
  }

  // Remove inactive users (inactive for more than 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  activeUsers = activeUsers.filter((u: any) => u.lastActive > twoMinutesAgo)

  storage.setItem("photo_tournament_active_users", JSON.stringify(activeUsers))
}

// Get active users
export const getActiveUsers = async (): Promise<any[]> => {
  const storage = getLocalStorage()
  if (!storage) return []

  // Get active users
  const activeUsers = JSON.parse(storage.getItem("photo_tournament_active_users") || "[]")

  // Remove inactive users (inactive for more than 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const filteredUsers = activeUsers.filter((u: any) => u.lastActive > twoMinutesAgo)

  // Update storage if we filtered any users
  if (filteredUsers.length !== activeUsers.length) {
    storage.setItem("photo_tournament_active_users", JSON.stringify(filteredUsers))
  }

  return filteredUsers
}

// Get current tournament state
export const getTournamentState = async (): Promise<any> => {
  const storage = getLocalStorage()
  if (!storage) return null

  const tournamentData = storage.getItem("photo_tournament_data")
  if (!tournamentData) return null

  return JSON.parse(tournamentData)
}

// Update tournament state
export const updateTournamentState = async (tournamentData: any): Promise<void> => {
  const storage = getLocalStorage()
  if (!storage) return

  storage.setItem("photo_tournament_data", JSON.stringify(tournamentData))
}

// Vote for a matchup
export const voteForMatchup = async (matchupIndex: number, winnerIndex: 0 | 1, userId: string): Promise<any> => {
  const storage = getLocalStorage()
  if (!storage) return null

  // Get current tournament state
  const tournamentData = await getTournamentState()
  if (!tournamentData) return null

  // Check if user has already voted
  if (tournamentData.bracket[matchupIndex].votedUsers.includes(userId)) {
    return tournamentData
  }

  // Update votes
  if (winnerIndex === 0) {
    tournamentData.bracket[matchupIndex].player1Votes += 1
  } else {
    tournamentData.bracket[matchupIndex].player2Votes += 1
  }

  // Add user to voted users
  tournamentData.bracket[matchupIndex].votedUsers.push(userId)

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
    const currentRoundMatchups = tournamentData.bracket.filter((m: any) => m.round === tournamentData.currentRound)
    const nextIncompleteMatchupIndex = tournamentData.bracket.findIndex(
      (m: any, i: number) => i > matchupIndex && m.round === tournamentData.currentRound && !m.completed,
    )

    if (nextIncompleteMatchupIndex >= 0) {
      tournamentData.currentMatchup = nextIncompleteMatchupIndex
    } else {
      // Check if round is complete
      const allCompleted = currentRoundMatchups.every((m: any) => m.completed)
      if (allCompleted) {
        tournamentData.roundComplete = true
      }
    }
  }

  // Save updated tournament state
  await updateTournamentState(tournamentData)

  return tournamentData
}

// Check if user has voted in current matchup
export const hasUserVotedInCurrentMatchup = async (userId: string): Promise<boolean> => {
  const tournamentData = await getTournamentState()
  if (!tournamentData || tournamentData.roundComplete || tournamentData.tournamentComplete) return false

  const currentMatchup = tournamentData.bracket[tournamentData.currentMatchup]
  if (!currentMatchup) return false

  return currentMatchup.votedUsers.includes(userId)
}

