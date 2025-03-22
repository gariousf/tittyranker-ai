"use client"

import { Button } from "@/components/ui/button"
import { Twitter } from "lucide-react"

interface TwitterShareButtonProps {
  winner: any
  tournamentDate: string
}

export function TwitterShareButton({ winner, tournamentDate }: TwitterShareButtonProps) {
  const formattedDate = new Date(tournamentDate).toLocaleDateString()
  
  const shareText = encodeURIComponent(
    `Check out the winning photo from the tournament on ${formattedDate}! "${winner.description}" #PhotoTournament`
  )
  
  const shareUrl = `https://twitter.com/intent/tweet?text=${shareText}`
  
  return (
    <Button 
      onClick={() => window.open(shareUrl, '_blank')}
      className="flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a94df]"
    >
      <Twitter className="h-4 w-4" />
      Share on Twitter
    </Button>
  )
} 