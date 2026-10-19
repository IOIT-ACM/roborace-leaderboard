import type { ThemeConfig } from 'antd'

// Colours from the TechFiesta site: white paper, navy ink, royal blue.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0000c8',
    colorInfo: '#0000c8',
    colorBgBase: '#ffffff',
    colorTextBase: '#050530',
    colorBorder: '#050530',
    colorBorderSecondary: '#d6d8f2',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    borderRadius: 0,
    lineWidth: 2,
  },
  components: {
    Card: { headerFontSize: 18 },
    Table: { headerBg: '#eef0ff', rowHoverBg: '#f4f5ff' },
  },
}
