import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2l7 7-7 7-7-7 7-7z" />
      <path d="M2 12l5 5-5 5" />
      <path d="M22 12l-5 5 5 5" />
    </svg>
  );
}
