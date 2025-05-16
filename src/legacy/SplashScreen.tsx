import ScreenWrapper from '../components/ScreenWrapper';
import logo from '../assets/logo.png';

export default function SplashScreen() {
  return (
    <ScreenWrapper>
      <img src={logo} alt="BRUTE Logo" className="w-[225px] h-[108px] mb-8" />
      <button className="bg-blue-500 hover:bg-blue-600 transition px-6 py-2 rounded-full text-white font-semibold">
        Get Started
      </button>
    </ScreenWrapper>
  );
}
