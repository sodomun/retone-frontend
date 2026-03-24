import Link from "next/link";

export default function TalkHeader() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>トーク</h1>
      <Link href="/friends/add">
        <button>+ 友達追加</button>
      </Link>
    </header>
  );
}
