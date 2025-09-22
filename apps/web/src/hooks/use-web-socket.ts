"use client";
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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get authentication token from your Vercel API route
  const getAuthToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth-token', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth token: ${response.status}`);
      }

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      // Get fresh auth token before connecting
      const token = await getAuthToken();
      if (!token) {
        console.error('Unable to get authentication token');
        return;
      }

      // Create WebSocket connection with authentication token in query parameter
      const authenticatedWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
      const newSocket = new WebSocket(authenticatedWsUrl);

      newSocket.onopen = () => {
        console.log("Authenticated WebSocket connection established");
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

        // Check if it's an authentication error
        if (event.code === 1002 || event.code === 1008) {
          console.log("Authentication error, will get new token on reconnect...");
        }

        if (reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`Attempting to reconnect... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
          reconnectAttempts.current++;
        } else {
          console.error("Max reconnect attempts reached. Please refresh the page.");
        }
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [wsUrl, getAuthToken]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socket) {
        socket.close();
      }
    };
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