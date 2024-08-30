"use client";

import React from "react";

interface Message {
  text: string;
  isSent: boolean;
}

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-grow overflow-y-auto mb-4 bg-white bg-opacity-10 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] ${
              m.isSent
                ? "ml-auto bg-indigo-100 text-indigo-800"
                : "mr-auto bg-white text-gray-800"
            } rounded-lg p-3 shadow break-words`}
          >
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
