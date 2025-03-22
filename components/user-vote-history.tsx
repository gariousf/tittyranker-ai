import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"

interface UserVoteHistoryProps {
  votes: any[]
}

const UserVoteHistory: React.FC<UserVoteHistoryProps> = ({ votes }) => {
  if (!votes || votes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">Your Voting History</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You haven't cast any votes yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Your Voting History</h2>
      <Card>
        <CardHeader>
          <CardTitle>Recent Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {votes.map((vote, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{vote.votedForDescription || vote.photoDescription}</p>
                  <p className="text-sm text-muted-foreground">
                    {vote.round ? `Tournament Round ${vote.round}, Match ${vote.match}` : "Casual voting"}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(vote.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserVoteHistory

