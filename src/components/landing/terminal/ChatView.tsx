
import React from 'react';
import { MessageCircle, Send } from 'lucide-react';

const ChatView = () => {
  const chatMessages = [
    { role: 'assistant', content: 'Hello! I analyzed your deployment and found 3 optimization opportunities. Would you like me to apply them?' },
    { role: 'user', content: 'Yes, please optimize my deployment' },
    { role: 'assistant', content: 'Perfect! I\'ve optimized your auto-scaling configuration. CPU usage reduced by 23% and memory efficiency improved by 18%. Your deployment is now running more efficiently!' }
  ];

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 h-[600px]">
      {/* Browser Header */}
      <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 dark:bg-gray-700 dark:border-gray-600">
        <div className="flex space-x-2 mr-4">
          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
        </div>
        <div className="flex-1 bg-white rounded px-3 py-1 text-gray-600 text-sm border dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
          https://console.adhar.io/assist
        </div>
      </div>
      
      {/* Chat Interface */}
      <div className="bg-gray-50 p-6 h-[540px] flex flex-col dark:bg-gray-800">
        {/* Chat Header */}
        <div className="flex items-center space-x-3 mb-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Adhar Assist</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">AI Assistant Online</span>
            </div>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
          {chatMessages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-white border border-gray-200 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
              }`}>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 dark:bg-gray-700 dark:border-gray-600">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-300"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-300" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce dark:bg-gray-300" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat Input */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm dark:bg-gray-700 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <input 
              type="text" 
              placeholder="Ask Adhar Assist anything..."
              className="flex-1 text-sm bg-transparent border-none outline-none text-gray-600 dark:text-gray-300"
              value="How can I improve my API performance?"
              readOnly
            />
            <button className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
