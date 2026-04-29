type Props = {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
};

export function BrandMark({ size = 28, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      <path
        d="M8 6 C 8 6, 10 14, 14 18 L 22 22 C 26 24, 30 26, 32 30 L 30 32 C 26 30, 22 30, 18 28 L 10 24 C 7 22, 6 18, 6 14 L 6 8 Z"
        fill="#1c1a15"
        stroke="#1c1a15"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="1.1" fill="#f5f0e6" />
      <path d="M6 8 L 4 6" stroke="#1c1a15" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 32 30 L 34 33 L 31 33 Z" fill="#a8743c" />
    </svg>
  );
}
