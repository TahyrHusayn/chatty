"use client";

import { Loader } from "./loader";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { useWebSocket } from "@/hooks/use-web-socket";

export function Chat() {
  const {
    socket,
    messages,
    inputValue,
    messagesEndRef,
    handleButtonClick,
    handleKeyPress,
    handleInputChange,
  } = useWebSocket(process.env.NEXT_PUBLIC_WS_URL || "");

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-purple-500 to-indigo-600 p-2 sm:p-4 md:p-6">
      {socket?.readyState !== WebSocket.OPEN ? (
        <Loader />
      ) : (
        <>
          <MessageList messages={messages} messagesEndRef={messagesEndRef} />
          <MessageInput
            inputValue={inputValue}
            handleButtonClick={handleButtonClick}
            handleInputChange={handleInputChange}
            handleKeyPress={handleKeyPress}
          />
        </>
      )}
    </main>
  );
}
