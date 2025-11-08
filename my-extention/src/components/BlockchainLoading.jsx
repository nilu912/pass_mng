export const BlockchainLoading = ({ message = "Processing transaction..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      {/* Blockchain blocks animation */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-indigo-500 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-8 h-8 bg-purple-500 rounded animate-pulse" style={{ animationDelay: '200ms' }}></div>
        <div className="w-8 h-8 bg-pink-500 rounded animate-pulse" style={{ animationDelay: '400ms' }}></div>
      </div>
      
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">{message}</p>
        <p className="text-xs text-gray-500 mt-1 animate-pulse">Waiting for confirmation...</p>
      </div>
      
      {/* Connection lines */}
      <div className="flex gap-1 mt-2">
        <div className="w-16 h-0.5 bg-indigo-300 animate-pulse"></div>
        <div className="w-16 h-0.5 bg-purple-300 animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};