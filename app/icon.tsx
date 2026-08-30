import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e4f43",
          color: "#fffdf8",
          fontSize: 20,
          fontWeight: 600,
          borderRadius: 8,
        }}
      >
        I
      </div>
    ),
    { ...size },
  );
}
