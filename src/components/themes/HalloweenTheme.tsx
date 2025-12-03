import Image from "next/image";

type HalloweenThemeProps = {
  gamemode?: string;
};

export default function HalloweenTheme({ gamemode }: HalloweenThemeProps) {
  return (
    <>
      {gamemode !== "MiniWunder" && (
        <div className="absolute right-[-80px] bottom-[-80px] transform rotate-330 z-0">
          <Image
            src="/images/pumpkin-vegetable-harvest-icon.png"
            alt="Pumpkin background"
            width={300}
            height={300}
          />
        </div>
      )}

      <div className="absolute left-[-120px] top-[180px] transform rotate-30 z-0">
        <Image
          src="/images/pumpkin-vegetable-harvest-icon.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>

      <div className="absolute right-[-80px] top-[-140px] transform rotate-330 z-0">
        <Image
          src="/images/pumpkin-vegetable-harvest-icon.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>
    </>
  );
}
