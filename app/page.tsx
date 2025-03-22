"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Trophy, ChevronRight, Star, BarChart4, Users, RefreshCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { photoData } from "@/data/photos"
import TournamentBracket from "@/components/tournament-bracket"
import TierList from "@/components/tier-list"
import OnlineUsers from "@/components/online-users"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import UserVoteHistory from "@/components/user-vote-history"
import {
  getTournamentState,
  getActiveUsers,
  voteForMatchup,
  hasUserVotedInCurrentMatchup,
  initializeTournament,
  advanceToNextRound,
  recordCasualVote,
  getUserVoteHistory,
} from "@/app/actions/tournament-actions"
import { useRouter } from "next/navigation"

export default function PhotoRanker() {
  const [photos, setPhotos] = useState(photoData)
  const [currentPair, setCurrentPair] = useState<[number, number] | null>(null)
  const [tournamentMode, setTournamentMode] = useState(false)
  const [tournamentRound, setTournamentRound] = useState(1)
  const [tournamentBracket, setTournamentBracket] = useState<any[]>([])
  const [currentMatchup, setCurrentMatchup] = useState(0)
  const [roundComplete, setRoundComplete] = useState(false)
  const [tournamentComplete, setTournamentComplete] = useState(false)
  const [activeTab, setActiveTab] = useState("voting")
  const [isLoading, setIsLoading] = useState(true)
  const [activeUsers, setActiveUsers] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)
  const [votesNeeded, setVotesNeeded] = useState(3) // Minimum votes needed to advance
  const [userVotes, setUserVotes] = useState<any[]>([])
  const { toast } = useToast()
  const router = useRouter()

  // Get a random pair of images for casual voting
  const getRandomPair = () => {
    const availableIndices = Array.from({ length: photos.length }, (_, i) => i)
    const firstIndex = Math.floor(Math.random() * availableIndices.length)
    const first = availableIndices[firstIndex]
    availableIndices.splice(firstIndex, 1)

    const secondIndex = Math.floor(Math.random() * availableIndices.length)
    const second = availableIndices[secondIndex]

    return [first, second] as [number, number]
  }

  // Initialize and fetch tournament state
  useEffect(() => {
    const fetchTournamentData = async () => {
      try {
        // Get tournament state
        const tournamentData = await getTournamentState()

        if (tournamentData && tournamentData.isActive) {
          // Tournament exists, join it
          setTournamentMode(true)
          setTournamentBracket(tournamentData.bracket)
          setTournamentRound(tournamentData.currentRound)
          setCurrentMatchup(tournamentData.currentMatchup)
          setRoundComplete(tournamentData.roundComplete)
          setTournamentComplete(tournamentData.tournamentComplete)

          // Check if user has already voted in current matchup
          const userVoted = await hasUserVotedInCurrentMatchup()
          setHasVoted(userVoted)

          if (tournamentData.isActive) {
            setActiveTab("tournament")
          }

          toast({
            title: "Tournament in Progress",
            description: "You've joined an active tournament. Vote for your favorite photos!",
          })
        } else {
          // No active tournament, set up casual voting
          setCurrentPair(getRandomPair())
        }

        // Get user vote history
        const votes = await getUserVoteHistory()
        setUserVotes(votes)

        // Get active users
        const users = await getActiveUsers()
        setActiveUsers(users.length)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching tournament data:", error)
        setIsLoading(false)
        toast({
          title: "Error",
          description: "Failed to load tournament data. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchTournamentData()

    // Set up polling for tournament updates
    const intervalId = setInterval(async () => {
      try {
        // Get active users
        const users = await getActiveUsers()
        setActiveUsers(users.length)

        // Get tournament state
        const tournamentData = await getTournamentState()
        if (tournamentData && tournamentData.isActive) {
          // Only update if there are changes
          if (
            JSON.stringify(tournamentData.bracket) !== JSON.stringify(tournamentBracket) ||
            tournamentData.currentRound !== tournamentRound ||
            tournamentData.currentMatchup !== currentMatchup ||
            tournamentData.roundComplete !== roundComplete ||
            tournamentData.tournamentComplete !== tournamentComplete
          ) {
            setTournamentMode(true)
            setTournamentBracket(tournamentData.bracket)
            setTournamentRound(tournamentData.currentRound)
            setCurrentMatchup(tournamentData.currentMatchup)
            setRoundComplete(tournamentData.roundComplete)
            setTournamentComplete(tournamentData.tournamentComplete)

            // Check if user has already voted in current matchup
            const userVoted = await hasUserVotedInCurrentMatchup()
            setHasVoted(userVoted)

            if (tournamentData.isActive && activeTab !== "tournament") {
              toast({
                title: "Tournament Updated",
                description: "The tournament has been updated with new votes!",
              })
            }
          }
        }
      } catch (error) {
        console.error("Error polling tournament data:", error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(intervalId)
  }, [tournamentBracket, tournamentRound, currentMatchup, roundComplete, tournamentComplete, activeTab, toast])

  // Initialize tournament bracket
  const startTournament = async () => {
    setIsLoading(true)

    try {
      const tournamentData = await initializeTournament(photos)

      setTournamentBracket(tournamentData.bracket)
      setCurrentMatchup(tournamentData.currentMatchup)
      setTournamentRound(tournamentData.currentRound)
      setRoundComplete(tournamentData.roundComplete)
      setTournamentComplete(tournamentData.tournamentComplete)
      setTournamentMode(true)
      setActiveTab("tournament")
      setHasVoted(false)

      toast({
        title: "Tournament Started!",
        description: "You've started a new tournament. Invite others to join and vote!",
      })
    } catch (error) {
      console.error("Error starting tournament:", error)
      toast({
        title: "Error",
        description: "Failed to start tournament. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  // Handle voting in tournament mode
  const handleTournamentVote = async (winnerIndex: 0 | 1) => {
    if (currentMatchup >= tournamentBracket.length || tournamentComplete || hasVoted) return

    setIsLoading(true)

    try {
      const currentMatch = tournamentBracket[currentMatchup]
      const winner = winnerIndex === 0 ? currentMatch.player1 : currentMatch.player2

      // Register vote
      const updatedTournament = await voteForMatchup(currentMatchup, winnerIndex)

      if (updatedTournament) {
        setTournamentBracket(updatedTournament.bracket)
        setCurrentMatchup(updatedTournament.currentMatchup)
        setRoundComplete(updatedTournament.roundComplete)
        setTournamentComplete(updatedTournament.tournamentComplete)
        setHasVoted(true)

        // Refresh user vote history
        const votes = await getUserVoteHistory()
        setUserVotes(votes)

        toast({
          title: "Vote Recorded",
          description: `You voted for "${winner.description}"`,
        })
      }
    } catch (error) {
      console.error("Error voting in tournament:", error)
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  // Advance to next tournament round
  const handleAdvanceToNextRound = async () => {
    setIsLoading(true)

    try {
      const tournamentData = await advanceToNextRound()

      if (tournamentData) {
        setTournamentBracket(tournamentData.bracket)
        setTournamentRound(tournamentData.currentRound)
        setCurrentMatchup(tournamentData.currentMatchup)
        setRoundComplete(tournamentData.roundComplete)
        setTournamentComplete(tournamentData.tournamentComplete)
        setHasVoted(false)

        toast({
          title: `Round ${tournamentData.currentRound} Started!`,
          description: "The next round of the tournament has begun!",
        })
      }
    } catch (error) {
      console.error("Error advancing tournament round:", error)
      toast({
        title: "Error",
        description: "Failed to advance to the next round. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  // Initialize with a random pair for casual voting
  useEffect(() => {
    if (!tournamentMode && !isLoading) {
      setCurrentPair(getRandomPair())
    }
  }, [tournamentMode, isLoading])

  // Handle voting in casual mode
  const handleCasualVote = async (winnerIndex: number) => {
    if (!currentPair) return

    setIsLoading(true)

    try {
      const winner = photos[currentPair[winnerIndex]]

      // Record vote in database
      await recordCasualVote(winner.id, winner.description)

      // Update local state
      const updatedPhotos = [...photos]
      updatedPhotos[currentPair[winnerIndex]] = {
        ...updatedPhotos[currentPair[winnerIndex]],
        wins: updatedPhotos[currentPair[winnerIndex]].wins + 1,
        userVotes: updatedPhotos[currentPair[winnerIndex]].userVotes + 1,
      }

      setPhotos(updatedPhotos)

      // Refresh user vote history
      const votes = await getUserVoteHistory()
      setUserVotes(votes)

      toast({
        title: "Vote recorded",
        description: `You voted for "${updatedPhotos[currentPair[winnerIndex]].description}"`,
      })

      // Get a new pair
      setCurrentPair(getRandomPair())
    } catch (error) {
      console.error("Error recording casual vote:", error)
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  // Get current tournament matchup
  const getCurrentMatchup = () => {
    if (tournamentComplete || currentMatchup >= tournamentBracket.length) {
      return null
    }
    return tournamentBracket[currentMatchup]
  }

  // Calculate tournament progress
  const getTournamentProgress = () => {
    const totalMatches = tournamentBracket.filter((m) => m.round === tournamentRound).length
    const completedMatches = tournamentBracket.filter((m) => m.round === tournamentRound && m.completed).length
    return (completedMatches / totalMatches) * 100
  }

  // Calculate votes needed to complete current matchup
  const getVotesNeeded = () => {
    if (!getCurrentMatchup()) return 0

    const currentMatch = getCurrentMatchup()
    const totalVotes = currentMatch.player1Votes + currentMatch.player2Votes
    return Math.max(0, votesNeeded - totalVotes)
  }

  // Refresh tournament state
  const refreshTournament = async () => {
    setIsLoading(true)

    try {
      // Force router refresh to get latest data
      router.refresh()

      // Get tournament state
      const tournamentData = await getTournamentState()

      if (tournamentData && tournamentData.isActive) {
        setTournamentMode(true)
        setTournamentBracket(tournamentData.bracket)
        setTournamentRound(tournamentData.currentRound)
        setCurrentMatchup(tournamentData.currentMatchup)
        setRoundComplete(tournamentData.roundComplete)
        setTournamentComplete(tournamentData.tournamentComplete)

        // Check if user has already voted in current matchup
        const userVoted = await hasUserVotedInCurrentMatchup()
        setHasVoted(userVoted)

        // Get user vote history
        const votes = await getUserVoteHistory()
        setUserVotes(votes)

        // Get active users
        const users = await getActiveUsers()
        setActiveUsers(users.length)

        toast({
          title: "Tournament Refreshed",
          description: "The tournament data has been updated.",
        })
      }
    } catch (error) {
      console.error("Error refreshing tournament:", error)
      toast({
        title: "Error",
        description: "Failed to refresh tournament data. Please try again.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Photo Tournament</h1>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <p className="text-muted-foreground">Loading tournament data...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-4">Photo Tournament</h1>
      <p className="text-center text-muted-foreground mb-8">
        Vote for your favorite photos and see which one comes out on top!
      </p>

      <div className="flex justify-between items-center mb-6">
        <OnlineUsers count={activeUsers} />
        <Button variant="outline" size="sm" onClick={refreshTournament} className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {tournamentMode && (
        <Alert className="mb-6">
          <Trophy className="h-4 w-4" />
          <AlertTitle>Tournament in Progress</AlertTitle>
          <AlertDescription>
            {tournamentComplete
              ? "The tournament has ended! Check out the champion and results."
              : hasVoted
                ? "You've already voted in the current matchup. Waiting for other users to vote."
                : "Vote for your favorite photo to advance it in the tournament."}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="voting">Casual Voting</TabsTrigger>
          <TabsTrigger value="tournament">Tournament</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="tiers">Tier List</TabsTrigger>
          <TabsTrigger value="history">Your Votes</TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="mt-6">
          {currentPair && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-8">
                {currentPair.map((photoIndex) => (
                  <Card key={photos[photoIndex].id} className="overflow-hidden">
                    <CardContent className="p-0 relative">
                      <div className="relative aspect-square">
                        <Image
                          src={photos[photoIndex].url || "/placeholder.svg"}
                          alt={photos[photoIndex].description}
                          fill
                          className="object-cover cursor-pointer transition-transform hover:scale-105"
                          onClick={() => handleCasualVote(photoIndex)}
                        />
                      </div>
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span>{photos[photoIndex].aiRating}/10</span>
                      </div>
                      <div className="absolute bottom-16 left-0 right-0 bg-black/70 text-white p-2 text-center">
                        {photos[photoIndex].description}
                      </div>
                      <Button
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                        onClick={() => handleCasualVote(photoIndex)}
                      >
                        Vote for this
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={() => setActiveTab("rankings")} variant="outline" className="flex items-center gap-2">
                  View Rankings <ArrowRight className="h-4 w-4" />
                </Button>
                {!tournamentMode ? (
                  <Button onClick={startTournament} className="flex items-center gap-2">
                    Start Tournament <Trophy className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => setActiveTab("tournament")} className="flex items-center gap-2">
                    Join Tournament <Users className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tournament" className="mt-6">
          {!tournamentMode ? (
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Photo Tournament</h2>
              <p className="mb-6">
                Start a tournament to find the ultimate champion photo! Photos will compete head-to-head in a
                bracket-style tournament.
              </p>
              <Button onClick={startTournament} size="lg" className="flex items-center gap-2">
                Start Tournament <Trophy className="h-4 w-4" />
              </Button>
            </div>
          ) : tournamentComplete ? (
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Tournament Complete!</h2>
              <div className="relative aspect-square w-64 mx-auto mb-6">
                <Image
                  src={tournamentBracket[tournamentBracket.length - 1].winner.url || "/placeholder.svg"}
                  alt={tournamentBracket[tournamentBracket.length - 1].winner.description}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <h3 className="text-xl font-bold mb-2">Champion:</h3>
              <p className="mb-6">{tournamentBracket[tournamentBracket.length - 1].winner.description}</p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => setActiveTab("tiers")} variant="outline" className="flex items-center gap-2">
                  View Tier List <BarChart4 className="h-4 w-4" />
                </Button>
                <Button onClick={startTournament} className="flex items-center gap-2">
                  New Tournament <Trophy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : roundComplete ? (
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Round {tournamentRound} Complete!</h2>
              <p className="mb-6">All matchups for this round have been decided. Ready to move to the next round?</p>
              <Button onClick={handleAdvanceToNextRound} size="lg" className="flex items-center gap-2">
                Next Round <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {getCurrentMatchup() && (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span>Round {tournamentRound}</span>
                      <span>
                        Matchup {currentMatchup + 1} of{" "}
                        {tournamentBracket.filter((m) => m.round === tournamentRound).length}
                      </span>
                    </div>
                    <Progress value={getTournamentProgress()} className="h-2" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-8">
                    <Card className="overflow-hidden">
                      <CardContent className="p-0 relative">
                        <div className="relative aspect-square">
                          <Image
                            src={getCurrentMatchup().player1.url || "/placeholder.svg"}
                            alt={getCurrentMatchup().player1.description}
                            fill
                            className={`object-cover transition-transform ${hasVoted ? "" : "cursor-pointer hover:scale-105"}`}
                            onClick={() => !hasVoted && handleTournamentVote(0)}
                          />
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span>{getCurrentMatchup().player1.aiRating}/10</span>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md">
                          {getCurrentMatchup().player1Votes} votes
                        </div>
                        <div className="absolute bottom-16 left-0 right-0 bg-black/70 text-white p-2 text-center">
                          {getCurrentMatchup().player1.description}
                        </div>
                        <Button
                          className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                          onClick={() => !hasVoted && handleTournamentVote(0)}
                          disabled={hasVoted}
                        >
                          {hasVoted ? "Voted" : "Vote for this"}
                        </Button>
                      </CardContent>
                    </Card>

                    {getCurrentMatchup().player2 ? (
                      <Card className="overflow-hidden">
                        <CardContent className="p-0 relative">
                          <div className="relative aspect-square">
                            <Image
                              src={getCurrentMatchup().player2.url || "/placeholder.svg"}
                              alt={getCurrentMatchup().player2.description}
                              fill
                              className={`object-cover transition-transform ${hasVoted ? "" : "cursor-pointer hover:scale-105"}`}
                              onClick={() => !hasVoted && handleTournamentVote(1)}
                            />
                          </div>
                          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span>{getCurrentMatchup().player2.aiRating}/10</span>
                          </div>
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md">
                            {getCurrentMatchup().player2Votes} votes
                          </div>
                          <div className="absolute bottom-16 left-0 right-0 bg-black/70 text-white p-2 text-center">
                            {getCurrentMatchup().player2.description}
                          </div>
                          <Button
                            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                            onClick={() => !hasVoted && handleTournamentVote(1)}
                            disabled={hasVoted}
                          >
                            {hasVoted ? "Voted" : "Vote for this"}
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-center text-muted-foreground">Bye round (automatically advances)</p>
                      </div>
                    )}
                  </div>

                  {hasVoted && (
                    <div className="text-center mb-8">
                      <p className="text-muted-foreground mb-2">
                        You've already voted in this matchup. Waiting for {getVotesNeeded()} more votes to advance.
                      </p>
                      <p className="text-sm">Share this tournament with others to get more votes!</p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-8">
                <TournamentBracket bracket={tournamentBracket} currentRound={tournamentRound} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="rankings" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Current Rankings</h2>
            <div className="space-y-4">
              {[...photos]
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 20) // Show top 20
                .map((photo, index) => (
                  <div key={photo.id} className="flex items-center gap-4 p-4 bg-card rounded-lg">
                    <div className="font-bold text-xl">{index + 1}</div>
                    <div className="relative w-16 h-16 rounded-md overflow-hidden">
                      <Image
                        src={photo.url || "/placeholder.svg"}
                        alt={photo.description}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1">{photo.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {photo.aiRating}/10
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          User votes: {photo.userVotes}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>{photo.wins}</span>
                    </div>
                  </div>
                ))}
            </div>
            <Button onClick={() => setActiveTab("voting")} className="mt-6 w-full">
              Back to Voting
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          <TierList photos={photos} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <UserVoteHistory votes={userVotes} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

