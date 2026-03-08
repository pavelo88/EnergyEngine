'use client';

import { brands } from '@/lib/data';
import React, { useState, useEffect, useRef } from 'react';

export default function Brands() {
    const [radius, setRadius] = useState(240);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const rotationY = useRef(-15); // Initial rotation
    const velocityY = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(Date.now());

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setRadius(150);
            } else if (width < 1024) {
                setRadius(200);
            } else {
                setRadius(240);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        const sphere = containerRef.current;
        if (!sphere) return;

        const animate = () => {
            if (!isDragging.current) {
                rotationY.current += 0.05; // Slow auto-rotation
            }
            sphere.style.transform = `rotateX(-15deg) rotateY(${rotationY.current}deg)`;
            requestAnimationFrame(animate);
        };
        const animFrame = requestAnimationFrame(animate);

        const handleMouseDown = (e: MouseEvent) => {
            isDragging.current = true;
            startX.current = e.clientX;
            velocityY.current = 0;
            sphere.style.transition = 'none';
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const x = e.clientX;
            const deltaX = x - lastX.current;
            const time = Date.now();
            const deltaTime = time - lastTime.current;
            
            rotationY.current += deltaX * 0.2;
            
            if (deltaTime > 0) {
              velocityY.current = deltaX / deltaTime;
            }
            
            lastX.current = x;
            lastTime.current = time;
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };
        
        lastX.current = window.innerWidth / 2;


        sphere.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);


        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animFrame);
            sphere.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className="relative flex items-center justify-center h-96 [perspective:1200px]">
            <div
                ref={containerRef}
                className="absolute h-full w-full"
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
