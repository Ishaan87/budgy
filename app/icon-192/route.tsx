import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          borderRadius: 32,
        }}
      >
        <span style={{ fontSize: 96, color: "#ffffff", fontWeight: 700 }}>₹</span>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
