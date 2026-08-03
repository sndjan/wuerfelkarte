import Image from "next/image";

type HalloweenThemeProps = {
  /** Hides the centre-piece where the card is too narrow for it. */
  compact?: boolean;
};

export default function HalloweenTheme({ compact = false }: HalloweenThemeProps) {
  return (
    <>
      {!compact && (
        <div className="absolute -right-20 -bottom-20 transform rotate-330 z-0">
          <Image
            src="/images/pumpkin.png"
            alt="Pumpkin background"
            width={300}
            height={300}
          />
        </div>
      )}

      <div className="absolute left-[-120px] top-[180px] transform rotate-30 z-0">
        <Image
          src="/images/pumpkin.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>

      <div className="absolute -right-20 top-[-140px] transform rotate-330 z-0">
        <Image
          src="/images/pumpkin.png"
          alt="Pumpkin background"
          width={300}
          height={300}
        />
      </div>
    </>
  );
}
