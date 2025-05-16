import ScreenWrapper from '../components/ScreenWrapper';

export default function SecondScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-minimal-radial px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <p className="text-white text-lg font-medium">
          The BRUTE App is here to take your gains to the next level.
        </p>
        <button
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-b from-[#BBFFE7] to-[#86FFCA] rounded-md shadow-md font-semibold text-gray-800 hover:brightness-110 transition"
        >
          <span>Next</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
