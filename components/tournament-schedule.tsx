"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar } from "lucide-react"
import { TOURNAMENT_INTERVAL_MS, TOURNAMENT_DURATION_MS } from "@/lib/scheduler"

interface TournamentScheduleProps {
  tournamentStartTime?: string
  isActive?: boolean
}

export function TournamentSchedule({ tournamentStartTime, isActive = false }: TournamentScheduleProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [nextTournament, setNextTournament] = useState<Date | null>(null)
  
  useEffect(() => {
    // Calculate time remaining in current tournament or time until next tournament
    const calculateTiming = () => {
      const now = new Date()
      
      if (isActive && tournamentStartTime) {
        // Tournament is active, calculate remaining time
        const startTime = new Date(tournamentStartTime).getTime()
        const endTime = startTime + TOURNAMENT_DURATION_MS
        const remaining = Math.max(0, endTime - now.getTime())
        setTimeRemaining(remaining)
        
        // Calculate next tournament time
        const nextStart = new Date(endTime + TOURNAMENT_INTERVAL_MS)
        setNextTournament(nextStart)
      } else {
        // No active tournament, calculate time to next tournament
        // Find the next 15-minute interval
        const minutes = now.getMinutes()
        const nextInterval = Math.ceil(minutes / 15) * 15
        const nextTournamentTime = new Date(now)
        
        nextTournamentTime.setMinutes(nextInterval)
        nextTournamentTime.setSeconds(0)
        nextTournamentTime.setMilliseconds(0)
        
        if (nextTournamentTime <= now) {
          nextTournamentTime.setTime(nextTournamentTime.getTime() + 15 * 60 * 1000)
        }
        
        setNextTournament(nextTournamentTime)
        setTimeRemaining(nextTournamentTime.getTime() - now.getTime())
      }
    }
    
    // Initial calculation
    calculateTiming()
    
    // Update every second
    const intervalId = setInterval(calculateTiming, 1000)
    return () => clearInterval(intervalId)
  }, [tournamentStartTime, isActive])
  
  // Format time remaining as mm:ss
  const formatTimeRemaining = () => {
    const totalSeconds = Math.floor(timeRemaining / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (isActive && tournamentStartTime) {
      const startTime = new Date(tournamentStartTime).getTime()
      const elapsed = Date.now() - startTime
      return Math.min(100, (elapsed / TOURNAMENT_DURATION_MS) * 100)
    }
    
    // If no active tournament, show progress toward next tournament
    if (nextTournament) {
      const totalWaitTime = TOURNAMENT_INTERVAL_MS
      const elapsed = TOURNAMENT_INTERVAL_MS - timeRemaining
      return Math.min(100, (elapsed / totalWaitTime) * 100)
    }
    
    return 0
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Tournament Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {isActive ? (
                <span>Tournament ends in:</span>
              ) : (
                <span>Next tournament starts in:</span>
              )}
            </div>
            <Badge variant={isActive ? "default" : "outline"}>
              {formatTimeRemaining()}
            </Badge>
          </div>
          
          <Progress value={getProgressPercentage()} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tournament Duration</p>
              <p className="font-medium">30 minutes</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tournament Frequency</p>
              <p className="font-medium">Every 15 minutes</p>
            </div>
            {nextTournament && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Next Tournament</p>
                <p className="font-medium">
                  {nextTournament.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' on '}
                  {nextTournament.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 