import Image from "next/image";

type EasterThemeProps = {
  gamemode?: string;
};

export default function EasterTheme({ gamemode }: EasterThemeProps) {
  return (
    <>
      {gamemode !== "MiniWunder" && (
        <div className="absolute -right-20 -bottom-20 transform rotate-330 z-0">
          <Image
            src="/images/easter-egg.png"
            alt="Pumpkin background"
            width={350}
            height={350}
          />
        </div>
      )}

      <div className="absolute left-[-120px] top-[180px] transform rotate-30 z-0">
        <Image
          src="/images/easter-bunny.png"
          alt="Pumpkin background"
          width={350}
          height={350}
        />
      </div>

      <div className="absolute -right-20 top-[-140px] transform rotate-330 z-0">
        <Image
          src="/images/easter-egg.png"
          alt="Pumpkin background"
          width={350}
          height={350}
        />
      </div>
    </>
  );
}
