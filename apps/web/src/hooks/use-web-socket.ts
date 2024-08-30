"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import throttle from "lodash/throttle"; // Assuming you're using lodash for throttling

type Message = { text: string; isSent: boolean; id?: number };

export function useWebSocket(wsUrl: string) {
  const [inputValue, setInputValue] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentSecondRequest = useRef(false);

  // Establish WebSocket connection and handle events
  useEffect(() => {
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log("Connection established");
      setSocket(newSocket);

      // Schedule a second request to be sent after 50 seconds
      setTimeout(() => {
        if (newSocket.readyState === WebSocket.OPEN && !hasSentSecondRequest.current) {
          console.log("Second request sent after 50 seconds");
          hasSentSecondRequest.current = true; // Set flag to true to prevent further requests
        }
      }, 50000); // 50 seconds
    };

    newSocket.onmessage = (message: MessageEvent) => {
      console.log("Message Received:", message.data);
      setMessages((prev) => [...prev, { text: message.data, isSent: false }]);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket Error: ", error);
    };

    newSocket.onclose = (event) => {
      console.error("WebSocket Closed:", event);
    };

    return () => {
      newSocket.close();
    };
  }, [wsUrl]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle button click with throttling
  const handleButtonClick = useCallback(
    throttle(() => {
      if (socket?.readyState === WebSocket.OPEN && inputValue.trim()) {
        const messageId = Date.now();

        socket.send(inputValue);
        setMessages((prev) => [
          ...prev,
          { text: inputValue, isSent: true, id: messageId },
        ]);
        setInputValue("");
      } else {
        console.error(
          "WebSocket is not open or input is empty. Cannot send message."
        );
      }
    }, 300),
    [socket, inputValue]
  );

  // Handle key press for Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleButtonClick();
    }
  };

  return {
    socket,
    inputValue,
    handleInputChange,
    handleButtonClick,
    handleKeyPress,
    messages,
    messagesEndRef,
  };
}
