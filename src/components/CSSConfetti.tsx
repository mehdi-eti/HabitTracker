/** @format */

import { useEffect, useState } from "react";

interface CSSConfettiProps {
	active: boolean;
	onComplete?: () => void;
}

export default function CSSConfetti({ active, onComplete }: CSSConfettiProps) {
	const [particles, setParticles] = useState<{ id: number; left: number; animationDuration: number; color: string; delay: number; size: number }[]>([]);

	useEffect(() => {
		if (active) {
			const colors = ["#4f46e5", "#818cf8", "#c7d2fe", "#f472b6", "#fbbf24", "#34d399"];
			const newParticles = Array.from({ length: 100 }).map((_, i) => ({
				id: i,
				left: Math.random() * 100,
				animationDuration: 1.5 + Math.random() * 2,
				color: colors[Math.floor(Math.random() * colors.length)],
				delay: Math.random() * 0.5,
				size: 5 + Math.random() * 10,
			}));
			setParticles(newParticles);

			const timer = setTimeout(() => {
				setParticles([]);
				if (onComplete) onComplete();
			}, 4000);
			return () => clearTimeout(timer);
		}
	}, [active, onComplete]);

	if (!active && particles.length === 0) return null;

	return (
		<div className='fixed inset-0 pointer-events-none z-[100] overflow-hidden'>
			{particles.map((p) => (
				<div
					key={p.id}
					className='absolute top-[-5vh] rounded-sm opacity-80'
					style={{
						left: `${p.left}%`,
						width: `${p.size}px`,
						height: `${p.size}px`,
						backgroundColor: p.color,
						animation: `confetti-fall ${p.animationDuration}s linear ${p.delay}s forwards`,
					}}
				/>
			))}
			<style>
				{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
            }
            100% {
              transform: translateY(105vh) rotate(720deg);
            }
          }
        `}
			</style>
		</div>
	);
}
