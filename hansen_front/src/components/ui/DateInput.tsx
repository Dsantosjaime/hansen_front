import React from "react";

type Props = {
  value: string; // attendu: "YYYY-MM-DD"
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export function DateInput({ value, onChange, disabled, style }: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={style}
    />
  );
}
