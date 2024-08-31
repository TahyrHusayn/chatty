import { useState, useEffect, useRef, useCallback } from "react";
import throttle from "lodash/throttle";

type Message = { text: string; isSent: boolean; id?: number };

export function useWebSocket(wsUrl: string) {
  const [inputValue, setInputValue] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 11; // To cover slightly over 50 seconds
  const reconnectInterval = 5000; // 5 seconds
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log("Connection established");
      setSocket(newSocket);
      reconnectAttempts.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
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
      setSocket(null);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        console.log(`Attempting to reconnect... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        reconnectAttempts.current++;
      } else {
        console.error("Max reconnect attempts reached. Please refresh the page.");
      }
    };

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

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