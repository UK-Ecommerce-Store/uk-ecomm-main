export function ProfileAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const sizeClass = size === "lg" ? "size-12 text-sm" : size === "sm" ? "size-8 text-[10px]" : "size-10 text-xs";
  return <span aria-label={name} className={`grid ${sizeClass} shrink-0 place-items-center rounded-full border border-black/10 bg-[#eee9df] font-bold tracking-[-.02em] text-[#282824]`}>{initials || "UK"}</span>;
}
