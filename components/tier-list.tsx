import type React from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

interface Photo {
  id: number
  url: string
  description: string
  aiRating: number
  wins: number
  userVotes: number
  tier?: string
}

interface TierListProps {
  photos: Photo[]
}

const TierList: React.FC<TierListProps> = ({ photos }) => {
  // Assign tiers based on wins and AI ratings if not already assigned
  const tieredPhotos = photos.map((photo) => {
    if (photo.tier) return photo

    const combinedScore = photo.wins * 0.7 + photo.aiRating * 0.3

    let tier
    if (combinedScore >= 9) tier = "S"
    else if (combinedScore >= 7) tier = "A"
    else if (combinedScore >= 5) tier = "B"
    else if (combinedScore >= 3) tier = "C"
    else tier = "D"

    return { ...photo, tier }
  })

  // Group photos by tier
  const tiers = {
    S: tieredPhotos.filter((p) => p.tier === "S"),
    A: tieredPhotos.filter((p) => p.tier === "A"),
    B: tieredPhotos.filter((p) => p.tier === "B"),
    C: tieredPhotos.filter((p) => p.tier === "C"),
    D: tieredPhotos.filter((p) => p.tier === "D"),
  }

  const tierColors = {
    S: "bg-purple-100 dark:bg-purple-900/20 border-purple-500",
    A: "bg-blue-100 dark:bg-blue-900/20 border-blue-500",
    B: "bg-green-100 dark:bg-green-900/20 border-green-500",
    C: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500",
    D: "bg-red-100 dark:bg-red-900/20 border-red-500",
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Photo Tier List</h2>

      {Object.entries(tiers).map(([tier, photos]) => (
        <div key={tier} className="mb-8">
          <div
            className={`flex items-center gap-4 mb-4 p-3 rounded-lg border-l-4 ${tierColors[tier as keyof typeof tierColors]}`}
          >
            <div className="text-3xl font-bold">{tier}</div>
            <div className="text-sm text-muted-foreground">
              {tier === "S"
                ? "Perfect - The absolute best photos"
                : tier === "A"
                  ? "Excellent - Outstanding quality and composition"
                  : tier === "B"
                    ? "Good - Solid photos with minor flaws"
                    : tier === "C"
                      ? "Average - Decent but unremarkable"
                      : "Below Average - Significant issues"}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <CardContent className="p-0 relative">
                  <div className="relative aspect-square">
                    <Image
                      src={photo.url || "/placeholder.svg"}
                      alt={photo.description}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                    <div className="line-clamp-2">{photo.description}</div>
                    <div className="flex justify-between items-center mt-1 text-xs">
                      <span>AI: {photo.aiRating}/10</span>
                      <span>Wins: {photo.wins}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TierList

