import ProfileAvatar from "@/components/user/ProfileAvatar";

type Props = {
  displayName: string;
  uid: string;
  onAdd: () => void;
  adding: boolean;
};

export default function AddFriendItem({ displayName, uid, onAdd, adding }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
      <ProfileAvatar displayName={displayName} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: "bold" }}>{displayName}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{uid}</p>
      </div>
      <button onClick={onAdd} disabled={adding}>
        {adding ? "追加中..." : "友達追加"}
      </button>
    </div>
  );
}
