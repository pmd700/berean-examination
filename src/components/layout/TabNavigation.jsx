import React from 'react';
import { BookOpen, Tags, BarChart3 } from 'lucide-react';

export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'editor', label: 'Commentary', icon: BookOpen },
    { id: 'keywords', label: 'Keywords', icon: Tags },
    { id: 'progress', label: 'Progress', icon: BarChart3 }
  ];

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all
              border-b-2 -mb-px
              ${isActive 
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}