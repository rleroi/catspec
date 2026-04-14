import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span data-placeholder={placeholder ?? ""} />;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <span data-select-content="">{children}</span>;
}

export function SelectItem({ value, children: _children }: { value: string; children: React.ReactNode }) {
  void _children;
  return null;
}

type Opt = { value: string; label: React.ReactNode };

function collectOptions(node: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      const p = child.props as { value: string; children: React.ReactNode };
      out.push({ value: p.value, label: p.children });
    } else if (child.type === SelectContent) {
      const props = child.props as { children?: React.ReactNode };
      if (props.children) out.push(...collectOptions(props.children));
    }
  });
  return out;
}

function findPlaceholder(node: React.ReactNode): string | undefined {
  let ph: string | undefined;
  React.Children.forEach(node, (child) => {
    if (ph !== undefined) return;
    if (!React.isValidElement(child)) return;
    if (child.type === SelectValue) {
      ph = (child.props as { placeholder?: string }).placeholder;
      return;
    }
    if (child.type === SelectTrigger) {
      const props = child.props as { children?: React.ReactNode };
      const inner = props.children ? findPlaceholder(props.children) : undefined;
      if (inner !== undefined) ph = inner;
    }
  });
  return ph;
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}) {
  let triggerClass = "";
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === SelectTrigger) {
      triggerClass = (child.props as { className?: string }).className ?? "";
    }
  });

  const options = collectOptions(children);
  const placeholder = findPlaceholder(children);

  return (
    <select
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
        triggerClass,
      )}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {placeholder !== undefined && value === "" && (
        <option value="">{placeholder}</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
