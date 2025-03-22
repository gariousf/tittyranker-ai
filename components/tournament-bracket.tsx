import type React from "react"
import Image from "next/image"

interface Photo {
  id: number
  url: string
  description: string
  aiRating: number
  wins: number
  userVotes: number
  tier?: string
}

interface MatchupProps {
  player1: Photo | null
  player2: Photo | null
  winner: Photo | null
  round: number
  match: number
  completed: boolean
  player1Votes?: number
  player2Votes?: number
}

interface TournamentBracketProps {
  bracket: MatchupProps[]
  currentRound: number
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ bracket, currentRound }) => {
  // Group matchups by round
  const roundMatchups: { [key: number]: MatchupProps[] } = {}

  bracket.forEach((matchup) => {
    if (!roundMatchups[matchup.round]) {
      roundMatchups[matchup.round] = []
    }
    roundMatchups[matchup.round].push(matchup)
  })

  // Get all rounds
  const rounds = Object.keys(roundMatchups)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: rounds.length * 220 + "px" }}>
        {rounds.map((round) => (
          <div key={round} className="flex-1 min-w-[200px]">
            <h3 className={`text-center font-semibold mb-4 ${round === currentRound ? "text-primary" : ""}`}>
              {round === 1
                ? "First Round"
                : round === 2
                  ? "Second Round"
                  : round === 3
                    ? "Quarter Finals"
                    : round === 4
                      ? "Semi Finals"
                      : round === 5
                        ? "Finals"
                        : `Round ${round}`}
            </h3>
            <div className="space-y-6">
              {roundMatchups[round].map((matchup, index) => (
                <div
                  key={`${round}-${index}`}
                  className={`p-2 rounded-lg ${matchup.completed ? "bg-muted/50" : "bg-card"}`}
                  style={{
                    marginTop: round > 1 ? `${Math.pow(2, round - 1) * 20}px` : "0",
                    marginBottom: round > 1 ? `${Math.pow(2, round - 1) * 20}px` : "0",
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <div
                      className={`flex items-center gap-2 p-2 rounded ${matchup.winner === matchup.player1 ? "bg-green-100 dark:bg-green-900/20" : ""}`}
                    >
                      {matchup.player1 ? (
                        <>
                          <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={matchup.player1.url || "/placeholder.svg"}
                              alt={matchup.player1.description}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm truncate flex-1">
                            {matchup.player1.description.substring(0, 20)}
                            {matchup.player1.description.length > 20 ? "..." : ""}
                          </span>
                          {matchup.player1 && matchup.player1Votes !== undefined && (
                            <span className="text-xs text-muted-foreground ml-auto">{matchup.player1Votes} votes</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">TBD</span>
                      )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">vs</div>

                    <div
                      className={`flex items-center gap-2 p-2 rounded ${matchup.winner === matchup.player2 ? "bg-green-100 dark:bg-green-900/20" : ""}`}
                    >
                      {matchup.player2 ? (
                        <>
                          <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={matchup.player2.url || "/placeholder.svg"}
                              alt={matchup.player2.description}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="text-sm truncate flex-1">
                            {matchup.player2.description.substring(0, 20)}
                            {matchup.player2.description.length > 20 ? "..." : ""}
                          </span>
                          {matchup.player2 && matchup.player2Votes !== undefined && (
                            <span className="text-xs text-muted-foreground ml-auto">{matchup.player2Votes} votes</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Bye</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TournamentBracket

