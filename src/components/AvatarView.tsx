import React from 'react';
import { UserAvatar, Role } from '../types';

interface AvatarViewProps {
  avatar: UserAvatar;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRoleBadge?: boolean;
  role?: Role;
  isWalking?: boolean;
  walkPhase?: number; // Continuous walk cycle angle in radians (0 to 2*PI)
  facingLeft?: boolean;
  isSitting?: boolean;
  speechText?: string;
  className?: string;
}

export const AvatarView: React.FC<AvatarViewProps> = ({
  avatar,
  size = 'md',
  showRoleBadge = false,
  role = 'siswa',
  isWalking = false,
  walkPhase = 0,
  facingLeft = false,
  isSitting = false,
  speechText,
  className = '',
}) => {
  const { skinColor, hairStyle, hairColor, shirtColor, accessory } = avatar;

  const dimensions = {
    sm: { width: 22, height: 32 },
    md: { width: 28, height: 40 },
    lg: { width: 40, height: 56 },
    xl: { width: 56, height: 78 },
  };

  const dim = dimensions[size];

  // 
  // NATURAL HUMANOID GAIT TRIGONOMETRY:
  // Continuous sine/cosine waves for organic, fluid leg and arm swings
  // 
  const phase = isWalking ? walkPhase : 0;

  // Leg swing angles (degrees)
  const leftLegAngle = isWalking ? Math.sin(phase) * 26 : 0;
  const rightLegAngle = isWalking ? -Math.sin(phase) * 26 : 0;

  // Knee bend during lift phase (natural human step)
  const leftKneeY = isWalking ? Math.max(0, -Math.sin(phase)) * 2 : 0;
  const rightKneeY = isWalking ? Math.max(0, Math.sin(phase)) * 2 : 0;

  // Arm swings in opposition to legs
  const leftArmAngle = isWalking ? -Math.sin(phase) * 28 : 0;
  const rightArmAngle = isWalking ? Math.sin(phase) * 28 : 0;

  // Vertical body bobbing: drops slightly on step plant, rises at midpoint
  const bodyBobY = isWalking ? -Math.abs(Math.sin(phase)) * 3 : 0;

  // Slight torso forward tilt while walking
  const bodyLeanAngle = isWalking ? 3.5 : 0;

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Speech Bubble */}
      {speechText && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
          <div className="relative px-2.5 py-1 rounded-full bg-white text-slate-800 text-[10px] font-bold shadow-md border border-slate-200/80 whitespace-nowrap">
            <span>{speechText}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-200/80" />
          </div>
        </div>
      )}

      {/* Ground Footprint Shadow (subtly pulses with stride) */}
      <div
        className="w-7 h-2 rounded-full bg-black/25 mx-auto -mb-1 mt-0.5"
        style={{
          transform: `scale(${isWalking ? 0.9 + Math.abs(Math.sin(phase)) * 0.2 : 1})`,
        }}
      />

      {/* Main Avatar Body Container */}
      <div
        className="origin-bottom"
        style={{
          transform: `scaleX(${facingLeft ? -1 : 1}) translateY(${isSitting ? 4 : bodyBobY}px) rotate(${isWalking ? bodyLeanAngle : 0}deg)`,
        }}
      >
        <svg
          width={dim.width}
          height={dim.height}
          viewBox="0 0 42 60"
          className="overflow-visible drop-shadow-sm"
          aria-hidden="true"
        >
          {isSitting ? (
            /* SITTING LEGS (Bent forward at knee, resting comfortably) */
            <g>
              {/* Thighs bent forward */}
              <rect x="14" y="40" width="11" height="5.5" rx="2.5" fill="#334155" />
              <rect x="22" y="42" width="11" height="5.5" rx="2.5" fill="#1e293b" />
              {/* Lower calves downward */}
              <rect x="21" y="43" width="5" height="9" rx="2" fill="#334155" />
              <rect x="29" y="45" width="5" height="9" rx="2" fill="#1e293b" />
              {/* Shoes resting on ground */}
              <rect x="20.5" y="50" width="7" height="4" rx="2" fill="#1e293b" />
              <rect x="28.5" y="52" width="7" height="4" rx="2" fill="#0f172a" />
            </g>
          ) : (
            <>
              {/* LEFT LEG (Animated smoothly) */}
              <g
                style={{
                  transformOrigin: '16px 42px',
                  transform: `rotate(${leftLegAngle}deg) translateY(${-leftKneeY}px)`,
                }}
              >
                {/* Pants/Leg */}
                <rect x="14" y="42" width="5.5" height="12" rx="2.5" fill="#334155" />
                {/* Shoe */}
                <rect x="13" y="52" width="6.5" height="4" rx="2" fill="#1e293b" />
              </g>

              {/* RIGHT LEG (Animated smoothly) */}
              <g
                style={{
                  transformOrigin: '26px 42px',
                  transform: `rotate(${rightLegAngle}deg) translateY(${-rightKneeY}px)`,
                }}
              >
                {/* Pants/Leg */}
                <rect x="23" y="42" width="5.5" height="12" rx="2.5" fill="#1e293b" />
                {/* Shoe */}
                <rect x="22.5" y="52" width="6.5" height="4" rx="2" fill="#0f172a" />
              </g>
            </>
          )}

          {/* LEFT ARM (Opposing leg motion or resting on lap when sitting) */}
          <g
            style={{
              transformOrigin: '12px 28px',
              transform: isSitting ? 'rotate(18deg)' : `rotate(${leftArmAngle}deg)`,
            }}
          >
            <rect x="10" y="28" width="4" height="11" rx="2" fill={shirtColor} />
            <circle cx="12" cy="40" r="2.2" fill={skinColor} />
          </g>

          {/* TORSO / SHIRT */}
          <rect x="13" y="27" width="16" height="16" rx="4" fill={shirtColor} />
          {/* Collar detail */}
          <path d="M18 27 L21 31 L24 27" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.65" />

          {/* RIGHT ARM (Opposing leg motion or resting on lap when sitting) */}
          <g
            style={{
              transformOrigin: '30px 28px',
              transform: isSitting ? 'rotate(-18deg)' : `rotate(${rightArmAngle}deg)`,
            }}
          >
            <rect x="28" y="28" width="4" height="11" rx="2" fill={shirtColor} />
            <circle cx="30" cy="40" r="2.2" fill={skinColor} />
          </g>

          {/* NECK */}
          <rect x="19" y="23" width="4" height="5" rx="1.5" fill={skinColor} />

          {/* HEAD */}
          <circle cx="21" cy="16" r="11" fill={skinColor} />

          {/* EYES */}
          <circle cx="17.5" cy="16" r="1.4" fill="#0f172a" />
          <circle cx="24.5" cy="16" r="1.4" fill="#0f172a" />
          {/* Eye reflections */}
          <circle cx="17.2" cy="15.6" r="0.5" fill="#ffffff" />
          <circle cx="24.2" cy="15.6" r="0.5" fill="#ffffff" />

          {/* BLUSH CHEEKS */}
          <circle cx="15" cy="18" r="1.6" fill="#f43f5e" opacity="0.4" />
          <circle cx="27" cy="18" r="1.6" fill="#f43f5e" opacity="0.4" />

          {/* SWEET SMILE */}
          <path d="M19 19.5 Q21 21.5 23 19.5" stroke="#b45309" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* HAIR / HEADWEAR STYLES */}
          {hairStyle === 'hijab' && (
            <path
              d="M9 16 C9 6, 33 6, 33 16 C33 26, 31 31, 21 32 C11 31, 9 26, 9 16 Z M11.5 15.5 C13 9.5, 29 9.5, 30.5 15.5 C31 22, 28 26, 21 27 C14 26, 11 22, 11.5 15.5 Z"
              fill={hairColor}
            />
          )}

          {hairStyle === 'short' && (
            <path
              d="M10 14 C10 5, 32 5, 32 14 C32 12, 29 7, 21 7 C13 7, 10 12, 10 14 Z"
              fill={hairColor}
            />
          )}

          {hairStyle === 'long' && (
            <g fill={hairColor}>
              <path d="M10 14 C10 5, 32 5, 32 14 C32 23, 30 28, 30 30 C28 28, 31 20, 30 16 C29 10, 13 10, 12 16 C11 20, 14 28, 12 30 C12 28, 10 23, 10 14 Z" />
            </g>
          )}

          {hairStyle === 'curly' && (
            <g fill={hairColor}>
              <circle cx="14" cy="9" r="4.5" />
              <circle cx="21" cy="7" r="5" />
              <circle cx="28" cy="9" r="4.5" />
              <circle cx="11" cy="14" r="3.5" />
              <circle cx="31" cy="14" r="3.5" />
            </g>
          )}

          {hairStyle === 'cap' && (
            <g>
              <path d="M10 13 C10 6, 32 6, 32 13 Z" fill={hairColor} />
              <path d="M7 13 Q21 11 35 13 Q21 15 7 13" fill={hairColor} />
            </g>
          )}

          {/* ACCESSORIES */}
          {accessory === 'glasses' && (
            <g stroke="#0f172a" strokeWidth="1.2" fill="none">
              <circle cx="17.5" cy="16" r="3.2" />
              <circle cx="24.5" cy="16" r="3.2" />
              <line x1="20.7" y1="16" x2="21.3" y2="16" />
            </g>
          )}

          {accessory === 'headphone' && (
            <g>
              <path d="M10 16 C10 6, 32 6, 32 16" stroke="#475569" strokeWidth="2" fill="none" />
              <rect x="8.5" y="14" width="3.5" height="6" rx="1.5" fill="#0284c7" />
              <rect x="30" y="14" width="3.5" height="6" rx="1.5" fill="#0284c7" />
            </g>
          )}

          {accessory === 'badge' && (
            <polygon points="21,32 22.5,35 25.5,35 23,37 24,40 21,38 18,40 19,37 16.5,35 19.5,35" fill="#fbbf24" />
          )}
        </svg>
      </div>

      {showRoleBadge && (
        <span
          className={`text-[8px] font-bold px-1 rounded-sm text-white mt-0.5 ${
            role === 'guru' ? 'bg-amber-600' : 'bg-blue-600'
          }`}
        >
          {role === 'guru' ? 'GURU' : 'SISWA'}
        </span>
      )}
    </div>
  );
};
