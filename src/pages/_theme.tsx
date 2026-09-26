import getSystem from '@/utils/get-system'
const OS = getSystem()

// default theme setting
export const defaultTheme = {
  primary_color: '#0071E3',
  secondary_color: '#248A71',
  primary_text: '#1D1D1F',
  secondary_text: '#6E6E73',
  info_color: '#007AFF',
  error_color: '#FF3B30',
  warning_color: '#FF9500',
  success_color: '#06943D',
  background_color: '#F5F5F7',
  surface_color: '#FFFFFF',
  font_family: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji"${
    OS === 'windows' ? ', twemoji mozilla' : ''
  }`,
}

// dark mode
export const defaultDarkTheme = {
  ...defaultTheme,
  primary_color: '#2997FF',
  secondary_color: '#63C7AD',
  primary_text: '#F5F5F7',
  background_color: '#171719',
  surface_color: '#222224',
  secondary_text: '#A1A1A6',
  info_color: '#0A84FF',
  error_color: '#FF453A',
  warning_color: '#FF9F0A',
  success_color: '#30D158',
}
