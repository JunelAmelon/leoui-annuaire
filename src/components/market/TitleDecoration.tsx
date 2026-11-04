import React from 'react';

interface TitleDecorationProps {
  // Surligne uniquement le mot clé sous lequel le composant est inséré
  className?: string;
  sparkles?: boolean;
}

export default function TitleDecoration({ sparkles = true }: TitleDecorationProps) {
  return (
    <>
      {/* Surligneur courbé court sous le mot ciblé (ex: "mariage")
          Même couleur que l'éclat (#F43F5E / #FB7185) */}
      <svg
        className="absolute -bottom-2 sm:-bottom-2.5 left-0 w-full h-3 sm:h-3.5 text-[#FB7185] overflow-visible pointer-events-none select-none"
        viewBox="0 0 160 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M3 10C45 4 115 4 157 9"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>

      {/* Les 3 éclats / tirets en haut à droite du mot */}
      {sparkles && (
        <svg
          className="absolute -top-3.5 sm:-top-5 -right-6 sm:-right-8 w-6 h-6 sm:w-8 sm:h-8 text-[#FB7185] pointer-events-none select-none"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rayon 1 (central / haut) */}
          <path
            d="M10 26L22 10"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Rayon 2 (droite) */}
          <path
            d="M16 28L30 18"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Rayon 3 (haut-gauche) */}
          <path
            d="M8 20L18 6"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </>
  );
}
