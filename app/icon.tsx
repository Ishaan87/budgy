import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 20, color: "#ffffff", fontWeight: 700 }}>₹</span>
      </div>
    ),
    { ...size },
  );
}
