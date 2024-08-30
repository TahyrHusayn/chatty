"use client";

import React from "react";
import { Send } from "lucide-react";
import { DebouncedFuncLeading } from "lodash";

interface MessageInputProps {
  inputValue: string;
  handleButtonClick: DebouncedFuncLeading<() => void>;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MessageInput({
  inputValue,
  handleButtonClick,
  handleInputChange,
  handleKeyPress,
}: MessageInputProps) {
  return (
    <div className="flex items-center space-x-2 bg-white bg-opacity-10 p-2 rounded-2xl backdrop-blur-sm">
      <input
        type="text"
        className="flex-grow p-3 rounded-xl bg-white bg-opacity-50 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder="Type a message..."
      />
      <button
        className="p-3 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        onClick={handleButtonClick}
      >
        <Send size={24} />
      </button>
    </div>
  );
}
