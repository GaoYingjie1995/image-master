import type { Component } from 'vue'

export interface MenuItem {
  label: string
  icon?: string | Component
  iconColor?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
  children?: MenuItem[]
}
