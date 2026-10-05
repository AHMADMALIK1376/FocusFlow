import React from 'react';

// Icons across the app are lucide line icons — the same family as the nav bar,
// never emoji. Components take either the icon component (`icon={Target}`) or
// a ready element (`icon={<Target size={18} />}`).
export function renderIcon(icon, props) {
  if (!icon) return null;
  if (React.isValidElement(icon) || typeof icon === 'string') return icon;
  const Icon = icon;
  return <Icon strokeWidth={1.75} aria-hidden="true" {...props} />;
}

export default renderIcon;
