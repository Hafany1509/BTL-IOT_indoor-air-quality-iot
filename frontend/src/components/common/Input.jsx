import { useId } from 'react';
export function Input({ label, id, children, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <div className="field">
    <label htmlFor={inputId} className="field-label">{label}</label>
    <div className="input-wrap"><input id={inputId} {...props} />{children}</div>
  </div>;
}
