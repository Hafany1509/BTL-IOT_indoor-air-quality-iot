export function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  return <button type={type} className={'button ' + variant + ' ' + className} {...props} />;
}
