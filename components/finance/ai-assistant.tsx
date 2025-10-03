'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  MicrophoneIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIAssistantProps {
  userId?: string;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
}

export default function AIAssistant({ userId, className = '' }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI financial assistant. I can help you:\n\n• Analyze spending patterns\n• Generate financial insights\n• Help categorize transactions\n• Provide budget recommendations\n• Answer financial questions\n\nHow can I help you today?',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      label: 'Analyze spending',
      prompt: 'Can you analyze my spending patterns for this month and tell me where my money is going?',
      icon: <ChartBarIcon className="h-4 w-4" />,
    },
    {
      id: '2',
      label: 'Budget tips',
      prompt: 'Give me some tips for creating a better budget for my small business.',
      icon: <CurrencyDollarIcon className="h-4 w-4" />,
    },
    {
      id: '3',
      label: 'Tax deductions',
      prompt: 'What are some common tax deductions I should be tracking for my business?',
      icon: <DocumentTextIcon className="h-4 w-4" />,
    },
    {
      id: '4',
      label: 'Cash flow',
      prompt: 'How can I improve my business cash flow?',
      icon: <BanknotesIcon className="h-4 w-4" />,
    },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          conversationHistory: messages.slice(1).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove typing indicator
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

        // Add AI response
        const assistantMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('AI chat error:', error);

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInputMessage(action.prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = () => {
    // Speech recognition implementation would go here
    setIsRecording(true);
    console.log('Starting voice recording...');

    // Simulate recording for demo
    setTimeout(() => {
      stopRecording();
      setInputMessage('Can you help me categorize my recent business expenses?');
    }, 2000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log('Stopping voice recording...');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 ${className}`}
        aria-label="Open AI Assistant"
      >
        <SparklesIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5" />
          <h3 className="font-semibold">AI Financial Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/20 rounded-md transition-colors"
          aria-label="Close assistant"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              {action.icon}
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.isTyping ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your finances..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        {isRecording && (
          <div className="mt-2 text-sm text-red-600 text-center">
            Recording... Release to stop
          </div>
        )}
      </div>
    </div>
  );
}

// Import missing icons
import { ChartBarIcon, CurrencyDollarIcon, DocumentTextIcon, BanknotesIcon } from '@heroicons/react/24/outline';