
import React from 'react';
import Spinner from './Spinner';
import ErrorAlert from './ErrorAlert';
import { ProcessState } from '../types';
import SparklesIcon from './icons/SparklesIcon';

interface RestoredImageViewProps {
  state: ProcessState;
  imageUrl: string | null;
  error: string | null;
}

const RestoredImageView: React.FC<RestoredImageViewProps> = ({ state, imageUrl, error }) => {
  const renderContent = () => {
    switch (state) {
      case ProcessState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Spinner />
            <p className="mt-4 text-gray-300">Applying edit...</p>
            <p className="text-sm text-gray-500">This may take a moment.</p>
          </div>
        );
      case ProcessState.SUCCESS:
        return (
          <>
            <img src={imageUrl!} alt="Restored" className="w-full h-full object-contain rounded-lg" />
            <a
              href={imageUrl!}
              download="edited-photo.png"
              className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-300"
              title="Download the edited image"
            >
              Download
            </a>
          </>
        );
      case ProcessState.ERROR:
        return <ErrorAlert message={error || 'An unexpected error occurred.'} />;
      case ProcessState.IDLE:
      default:
        return (
          <div className="text-center text-gray-500">
            <SparklesIcon className="mx-auto h-16 w-16" />
            <p className="mt-2">Your edited photo will appear here</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-md aspect-square bg-gray-800 rounded-xl shadow-inner border-2 border-gray-700 p-4 flex items-center justify-center relative overflow-hidden">
      {renderContent()}
    </div>
  );
};

export default RestoredImageView;