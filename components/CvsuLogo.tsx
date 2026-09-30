import Image from "next/image";

interface CvsuLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function CvsuLogo({
  size = 40,
  className = "",
  priority = false,
}: CvsuLogoProps) {
  return (
    <Image
      src="/cvsu-logo.png"
      alt="Cavite State University logo"
      width={size}
      height={size}
      className={`cvsu-logo ${className}`.trim()}
      priority={priority}
      unoptimized
    />
  );
}
