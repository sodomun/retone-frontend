import ProfileAvatar from "@/components/user/ProfileAvatar";

type Props = {
  displayName: string;
  uid: string;
  onClick?: () => void;
};

export default function FriendListItem({ displayName, uid, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid #eee",
      }}
    >
      <ProfileAvatar displayName={displayName} />
      <div>
        <p style={{ margin: 0, fontWeight: "bold" }}>{displayName}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{uid}</p>
      </div>
    </div>
  );
}
