import Image from "next/image";
import Snowfall from "react-snowfall";

type ChristmasThemeProps = {
  gamemode?: string;
};

export default function ChristmasTheme({ gamemode }: ChristmasThemeProps) {
  return (
    <>
      {gamemode !== "MiniWunder" && (
        <div className="absolute -right-20 -bottom-20 transform rotate-330 z-0">
          <Image
            src="/images/santa.png"
            alt="Pumpkin background"
            width={300}
            height={300}
          />
        </div>
      )}

      <div className="absolute left-[-120px] top-[180px] transform rotate-30 z-0">
        <Image
          src="/images/gift.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>

      <div className="absolute -right-20 top-[-180px] transform rotate-330 z-0">
        <Image
          src="/images/tree.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <Snowfall snowflakeCount={20} radius={[1, 4]} />
      </div>
    </>
  );
}
