"use client"

import { useEffect } from "react"
import { 
  getTournamentState, 
  initializeTournament,
  checkTournamentExpiration
} from "@/app/actions/tournament-actions"
import { shouldStartTournament, isTimeForNewTournament } from "@/lib/scheduler"
import { getPhotos } from "@/lib/photos" // Assuming you have a function to get photos

export function TournamentScheduler() {
  useEffect(() => {
    let lastCheck = Date.now()
    
    const checkTournament = async () => {
      // Check if current tournament has expired
      const expired = await checkTournamentExpiration()
      
      // Check if it's time for a new tournament
      if (isTimeForNewTournament(lastCheck) || expired) {
        const shouldStart = await shouldStartTournament()
        
        if (shouldStart) {
          // Get photos for the tournament
          const photos = await getPhotos()
          
          // Initialize a new tournament
          await initializeTournament(photos)
          
          // Update last check time
          lastCheck = Date.now()
        }
      }
    }
    
    // Initial check
    checkTournament()
    
    // Set up interval to check regularly
    const intervalId = setInterval(checkTournament, 60000) // Check every minute
    
    return () => clearInterval(intervalId)
  }, [])
  
  return null // This component doesn't render anything
} 