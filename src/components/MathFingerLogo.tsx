import React from 'react';

interface MathFingerLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
}

export function MathFingerLogo({ 
  size = 48, 
  showText = true, 
  textSize = 'md',
  theme = 'dark'
}: MathFingerLogoProps) {
  const isLight = theme === 'light';

  // Math Finger colorful letters matching the poster
  // Math: M (pink/coral), a (gold), t (sky-blue), h (emerald-green)
  // Finger: F (green), i (blue), n (violet), g (green), e (orange), r (purple)
  const mathLetters = [
    { char: 'M', color: 'text-rose-500' },
    { char: 'a', color: 'text-amber-500' },
    { char: 't', color: 'text-sky-400' },
    { char: 'h', color: 'text-emerald-500' },
  ];

  const fingerLetters = [
    { char: 'F', color: 'text-emerald-500' },
    { char: 'i', color: 'text-sky-400' },
    { char: 'n', color: 'text-indigo-400' },
    { char: 'g', color: 'text-teal-400' },
    { char: 'e', color: 'text-amber-500' },
    { char: 'r', color: 'text-purple-500' },
  ];

  const textClasses = {
    sm: 'text-sm font-bold',
    md: 'text-lg font-extrabold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl sm:text-4xl font-black'
  };

  return (
    <div className="flex items-center gap-3">
      {/* Playful smiling hand SVG */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 260 260" 
        className="transform transition-transform hover:scale-110 duration-200 cursor-pointer"
        style={{ minWidth: size }}
      >
        {/* Soft yellow circle background */}
        <circle cx="130" cy="130" r="120" fill="#faf7e9" stroke="#81c784" strokeWidth="3" strokeDasharray="6 6" />

        {/* Plus signs / Stars decor */}
        <path d="M40 50 L43 58 L52 58 L45 63 L47 72 L40 67 L33 72 L35 63 L28 58 L37 58 Z" fill="#ffca28" />
        <path d="M210 200 L213 208 L222 208 L215 213 L217 222 L210 217 L203 222 L205 213 L198 208 L207 208 Z" fill="#ffa726" />
        
        {/* Blue plus symbol */}
        <g stroke="#29b6f6" strokeWidth="3" strokeLinecap="round">
          <line x1="210" y1="60" x2="210" y2="72" />
          <line x1="204" y1="66" x2="216" y2="66" />
        </g>
        
        {/* Pink heart */}
        <path d="M50 200 C50 195, 57 195, 57 200 C57 205, 50 210, 50 210 C50 210, 43 205, 43 200 C43 195, 50 195, 50 200 Z" fill="#ec4899" />

        {/* The Hand */}
        <g transform="translate(10, 5)">
          {/* Wrist */}
          <path d="M110 195 L140 195 L143 230 L107 230 Z" fill="#a5d6a7" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          
          {/* Palm base */}
          <path d="M70 145 C55 125, 70 100, 100 100 C125 100, 160 110, 180 140 C195 165, 185 200, 155 210 C125 220, 85 210, 70 145 Z" fill="#a5d6a7" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          
          {/* Thumb (Finger 1) - Yellow */}
          <path d="M72 140 C57 140, 38 125, 30 105 C22 85, 38 78, 50 90 L74 118 Z" fill="#ffca28" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          {/* Index Finger (Finger 2) - Blue */}
          <path d="M90 100 L90 40 C90 28, 106 28, 106 40 L106 100 Z" fill="#29b6f6" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          {/* Middle Finger (Finger 3) - Red */}
          <path d="M117 96 L117 25 C117 13, 133 13, 133 25 L133 96 Z" fill="#ef5350" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          {/* Ring Finger (Finger 4) - Purple */}
          <path d="M144 100 L144 35 C144 23, 160 23, 160 35 L160 100 Z" fill="#ab47bc" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />
          {/* Pinky Finger (Finger 5) - Orange */}
          <path d="M171 118 L186 62 C189 50, 204 56, 201 68 L181 130 Z" fill="#ffa726" stroke="#2e7d32" strokeWidth="4" strokeLinejoin="round" />

          {/* Labels 1, 2, 3, 4, 5 on Fingers */}
          <text x="42" y="100" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="12" fill="#5d4037" textAnchor="middle">1</text>
          <text x="98" y="50" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" fill="#ffffff" textAnchor="middle">2</text>
          <text x="125" y="35" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" fill="#ffffff" textAnchor="middle">3</text>
          <text x="152" y="47" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" fill="#ffffff" textAnchor="middle">4</text>
          <text x="190" y="78" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" fill="#ffffff" textAnchor="middle">5</text>

          {/* Smiley Face on Palm */}
          {/* Eyes */}
          <path d="M100 142 Q108 134 116 142" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
          <path d="M136 142 Q144 134 152 142" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
          {/* Blushing Cheeks */}
          <circle cx="94" cy="152" r="5" fill="#ff8a80" opacity="0.8" />
          <circle cx="158" cy="152" r="5" fill="#ff8a80" opacity="0.8" />
          {/* Happy Smile Mouth */}
          <path d="M110 156 Q126 174 142 156" fill="none" stroke="#2e7d32" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>

      {/* Playful letter text brand */}
      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center tracking-wide">
            {/* Render "Math" in styled kids lettering */}
            <span className={`${textClasses[textSize]} flex mr-1.5`}>
              {mathLetters.map((l, idx) => (
                <span key={`m-${idx}`} className={`${l.color} inline-block transform hover:scale-125 transition-transform duration-100 hover:-rotate-6`}>
                  {l.char}
                </span>
              ))}
            </span>
            {/* Render "Finger" in styled kids lettering */}
            <span className={`${textClasses[textSize]} flex`}>
              {fingerLetters.map((l, idx) => (
                <span key={`f-${idx}`} className={`${l.color} inline-block transform hover:scale-125 transition-transform duration-100 hover:rotate-6`}>
                  {l.char}
                </span>
              ))}
            </span>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold block leading-none mt-1 tracking-tight">
            Berhitung cepat tanpa alat hanya sekejap
          </span>
        </div>
      )}
    </div>
  );
}
