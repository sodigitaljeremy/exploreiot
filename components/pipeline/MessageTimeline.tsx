"use client"

import Card from "@/components/atoms/Card"
import { usePipeline } from "@/lib/pipeline-context"
import MessageTimelineItem from "./MessageTimelineItem"

export default function MessageTimeline() {
  const { messages, selectedMessage, selectMessage } = usePipeline()

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Messages recents
      </h3>
      {messages.length === 0 ? (
        <p className="text-xs text-gray-600 italic">
          Aucun message — generez une mesure ou attendez un message temps reel.
        </p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {[...messages].reverse().map(msg => (
            <MessageTimelineItem
              key={msg.id}
              message={msg}
              selected={selectedMessage?.id === msg.id}
              onClick={() => selectMessage(
                selectedMessage?.id === msg.id ? null : msg
              )}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
