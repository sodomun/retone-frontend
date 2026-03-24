type Props = {
  displayName: string;
  size?: number;
};

export default function ProfileAvatar({ displayName, size = 40 }: Props) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        fontWeight: "bold",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
