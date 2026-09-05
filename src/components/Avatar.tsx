const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export function Avatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md";
}) {
  const initial = (label || "?").trim().charAt(0).toUpperCase() || "?";
  const dim = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";

  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full ${colorFor(
        label
      )} font-medium text-white`}
    >
      {initial}
    </div>
  );
}
