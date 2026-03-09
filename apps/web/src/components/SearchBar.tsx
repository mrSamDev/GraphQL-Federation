import React, { useEffect, useRef, useState } from 'react';
import { ui } from '../styles/ui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search movies...' }: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 300);
  }

  return (
    <input
      type="search"
      value={local}
      onChange={handleChange}
      placeholder={placeholder}
      className={ui.input}
    />
  );
}
