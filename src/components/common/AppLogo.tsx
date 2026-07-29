interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  onClick?: () => void;
}

export default function AppLogo({ size = 'md', showText = true, onClick }: AppLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      title={onClick ? 'Clique para abrir a Tela de Apresentação (Splash Screen)' : 'AniApp'}
    >
      {/* Ícone quadrado amarelo da marca */}
      <div
        className="relative bg-[#f5c518] border-2 border-black rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.8)] flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ width: iconSize, height: iconSize }}
      >
        <div className="w-[72%] h-[72%] bg-white border border-black flex items-center justify-center shadow-inner">
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
            <circle cx="50" cy="24" r="9" fill="#000" />
            <path
              d="M 50 33 L 50 60 L 32 78 M 50 60 L 66 80 M 50 42 L 30 55 M 50 42 L 72 46"
              stroke="#000"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* Texto do Logotipo */}
      {showText && (
        <span
          className={`font-black tracking-tight text-text font-sans ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-2xl' : 'text-base'
          }`}
        >
          AniApp
        </span>
      )}
    </div>
  );
}
