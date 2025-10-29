import React from "react";
import Image from "next/image";

type PumpkinPosition = {
  top: string;
  rotate: string;
  opacity: string;
  size: number;
  left?: string;
  right?: string;
};

export default function HalloweenTheme() {
  const generateRandomPositions = (
    count: number = 20
  ): Array<PumpkinPosition> => {
    const positions: PumpkinPosition[] = [];
    let currentTop = -20;

    for (let i = 0; i < count; i++) {
      currentTop += Math.floor(Math.random() * 61) + 20; // 40-100px increment
      const isLeft = i % 2 === 0;

      positions.push({
        ...(isLeft
          ? { left: `${Math.floor(Math.random() * 51)}px` }
          : { right: `${Math.floor(Math.random() * 51)}px` }),
        top: `${currentTop}px`,
        rotate: `rotate-[${Math.floor(Math.random() * 361)}deg]`,
        opacity: `opacity-${Math.floor(Math.random() * 61) + 20}`, // 20-80
        size: Math.floor(Math.random() * 40) + 30, // 30-70px size
      });
    }

    return positions;
  };

  const pumpkinPositions = generateRandomPositions();

  return (
    <>
      {pumpkinPositions.map((position, index) => (
        <div
          key={index}
          className={`absolute transform z-0 ${position.rotate} ${position.opacity}`}
          style={{
            left: position.left,
            right: position.right,
            top: position.top,
          }}
        >
          <Image
            src="/images/pumpkin-vegetable-harvest-icon.png"
            alt="Pumpkin background"
            width={position.size}
            height={position.size}
          />
        </div>
      ))}
    </>
  );
}
