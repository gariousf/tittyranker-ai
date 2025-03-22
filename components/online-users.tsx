import type React from "react"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface OnlineUsersProps {
  count: number
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ count }) => {
  return (
    <Badge variant="outline" className="flex items-center gap-2 py-1.5 px-3">
      <Users className="h-4 w-4" />
      <span>
        {count} online user{count !== 1 ? "s" : ""}
      </span>
    </Badge>
  )
}

export default OnlineUsers

