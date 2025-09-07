import React from 'react';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import ArrowUpCircleIcon from './icons/ArrowUpCircleIcon';

interface HistoryItem {
    preview: string;
}

interface HistorySliderProps {
    history: HistoryItem[];
    currentIndex: number;
    onSelectHistory: (index: number) => void;
    onDeleteHistory: (index: number) => void;
}

const HistorySlider: React.FC<HistorySliderProps> = ({ history, currentIndex, onSelectHistory, onDeleteHistory }) => {
    if (history.length <= 1) {
        return null;
    }
    
    return (
        <div className="w-full mt-12">
            <h3 className="text-lg font-bold text-gray-300 mb-4 text-center">Editing History</h3>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {history.map((item, index) => (
                        <div key={index} className="relative flex-shrink-0 group">
                            <button
                                onClick={() => onSelectHistory(index)}
                                className={`w-28 h-28 rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                    currentIndex === index 
                                    ? 'border-4 border-indigo-500 shadow-lg scale-105' 
                                    : 'border-2 border-gray-600 hover:border-indigo-400 opacity-70 hover:opacity-100'
                                }`}
                                aria-label={`Go to history step ${index + 1}`}
                            >
                                <img 
                                    src={item.preview} 
                                    alt={`History step ${index + 1}`} 
                                    className="w-full h-full object-cover"
                                />
                            </button>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSelectHistory(index); }}
                                    title="Use as source"
                                    className="p-2 text-white rounded-full hover:bg-gray-700/80 transition-colors"
                                >
                                    <ArrowUpCircleIcon className="w-6 h-6" />
                                </button>
                                <a
                                    href={item.preview}
                                    download={`history-step-${index + 1}.png`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Download image"
                                    className="p-2 text-white rounded-full hover:bg-gray-700/80 transition-colors"
                                >
                                    <DownloadIcon className="w-6 h-6" />
                                </a>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteHistory(index); }}
                                    title="Delete from history"
                                    className="p-2 text-white rounded-full hover:bg-red-600/80 transition-colors"
                                >
                                    <TrashIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistorySlider;
