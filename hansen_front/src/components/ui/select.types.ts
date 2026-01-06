export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export type SelectDensity = "default" | "compact";

export type SelectStyles = Partial<{
  container: any;
  label: any;
  trigger: any;
  menu: any;
  item: any;
  searchInput: any;
}>;

export type SelectProps<T extends string | number> = {
  label?: string;
  showLabel?: boolean;

  value: T | null;
  options: SelectOption<T>[];
  placeholder?: string;

  onChange: (value: T) => void;
  onClear?: () => void;
  disabled?: boolean;

  density?: SelectDensity;

  searchable?: boolean;
  searchPlaceholder?: string;

  styles?: SelectStyles;
};
