import Link from "next/link";

export function Wordmark({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-[1.35rem]" : "text-[1.7rem]";
  return (
    <Link
      href={href}
      className={`font-display font-medium tracking-tight text-ink ${text} leading-none`}
    >
      Issued
    </Link>
  );
}
