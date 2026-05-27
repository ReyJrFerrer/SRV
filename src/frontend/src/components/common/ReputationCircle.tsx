interface ReputationCircleProps {
  score: number;
  onClick?: () => void;
  celebrating?: boolean;
}

export default function ReputationCircle({
  score,
  onClick,
  celebrating = false,
}: ReputationCircleProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "#2563eb"; // blue-600
    if (value >= 60) return "#60a5fa"; // blue-300
    if (value >= 40) return "#facc15"; // yellow-400
    return "#fef08a"; // yellow-200
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45; // 45 is the radius
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rep-circle-wrapper flex flex-col items-center justify-center">
      <div
        className={`cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 ${celebrating ? 'rep-circle-celebrating' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick();
        }}
      >
        <div className="relative flex h-56 w-56 items-center justify-center">
          {/* Outer subtle glow */}
          <div className="absolute inset-0 rounded-full bg-gray-100 opacity-70 blur-xl"></div>

          <svg
            className="absolute h-full w-full drop-shadow-sm"
            viewBox="0 0 100 100"
          >
            <circle
              className="text-gray-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
            <circle
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease",
              }}
            />
          </svg>
          <div className="z-10 flex h-36 w-36 select-none flex-col items-center justify-center rounded-full bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <span className="text-5xl font-black tracking-tighter text-gray-900 transition-colors duration-300">
              {score}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-colors duration-300">
              Trust Score
            </span>
          </div>

          {celebrating && (
            <div className="rep-circle-burst absolute inset-0 pointer-events-none z-20">
              <span className="burst-star s1">★</span>
              <span className="burst-star s2">★</span>
              <span className="burst-star s3">★</span>
              <span className="burst-star s4">★</span>
              <span className="burst-star s5">★</span>
              <span className="burst-star s6">★</span>
              <span className="burst-message">PERFECT!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}