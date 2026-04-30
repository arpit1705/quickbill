export const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDateIN = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const initialOf = (name: string) => (name.trim()[0] || "?").toUpperCase();

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
