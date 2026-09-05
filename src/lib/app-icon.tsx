export function AppIconMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#047857",
        borderRadius: size * 0.2,
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: size * 0.5,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        EC
      </span>
    </div>
  );
}
