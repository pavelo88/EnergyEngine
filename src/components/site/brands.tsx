'use client';

import { brands } from '@/lib/data';
import React, { useState, useEffect, useRef } from 'react';

export default function Brands() {
    const [radius, setRadius] = useState(240);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const rotationY = useRef(-15);
    const lastX = useRef(0);
    const animationFrameId = useRef<number | null>(null);

    // Function to handle the animation loop
    const animate = () => {
        const sphere = containerRef.current;
        if (sphere) {
            // Only auto-rotate when not being dragged
            if (!isDragging.current) {
                rotationY.current += 0.05;
            }
            sphere.style.transform = `rotateX(-15deg) rotateY(${rotationY.current}deg)`;
        }
        animationFrameId.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) setRadius(150);
            else if (width < 1024) setRadius(200);
            else setRadius(240);
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDragging.current = true;
            lastX.current = e.clientX;
            // Optional: Add a class to the body to change cursor
            document.body.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const deltaX = e.clientX - lastX.current;
            rotationY.current += deltaX * 0.2;
            lastX.current = e.clientX;
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
        };

        // Initial setup
        handleResize();
        // Start animation
        animate();

        // Event listeners
        window.addEventListener('resize', handleResize);
        const sphere = containerRef.current;
        if (sphere) {
            sphere.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        // Cleanup
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            window.removeEventListener('resize', handleResize);
            if (sphere) {
                sphere.removeEventListener('mousedown', handleMouseDown);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, []); // Empty dependency array ensures this runs only once

    return (
        <div className="relative flex items-center justify-center h-96 [perspective:1200px]">
            <div
                ref={containerRef}
                className="absolute h-full w-full cursor-grab active:cursor-grabbing"
                style={{
                    transformStyle: "preserve-3d",
                }}
            >
                {brands.map((brand, index) => {
                    const angle = (360 / brands.length) * index;
                    return (
                        <div
                            key={brand}
                            className="absolute left-1/2 top-1/2 flex w-32 h-16 items-center justify-center rounded-lg border bg-card/50 p-2 text-center backdrop-blur-sm"
                            style={{
                                transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px)`,
                            }}
                        >
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                {brand}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
