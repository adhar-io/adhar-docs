
import React from 'react';
import { Team } from './types';

interface TeamsSectionProps {
  teams: Team[];
}

const TeamsSection = ({ teams }: TeamsSectionProps) => {
  return (
    <div className="relative mb-16">
      {/* Section header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-purple-500"></div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Development Teams</h3>
          <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-purple-500"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Cross-functional teams driving innovation and excellence</p>
      </div>

      {/* Teams grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {teams.map((team, index) => {
          const TeamIcon = team.icon;
          return (
            <div 
              key={team.id}
              className="group text-center transition-all duration-500 hover:scale-110 animate-fadeInUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon container */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-3xl shadow-lg flex items-center justify-center mb-4 border-2 border-gray-100 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-500 mx-auto group-hover:shadow-2xl">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Icon */}
                <TeamIcon className={`w-10 h-10 ${team.color} relative z-10 group-hover:scale-110 transition-transform duration-300`} />
                
                {/* Corner accent */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              
              {/* Team name */}
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {team.name}
              </p>
              
              {/* Underline effect */}
              <div className="w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-2 group-hover:w-full transition-all duration-500"></div>
            </div>
          );
        })}
      </div>
      
      {/* Background decorative grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-6 gap-6 h-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-l border-gray-300 dark:border-gray-600"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamsSection;
