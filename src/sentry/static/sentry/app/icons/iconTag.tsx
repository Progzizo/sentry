import React from 'react';

import {IconProps} from 'app/types/iconProps';
import theme from 'app/utils/theme';

export const IconTag: React.FC<IconProps> = ({
  color: providedColor = 'currentColor',
  size: providedSize = 'sm',
  ...props
}: IconProps) => {
  const color = providedColor;
  const size = theme.iconSizes[providedSize] ?? providedSize;

  return (
    <svg viewBox="0 0 16 16" fill={color} height={size} width={size} {...props}>
      <path d="M3.87,5.7A1.81,1.81,0,1,1,5.69,3.89,1.82,1.82,0,0,1,3.87,5.7Zm0-2.12a.31.31,0,1,0,.32.31A.31.31,0,0,0,3.87,3.58Z" />
      <path d="M8,16a.77.77,0,0,1-.53-.21L.24,8.53A.75.75,0,0,1,0,8V.79A.75.75,0,0,1,.77,0H8a.74.74,0,0,1,.53.21l7.22,7.22a.75.75,0,0,1,0,1.06L8.51,15.75A.74.74,0,0,1,8,16ZM1.52,7.69,8,14.15,14.14,8,7.67,1.54H1.52Z" />
    </svg>
  );
};