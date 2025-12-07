import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

function Flashcard({ front, back, backFormat = 'sentence', code_language, flipped, onFlip }) {
  const renderBack = () => {
    if (backFormat === 'list') {
      // Split the back content into list items
      // Support multiple formats: newlines, semicolons, or pipes
      let items = [];
      if (back.includes('\n')) {
        items = back.split('\n').filter(item => item.trim());
      } else if (back.includes(';')) {
        items = back.split(';').filter(item => item.trim());
      } else if (back.includes('|')) {
        items = back.split('|').filter(item => item.trim());
      } else {
        // Fallback to single item if no separators found
        items = [back];
      }
      
      return (
        <ul className="text-left space-y-2 max-w-full mt-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start pt-1">
              <span className="text-green-600 mr-2 flex-shrink-0">•</span>
              <span className="break-words leading-relaxed">{item.trim()}</span>
            </li>
          ))}
        </ul>
      );
    }
    
    if (backFormat === 'code') {
      // Render code with highlighting and preserved whitespace/indentation
      const codeRef = useRef(null);
      useEffect(() => {
        if (codeRef.current) {
          // Auto-detect language and apply highlighting
          hljs.highlightElement(codeRef.current);
        }
      }, [back]);

      const langClass = code_language ? `language-${code_language}` : '';
      return (
        <pre className="w-full mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-sm md:text-base leading-relaxed">
          <code ref={codeRef} className={`font-mono whitespace-pre ${langClass}`}>{back}</code>
        </pre>
      );
    }
    // Default sentence format
    return <div className="break-words mt-2 leading-relaxed">{back}</div>;
  };

  const containerBase = "w-[320px] md:w-[500px] h-[240px] md:h-[300px] flex items-start justify-center rounded-2xl shadow-xl p-8 text-xl md:text-2xl select-none transition-all duration-500 ease-in-out cursor-pointer overflow-y-auto";
  const containerClass = `${containerBase} ${flipped ? 'bg-green-100 pt-4' : 'bg-white'}`;
  return (
    <div className={containerClass} onClick={onFlip}>
      {flipped ? (
        <div className="w-full pt-3 md:pt-4">
          {renderBack()}
        </div>
      ) : (
        <div className="text-center break-words w-full">{front}</div>
      )}
    </div>
  );
}

export default Flashcard;
