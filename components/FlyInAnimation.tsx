import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from './Icons';

interface FlyInAnimationProps {
    startPos: { x: number; y: number };
    onComplete: () => void;
    targetSelector?: string;
}

export const FlyInAnimation: React.FC<FlyInAnimationProps> = ({
    startPos,
    onComplete,
    targetSelector = '#history-item-0'
}) => {
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        left: 0, // Position controlled by transform
        top: 0,
        width: '48px',
        height: '48px',
        opacity: 0,
        transform: `translate3d(${startPos.x}px, ${startPos.y}px, 0) scale(0.3)`, // Start position in transform
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fbbf24',
        willChange: 'transform, opacity'
    });

    useEffect(() => {
        // Stage 1: Spawn with glow
        const spawnTimer = setTimeout(() => {
            setStyle(prev => ({
                ...prev,
                opacity: 1,
                transform: `translate3d(${startPos.x}px, ${startPos.y}px, 0) scale(1.2)`,
                transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out'
            }));
        }, 50);

        // Stage 2: Start flying immediately after spawn
        const flyTimer = setTimeout(() => {
            const targetEl = document.querySelector(targetSelector);
            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight - 80;

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                targetX = rect.left + rect.width / 2 - 24;
                targetY = rect.top + rect.height / 2 - 24;
            }

            setStyle(prev => ({
                ...prev,
                // Use transform for movement (GPU accelerated) instead of left/top
                transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.9)`,
                transition: `
                    transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                    opacity 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)
                `,
                opacity: 0.95
            }));
        }, 300); // Start flying 300ms after spawn

        // Stage 3: Collection pulse
        const pulseTimer = setTimeout(() => {
            // We need to maintain the target position in the transform
            const targetEl = document.querySelector(targetSelector);
            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight - 80;

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                targetX = rect.left + rect.width / 2 - 24;
                targetY = rect.top + rect.height / 2 - 24;
            }

            setStyle(prev => ({
                ...prev,
                transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(1.5)`,
                opacity: 1,
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out'
            }));
        }, 1800); // 300 + 1500

        // Stage 4: Final fade
        const fadeTimer = setTimeout(() => {
            const targetEl = document.querySelector(targetSelector);
            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight - 80;

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                targetX = rect.left + rect.width / 2 - 24;
                targetY = rect.top + rect.height / 2 - 24;
            }

            setStyle(prev => ({
                ...prev,
                transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.5)`,
                opacity: 0,
                transition: 'transform 0.2s ease-in, opacity 0.2s ease-in'
            }));
        }, 1950);

        // Stage 5: Cleanup
        const cleanupTimer = setTimeout(() => {
            onComplete();
        }, 2200);

        return () => {
            clearTimeout(spawnTimer);
            clearTimeout(flyTimer);
            clearTimeout(pulseTimer);
            clearTimeout(fadeTimer);
            clearTimeout(cleanupTimer);
        };
    }, [startPos, onComplete, targetSelector]);

    return ReactDOM.createPortal(
        <div style={style}>
            <Icons.Sparkles size={28} />
        </div>,
        document.body
    );
};
