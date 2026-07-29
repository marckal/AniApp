import { X } from 'lucide-react';
import splashImg from './AniApp-Splash Screen.png';

interface SplashScreenProps {
  onClose: () => void;
}

export default function SplashScreen({ onClose }: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 select-none cursor-pointer backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-[#f5c518] border-4 border-black rounded-lg w-[640px] max-w-[95vw] shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden cursor-pointer"
        onClick={onClose}
      >
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-md bg-black/15 hover:bg-black/30 flex items-center justify-center text-black font-bold transition-colors z-30 cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Arte da Splash Screen usando PNG */}
        <div className="relative w-full bg-[#f5c518] flex flex-col items-center justify-center overflow-hidden">
          <img src={splashImg} alt="AniApp 1.0 splash screen" className="w-full h-auto object-contain block" />
        </div>
      </div>
    </div>
  );
}
